import { useState, useEffect, useCallback } from "react";
import { AlertPanel, AlertType as Alert } from "@/components/ui/alert-panel";
import { NetworkTopology } from "@/components/ui/network-topology";
import { Badge } from "@/components/ui/badge";
import { useItiacStore } from "@/store/useItiacStore";
import { AuditService } from "@/services/auditService";
import { computeImpactedFromOfflines, buildForwardMap, traverseDownstream } from "@/lib/utils";

import { Server } from "lucide-react";

type EnhancedDashboardProps = {
  onQuickNav?: (pageId: string) => void;
};

export const EnhancedDashboard = ({ onQuickNav }: EnhancedDashboardProps) => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);
  // workflows removed from this view after layout simplification
  
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
  // per-status counts no longer needed in this component

  // Derive cascading impact via shared downstream-only utility
  const impactedFromOfflines = computeImpactedFromOfflines(components, dependencies);
  const effectiveOnlineCount = components.filter(c => c.status === 'online' && !impactedFromOfflines.has(c.id)).length;
  const effectiveOfflineCount = components.filter(c => c.status === 'offline' || impactedFromOfflines.has(c.id)).length;
  // Impacted component set for processes view = offline roots + all downstream impacted
  const impactedComponentIds = new Set<string>([
    ...components.filter(c => c.status === 'offline').map(c => c.id),
    ...Array.from(impactedFromOfflines)
  ]);

  const totalDependencies = dependencies.length;
  const criticalPaths = dependencies.filter(d => d.criticality === 'critical').length;
  // workflow-related KPIs removed

  const networkHealth = totalComponents > 0 ? ((effectiveOnlineCount / totalComponents) * 100) : 0;
  // Business impact KPI removed from UI

  // Generate real alerts from component status and audit logs
  const generateRealAlerts = useCallback((): Alert[] => {
    const alerts: Alert[] = [];
    const recentLogs = AuditService.getLogs(50, 'COMPONENT', 'UPDATE');
    
    // Build forward dependency map (downstream only)
    const forward = buildForwardMap(dependencies);

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
        actionUrl: `#components?impacted=1&root=${encodeURIComponent(comp.id)}`,
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
          actionUrl: `#components?impacted=1&focus=${encodeURIComponent(impactedComp.id)}&root=${encodeURIComponent(comp.id)}`
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
        actionUrl: `#components?impacted=1&root=${encodeURIComponent(comp.id)}`,
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
          actionUrl: `#components?impacted=1&focus=${encodeURIComponent(impactedComp.id)}&root=${encodeURIComponent(comp.id)}`
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
  }, [components, dependencies]);

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
  }, [components, dependencies, lastRefresh, generateRealAlerts]);

  const handleAlertClick = (alert: Alert) => {
    // Use actionUrl hash to pre-filter target pages
    if (alert.actionUrl?.startsWith('#')) {
      try { window.location.hash = alert.actionUrl; } catch {}
    }
    if (alert.actionUrl?.includes('#components') && onQuickNav) {
      onQuickNav("components");
    } else if (alert.actionUrl?.includes('#dependencies') && onQuickNav) {
      onQuickNav("dependencies");
    } else if (alert.component && onQuickNav) {
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
    <div className="space-y-4">
      

      {/* Removed standalone KPI grid; IT Assets moved to right column above topology */}

      {/* Main Visualization Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch h-[calc(100vh-2rem)] overflow-hidden">
        {/* Alert Panel - dominant (2 columns); inner card manages height/scroll */}
        <div className="lg:col-span-2 h-full overflow-hidden">
          <AlertPanel
            alerts={activeAlerts}
            maxVisible={12}
            autoRefresh={autoRefresh}
            onAlertClick={handleAlertClick}
            onAlertDismiss={handleAlertDismiss}
            onAlertAcknowledge={handleAlertAcknowledge}
            processesEnabled={true}
            components={components}
            dependencies={dependencies}
            workflows={workflows}
            impactedComponentIds={impactedComponentIds}
          />
        </div>

        {/* Right column: Network Topology with IT Assets KPI in header */}
        <div className="lg:col-span-1 h-full overflow-hidden">
          <NetworkTopology
            components={components.filter(c => c.status === 'offline' || impactedFromOfflines.has(c.id))}
            dependencies={dependencies}
            rightExtra={
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">IT Assets</span>
                <Badge
                  variant={effectiveOnlineCount === totalComponents ? "success" : effectiveOfflineCount > 0 ? "destructive" : "warning"}
                  className="px-2 py-0.5 text-xs"
                >
                  {`${effectiveOnlineCount}/${totalComponents}`}
                </Badge>
              </div>
            }
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
      </div>

      {/* Charts section removed */}
    </div>
  );
};
