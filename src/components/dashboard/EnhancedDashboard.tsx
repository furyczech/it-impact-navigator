import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendCard } from "@/components/ui/trend-card";
import { InteractiveChart, ChartDataPoint } from "@/components/ui/interactive-chart";
import { AlertPanel, AlertType as Alert } from "@/components/ui/alert-panel";
import { NetworkTopology } from "@/components/ui/network-topology";
import { useItiacStore } from "@/store/useItiacStore";
import { AuditService } from "@/services/auditService";

import { 
  Server, 
  Network, 
  Shield, 
  TrendingUp,
  Users,
  Activity,
  Zap,
  Clock,
  Database,
  Globe,
  Settings,
  RefreshCw
} from "lucide-react";

type EnhancedDashboardProps = {
  onQuickNav?: (pageId: string) => void;
};

export const EnhancedDashboard = ({ onQuickNav }: EnhancedDashboardProps) => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);
  
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto refresh every 30 seconds with real data reload
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      try {
        // Reload data from store
        const store = useItiacStore.getState();
        await store.loadData();
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Calculate metrics
  const totalComponents = components.length;
  const onlineCount = components.filter(c => c.status === 'online').length;
  const warningCount = components.filter(c => c.status === 'warning').length;
  const offlineCount = components.filter(c => c.status === 'offline').length;
  const maintenanceCount = components.filter(c => c.status === 'maintenance').length;

  // Derive cascading impact: downstream-only (source -> target)
  const computeImpactedFromOfflines = (): Set<string> => {
    // Build forward map only
    const forward = new Map<string, string[]>(); // source -> [targets]
    dependencies.forEach(dep => {
      const arrFwd = forward.get(dep.sourceId) || [];
      arrFwd.push(dep.targetId);
      forward.set(dep.sourceId, arrFwd);
    });
    const traverseForward = (start: string) => {
      const out: string[] = [];
      const visited = new Set<string>([start]);
      const stack = [start];
      while (stack.length) {
        const cur = stack.pop()!;
        const nexts = forward.get(cur) || [];
        for (const nxt of nexts) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            out.push(nxt);
            stack.push(nxt);
          }
        }
      }
      return out;
    };

    const roots = components.filter(c => c.status === 'offline').map(c => c.id);
    const impacted = new Set<string>();
    for (const id of roots) {
      const list = traverseForward(id);
      list.forEach(x => impacted.add(x));
    }
    // exclude the roots themselves; they are already offline
    roots.forEach(id => impacted.delete(id));
    return impacted;
  };

  const impactedFromOfflines = computeImpactedFromOfflines();
  const effectiveOnlineCount = components.filter(c => c.status === 'online' && !impactedFromOfflines.has(c.id)).length;
  const effectiveOfflineCount = components.filter(c => c.status === 'offline' || impactedFromOfflines.has(c.id)).length;

  const totalDependencies = dependencies.length;
  const criticalPaths = dependencies.filter(d => d.criticality === 'critical').length;
  const totalWorkflows = workflows.length;
  const uniqueBusinessProcesses = Array.from(new Set(workflows.map(w => w.businessProcess))).length;

  const networkHealth = totalComponents > 0 ? ((effectiveOnlineCount / totalComponents) * 100) : 0;
  // Business impact KPI removed from UI

  // Generate health trend from audit logs: percent of assets Online at each time bucket
  const generateHealthTrendData = (hours: number): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const auditLogs = AuditService.getLogs(undefined, 'COMPONENT', undefined, windowStart, now);

    // Index logs by component
    const logsByComp = new Map<string, typeof auditLogs>();
    auditLogs.forEach(log => {
      if (!log.entityId) return;
      const list = logsByComp.get(log.entityId) || [];
      list.push(log);
      logsByComp.set(log.entityId, list);
    });
    // Sort each list ascending by time
    logsByComp.forEach(list => list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    // Pre-build forward dependency map for cascade computation (static over time window)
    const forward = new Map<string, string[]>();
    dependencies.forEach(dep => {
      const arr = forward.get(dep.sourceId) || [];
      arr.push(dep.targetId);
      forward.set(dep.sourceId, arr);
    });
    const cascadeFrom = (roots: string[]) => {
      const impacted = new Set<string>();
      const visited = new Set<string>(roots);
      const stack = [...roots];
      while (stack.length) {
        const cur = stack.pop()!;
        const nexts = forward.get(cur) || [];
        for (const nxt of nexts) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            impacted.add(nxt);
            stack.push(nxt);
          }
        }
      }
      // exclude roots themselves
      roots.forEach(r => impacted.delete(r));
      return impacted;
    };

    for (let i = hours; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), ts.getHours(), 0, 0, 0);

      // Determine status at this time per component by last change before ts
      const statusAtTime = new Map<string, string>();
      components.forEach(c => {
        const compLogs = logsByComp.get(c.id) || [];
        // find last log <= ts
        let s: any = undefined;
        for (let idx = compLogs.length - 1; idx >= 0; idx--) {
          const lg = compLogs[idx];
          if (lg.timestamp <= ts) {
            s = lg.changes?.after?.status ?? lg.details?.status;
            break;
          }
        }
        statusAtTime.set(c.id, (s as string) || 'online');
      });

      // Roots for cascade are offline assets at this time
      const offlineRoots = components.filter(c => statusAtTime.get(c.id) === 'offline').map(c => c.id);
      const impacted = cascadeFrom(offlineRoots);

      // Count effective online excluding impacted
      let effectiveOnlineAtTime = 0;
      components.forEach(c => {
        const s = statusAtTime.get(c.id) || 'online';
        if (s === 'online' && !impacted.has(c.id)) effectiveOnlineAtTime += 1;
      });

      const health = totalComponents > 0 ? (effectiveOnlineAtTime / totalComponents) * 100 : 0;
      data.push({
        timestamp: hourStart.toISOString(),
        value: Math.round(health * 10) / 10,
        label: hourStart.toLocaleTimeString(),
        status: health > 95 ? 'success' : health > 85 ? 'warning' : 'destructive'
      });
    }
    return data;
  };

  const healthTrendData = generateHealthTrendData(timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 720);

  // Generate real alerts from component status and audit logs
  const generateRealAlerts = (): Alert[] => {
    const alerts: Alert[] = [];
    const recentLogs = AuditService.getLogs(50, 'COMPONENT', 'UPDATE');
    
    // Build forward dependency map (downstream only)
    const forward = new Map<string, string[]>(); // source -> [targets]
    dependencies.forEach(dep => {
      const arrFwd = forward.get(dep.sourceId) || [];
      arrFwd.push(dep.targetId);
      forward.set(dep.sourceId, arrFwd);
    });

    const traverse = (start: string, map: Map<string,string[]>) => {
      const out: string[] = [];
      const visited = new Set<string>([start]);
      const stack = [start];
      while (stack.length) {
        const cur = stack.pop()!;
        const nexts = map.get(cur) || [];
        for (const nxt of nexts) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            out.push(nxt);
            stack.push(nxt);
          }
        }
      }
      return out;
    };

    const bfsImpactMap = (start: string, map: Map<string, string[]>) => {
      const out: Map<string, { causeId: string; depth: number }> = new Map();
      const visited = new Set<string>([start]);
      const stack = [{ id: start, depth: 0 }];
      while (stack.length) {
        const { id, depth } = stack.pop()!;
        const nexts = map.get(id) || [];
        for (const nxt of nexts) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            out.set(nxt, { causeId: id, depth });
            stack.push({ id: nxt, depth: depth + 1 });
          }
        }
      }
      return out;
    };

    const getImpactedComponentIds = (rootId: string): string[] => {
      // Downstream only
      const fwd = traverse(rootId, forward);
      return Array.from(new Set(fwd));
    };

    // Get detailed impact map: impacted id -> immediate cause id (downstream only)
    const getImpactCauseMap = (rootId: string): Map<string, { causeId: string; depth: number }> => {
      return bfsImpactMap(rootId, forward);
    };

    // Critical alerts for offline components
    const offlineComponents = components.filter(c => c.status === 'offline');
    offlineComponents.forEach(comp => {
      const impactMap = getImpactCauseMap(comp.id);
      const impactedIds = Array.from(impactMap.keys());
      const impactedNames = Array.from(new Set(
        impactedIds
          .filter(id => id !== comp.id)
          .map(id => components.find(c => c.id === id)?.name)
          .filter((n): n is string => !!n)
      ));
      alerts.push({
        id: `offline-${comp.id}`,
        title: `${comp.name} Offline`,
        message: `The ${comp.criticality} asset "${comp.name}" is offline and may impact dependent services.`,
        severity: "critical",
        timestamp: new Date(comp.lastUpdated),
        component: comp.name,
        criticality: comp.criticality,
        actionUrl: `#components/${comp.id}`,
        impactedComponents: impactedNames
      });

      // Add individual impacted alerts as if they were directly offline, with reason
      impactedIds.forEach(id => {
        if (id === comp.id) return;
        const impactedComp = components.find(c => c.id === id);
        if (!impactedComp) return;
        const causeId = impactMap.get(id)?.causeId;
        const causeComp = causeId ? components.find(c => c.id === causeId) : undefined;
        alerts.push({
          id: `impacted-by-offline-${comp.id}-${id}`,
          title: `${impactedComp.name} Impacted`,
          message: `${impactedComp.name} is impacted by ${causeComp?.name || comp.name} outage`,
          severity: "critical",
          timestamp: new Date(),
          component: impactedComp.name,
          criticality: impactedComp.criticality,
          actionUrl: `#components/${impactedComp.id}`
        });
      });
    });
    
    // Warning alerts for components with warnings
    const warningComponents = components.filter(c => c.status === 'warning');
    warningComponents.forEach(comp => {
      const impactMap = getImpactCauseMap(comp.id);
      const impactedIds = Array.from(impactMap.keys());
      const impactedNames = Array.from(new Set(
        impactedIds
          .filter(id => id !== comp.id)
          .map(id => components.find(c => c.id === id)?.name)
          .filter((n): n is string => !!n)
      ));
      alerts.push({
        id: `warning-${comp.id}`,
        title: `${comp.name} Performance Issue`,
        message: `The ${comp.criticality} asset "${comp.name}" is showing degraded performance.`,
        severity: "warning",
        timestamp: new Date(comp.lastUpdated),
        component: comp.name,
        criticality: comp.criticality,
        actionUrl: `#components/${comp.id}`,
        impactedComponents: impactedNames
      });

      // Add individual impacted alerts for degraded performance
      impactedIds.forEach(id => {
        if (id === comp.id) return;
        const impactedComp = components.find(c => c.id === id);
        if (!impactedComp) return;
        const causeId = impactMap.get(id)?.causeId;
        const causeComp = causeId ? components.find(c => c.id === causeId) : undefined;
        alerts.push({
          id: `impacted-by-warning-${comp.id}-${id}`,
          title: `${impactedComp.name} Impacted`,
          message: `${impactedComp.name} performance impacted by ${causeComp?.name || comp.name}`,
          severity: "warning",
          timestamp: new Date(),
          component: impactedComp.name,
          criticality: impactedComp.criticality,
          actionUrl: `#components/${impactedComp.id}`
        });
      });
    });
    
    // Critical path alerts
    const criticalDeps = dependencies.filter(d => d.criticality === 'critical');
    const criticalDepComponents = criticalDeps.filter(dep => {
      const sourceComp = components.find(c => c.id === dep.sourceId);
      const targetComp = components.find(c => c.id === dep.targetId);
      return sourceComp?.status !== 'online' || targetComp?.status !== 'online';
    });
    
    if (criticalDepComponents.length > 0) {
      alerts.push({
        id: "critical-paths",
        title: "Critical Dependency Issues",
        message: `${criticalDepComponents.length} critical dependency paths are affected by asset issues.`,
        severity: "warning",
        timestamp: new Date(),
        component: "Dependencies",
        criticality: "critical",
        actionUrl: "#dependencies"
      });
    }
    
    // Maintenance alerts
    const maintenanceComponents = components.filter(c => c.status === 'maintenance');
    maintenanceComponents.forEach(comp => {
      alerts.push({
        id: `maintenance-${comp.id}`,
        title: `${comp.name} Under Maintenance`,
        message: `The asset "${comp.name}" is currently under maintenance.`,
        severity: "info",
        timestamp: new Date(comp.lastUpdated),
        component: comp.name,
        criticality: comp.criticality
      });
    });
    
    // Sort by severity and timestamp
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  };

  // Manage alerts locally (ignore previous dismiss/ack so all show again)
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>(() => generateRealAlerts());

  // Clear previously persisted dismissals so old hidden alerts reappear
  useEffect(() => {
    try {
      localStorage.removeItem('dismissedAlerts');
    } catch {}
  }, []);

  // Refresh alerts when data changes (no filtering/preservation)
  useEffect(() => {
    setActiveAlerts(generateRealAlerts());
  }, [components, dependencies, workflows, lastRefresh]);

  const handleAlertClick = (alert: Alert) => {
    // Navigate to relevant section based on alert
    if (alert.actionUrl?.includes('#components') && onQuickNav) {
      onQuickNav("components");
    } else if (alert.actionUrl?.includes('#dependencies') && onQuickNav) {
      onQuickNav("dependencies");
    } else if (alert.component && onQuickNav) {
      // Default navigation based on component type
      onQuickNav("components");
    }
  };

  const handleAlertDismiss = (alertId: string) => {
    AuditService.log('UPDATE', 'SYSTEM', { action: 'alert_dismissed', alertId });
    try {
      const dismissed = new Set<string>(JSON.parse(localStorage.getItem('dismissedAlerts') || '[]'));
      dismissed.add(alertId);
      localStorage.setItem('dismissedAlerts', JSON.stringify(Array.from(dismissed)));
    } catch {}
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleAlertAcknowledge = (alertId: string) => {
    AuditService.log('UPDATE', 'SYSTEM', { action: 'alert_acknowledged', alertId });
    setActiveAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  return (
    <div className="space-y-6">
      {/* Header with System Status and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge
            variant={networkHealth > 95 ? "success" : networkHealth > 85 ? "warning" : "destructive"}
            className="text-base px-4 py-2"
          >
            {networkHealth > 95 ? "System Operational" : networkHealth > 85 ? "Degraded Performance" : "System Issues"}
          </Badge>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {(["1h", "24h", "7d", "30d"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setTimeRange(range)}
              >
                {range.toUpperCase()}
              </Button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <TrendCard
          title="System Health"
          value={`${networkHealth.toFixed(1)}%`}
          trend={networkHealth > 95 ? "up" : networkHealth > 85 ? "stable" : "down"}
          change={networkHealth > 95 ? "+0.2%" : networkHealth > 85 ? "stable" : "-1.5%"}
          icon={Activity}
          variant={networkHealth > 95 ? "success" : networkHealth > 85 ? "default" : "warning"}
          interactive
          onDrillDown={() => onQuickNav?.("analysis")}
        />
        
        <TrendCard
          title="IT Assets"
          value={`${effectiveOnlineCount}/${totalComponents}`}
          trend={effectiveOnlineCount === totalComponents ? "up" : effectiveOfflineCount > 0 ? "down" : "stable"}
          change={effectiveOnlineCount === totalComponents ? "All Online" : `${effectiveOfflineCount} Offline (incl. impacted)`}
          icon={Server}
          variant={effectiveOnlineCount === totalComponents ? "success" : effectiveOfflineCount > 0 ? "destructive" : "warning"}
          interactive
          onDrillDown={() => onQuickNav?.("components")}
        />
        
        {/* Response Time, Critical Paths, and Business Impact cards removed */}
      </div>

      {/* Main Visualization Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Topology */}
        <div className="lg:col-span-2">
          <NetworkTopology
            components={components}
            dependencies={dependencies}
            onNodeClick={(component) => {
              // Log the interaction
              AuditService.log('UPDATE', 'SYSTEM', { 
                action: 'component_selected', 
                componentId: component.id, 
                componentName: component.name 
              });
              onQuickNav?.("components");
            }}
            onConnectionClick={(dependency) => {
              // Log the interaction
              AuditService.log('UPDATE', 'SYSTEM', { 
                action: 'dependency_selected', 
                dependencyId: dependency.id 
              });
              onQuickNav?.("dependencies");
            }}
          />
        </div>
        
        {/* Alert Panel */}
        <div>
          <AlertPanel
            alerts={activeAlerts}
            maxVisible={6}
            autoRefresh={autoRefresh}
            onAlertClick={handleAlertClick}
            onAlertDismiss={handleAlertDismiss}
            onAlertAcknowledge={handleAlertAcknowledge}
          />
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health Trends */}
        <InteractiveChart
          title="System Health Trends"
          data={healthTrendData}
          type="area"
          timeRange={timeRange}
          strokeColor="hsl(var(--success))"
          fillColor="hsl(var(--success))"
          fillOpacity={0.28}
          onTimeRangeChange={(range) => {
            setTimeRange(range as "1h" | "24h" | "7d" | "30d");
            AuditService.log('UPDATE', 'SYSTEM', { action: 'timerange_changed', range });
          }}
          onDataPointClick={(point) => {
            AuditService.log('UPDATE', 'SYSTEM', { 
              action: 'chart_datapoint_clicked', 
              timestamp: point.timestamp, 
              value: point.value 
            });
            // Could navigate to detailed analysis for that time period
            onQuickNav?.("analysis");
          }}
          icon={Activity}
          showTrend
          realTime={autoRefresh}
        />
        
        {/* Quick Actions */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="h-12 bg-gradient-primary hover:opacity-90" 
                onClick={() => {
                  AuditService.logAnalysisRun('dashboard-quick-action', totalComponents, 0);
                  onQuickNav?.("analysis");
                }}
                disabled={totalComponents === 0}
              >
                <Shield className="w-5 h-5 mr-2" />
                Run Analysis
              </Button>
              
              <Button 
                variant="secondary" 
                className="h-12" 
                onClick={() => {
                  AuditService.log('UPDATE', 'SYSTEM', { action: 'quick_nav_add_asset' });
                  onQuickNav?.("components");
                }}
              >
                <Server className="w-5 h-5 mr-2" />
                Add Asset
              </Button>
              
              <Button 
                variant="secondary" 
                className="h-12" 
                onClick={() => {
                  AuditService.log('UPDATE', 'SYSTEM', { action: 'quick_nav_network' });
                  onQuickNav?.("dependencies");
                }}
                disabled={dependencies.length === 0}
              >
                <Network className="w-5 h-5 mr-2" />
                View Network
              </Button>
              
              <Button 
                variant="outline" 
                className="h-12" 
                onClick={() => {
                  AuditService.logExport('dashboard-report', 'system-report.pdf', totalComponents + totalDependencies + totalWorkflows);
                  onQuickNav?.("workflows");
                }}
                disabled={totalComponents === 0}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Generate Report
              </Button>
            </div>
            
            {/* System Overview Stats */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Dependencies:</span>
                  <span className="font-medium">{totalDependencies}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Processes:</span>
                  <span className="font-medium">{uniqueBusinessProcesses}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Maintenance:</span>
                  <span className="font-medium">{maintenanceCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
