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

  const totalDependencies = dependencies.length;
  const criticalPaths = dependencies.filter(d => d.criticality === 'critical').length;
  const totalWorkflows = workflows.length;
  const uniqueBusinessProcesses = Array.from(new Set(workflows.map(w => w.businessProcess))).length;

  const networkHealth = totalComponents > 0 ? ((onlineCount / totalComponents) * 100) : 0;
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

    for (let i = hours; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), ts.getHours(), 0, 0, 0);

      // Determine status at this time per component by last change before ts
      let onlineAtTime = 0;
      components.forEach(c => {
        const compLogs = logsByComp.get(c.id) || [];
        // find last log <= ts
        let statusAtTime: any = undefined;
        for (let idx = compLogs.length - 1; idx >= 0; idx--) {
          const lg = compLogs[idx];
          if (lg.timestamp <= ts) {
            statusAtTime = lg.changes?.after?.status ?? lg.details?.status;
            break;
          }
        }
        const status = (statusAtTime as string) || 'online';
        if (status === 'online') onlineAtTime += 1;
      });

      const health = totalComponents > 0 ? (onlineAtTime / totalComponents) * 100 : 0;
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
    
    // Critical alerts for offline components
    const offlineComponents = components.filter(c => c.status === 'offline');
    offlineComponents.forEach(comp => {
      alerts.push({
        id: `offline-${comp.id}`,
        title: `${comp.name} Offline`,
        message: `The ${comp.criticality} asset "${comp.name}" is offline and may impact dependent services.`,
        severity: "critical",
        timestamp: new Date(comp.lastUpdated),
        component: comp.name,
        criticality: comp.criticality,
        actionUrl: `#components/${comp.id}`
      });
    });
    
    // Warning alerts for components with warnings
    const warningComponents = components.filter(c => c.status === 'warning');
    warningComponents.forEach(comp => {
      alerts.push({
        id: `warning-${comp.id}`,
        title: `${comp.name} Performance Issue`,
        message: `The ${comp.criticality} asset "${comp.name}" is showing degraded performance.`,
        severity: "warning",
        timestamp: new Date(comp.lastUpdated),
        component: comp.name,
        criticality: comp.criticality,
        actionUrl: `#components/${comp.id}`
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

  // Manage alerts locally to support ack and dismiss
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]') as string[];
      return generateRealAlerts().filter(a => !dismissed.includes(a.id));
    } catch {
      return generateRealAlerts();
    }
  });

  // Refresh alerts when data changes
  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]') as string[];
      const alerts = generateRealAlerts().filter(a => !dismissed.includes(a.id));
      setActiveAlerts(prev => {
        // try to preserve acknowledged flags
        const acked = new Set(prev.filter(p => p.acknowledged).map(p => p.id));
        return alerts.map(a => ({ ...a, acknowledged: acked.has(a.id) }));
      });
    } catch {
      setActiveAlerts(generateRealAlerts());
    }
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
          value={`${onlineCount}/${totalComponents}`}
          trend={onlineCount === totalComponents ? "up" : offlineCount > 0 ? "down" : "stable"}
          change={onlineCount === totalComponents ? "All Online" : `${offlineCount} Offline`}
          icon={Server}
          variant={onlineCount === totalComponents ? "success" : offlineCount > 0 ? "destructive" : "warning"}
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
            filters={{
              status: offlineCount > 0 ? ['online', 'warning', 'offline'] : undefined,
              criticality: criticalPaths > 0 ? ['critical', 'high'] : undefined
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
                  <span className="text-muted-foreground">Workflows:</span>
                  <span className="font-medium">{totalWorkflows}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-primary" />
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
