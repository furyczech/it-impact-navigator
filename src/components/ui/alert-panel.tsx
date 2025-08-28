import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ITComponent, ComponentDependency, BusinessWorkflow } from "@/types/itiac";
import { ProcessImpactPanel } from "@/components/ui/process-impact-panel";
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  LucideIcon,
  ChevronRight,
  ChevronDown 
} from "lucide-react";

// Stable regex shared across callbacks
const impactedRe = /^impacted-by-(offline|warning)-(.+?)-(.+)$/;
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info" | "success";
  timestamp: Date;
  component?: string;
  criticality?: string;
  acknowledged?: boolean;
  actionUrl?: string;
  impactedComponents?: string[];
}

export interface AlertPanelProps {
  alerts: Alert[];
  maxVisible?: number;
  autoRefresh?: boolean;
  onAlertClick?: (alert: Alert) => void;
  onAlertDismiss?: (alertId: string) => void;
  onAlertAcknowledge?: (alertId: string) => void;
  className?: string;
  // Optional: enable Processes sub-tab within the Active Alerts card
  processesEnabled?: boolean;
  components?: ITComponent[];
  dependencies?: ComponentDependency[];
  workflows?: BusinessWorkflow[];
  impactedComponentIds?: Set<string>;
}

const AlertPanel = React.forwardRef<HTMLDivElement, AlertPanelProps>(
  ({ 
    alerts = [],
    maxVisible = 5,
    autoRefresh = false,
    onAlertClick,
    onAlertDismiss,
    onAlertAcknowledge,
    processesEnabled,
    components,
    dependencies,
    workflows,
    impactedComponentIds,
    className,
    ...props 
  }, ref) => {
    const [lastUpdate, setLastUpdate] = React.useState(new Date());
    const [activeSubTab, setActiveSubTab] = React.useState<'assets' | 'processes'>('processes');
    
    // Auto refresh every 30 seconds if enabled
    React.useEffect(() => {
      if (!autoRefresh) return;
      
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, 30000);
      
      return () => clearInterval(interval);
    }, [autoRefresh]);

    const getSeverityIcon = (severity: Alert["severity"]): LucideIcon => {
      switch (severity) {
        case "critical":
          return AlertCircle;
        case "warning":
          return AlertTriangle;
        case "success":
          return CheckCircle;
        default:
          return AlertTriangle;
      }
    };

    const getSeverityColor = (severity: Alert["severity"]) => {
      switch (severity) {
        case "critical":
          return "text-destructive";
        case "warning":
          return "text-warning";
        case "success":
          return "text-success";
        default:
          return "text-primary";
      }
    };

    const getSeverityBadgeVariant = (severity: Alert["severity"]) => {
      switch (severity) {
        case "critical":
          return "destructive";
        case "warning":
          return "warning";
        case "success":
          return "success";
        default:
          return "secondary";
      }
    };

    // Map asset criticality (e.g., High/Medium/Low) to badge variants
    const getCriticalityBadgeVariant = (criticality?: string) => {
      if (!criticality) return "secondary" as const;
      const c = criticality.trim().toLowerCase();
      if (c === "high" || c === "critical") return "destructive" as const;
      if (c === "medium") return "warning" as const;
      if (c === "low") return "secondary" as const;
      return "secondary" as const;
    };

    const formatTimeAgo = (timestamp: Date) => {
      const diff = Date.now() - timestamp.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return "just now";
      if (minutes < 60) return `${minutes}m ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    // Remove redundant leading phrases like: "The medium asset 'XYZ'" → "XYZ"
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sanitizeMessage = (alert: Alert) => {
      let msg = alert.message || "";
      const levels = "critical|medium|high|low";
      if (alert.component) {
        const name = escapeRegExp(alert.component);
        const re = new RegExp(`^\\s*(The\\s+)?(${levels})\\s+asset\\s+["'“”]?${name}["'“”]?\\s*`, 'i');
        const m = msg.match(re);
        if (m) {
          return `${alert.component} ${msg.slice(m[0].length).trimStart()}`;
        }
      }
      // Fallback: strip just the leading "The <level> asset" phrase
      const re2 = new RegExp(`^\\s*(The\\s+)?(${levels})\\s+asset\\s+`, 'i');
      return msg.replace(re2, '').trimStart();
    };

    const isRootAlert = React.useCallback((a: Alert) => a.id.startsWith('offline-') || a.id.startsWith('warning-'), []);
    const getRootIdFromImpacted = React.useCallback((a: Alert): string | null => {
      const m = a.id.match(impactedRe);
      return m ? m[2] : null;
    }, []);
    const getRootKeyFromRootAlert = React.useCallback((a: Alert): string | null => {
      if (!isRootAlert(a)) return null;
      return a.id.replace(/^\w+-/, '');
    }, [isRootAlert]);

    // Hide synthetic dependency summary alerts (e.g., "Critical Dependency Issues")
    const isDependencySummaryAlert = (a: Alert): boolean => {
      const title = (a.title || '').toLowerCase();
      return title === 'critical dependency issues' || title.includes('dependency issues');
    };
    const baseAlerts = React.useMemo(() => alerts.filter(a => !isDependencySummaryAlert(a)), [alerts]);

    const childrenByRoot = new Map<string, Alert[]>();
    const others: Alert[] = [];
    baseAlerts.forEach(a => {
      const rootId = getRootIdFromImpacted(a);
      if (rootId) {
        const arr = childrenByRoot.get(rootId) || [];
        arr.push(a);
        childrenByRoot.set(rootId, arr);
      } else {
        others.push(a);
      }
    });

    const visibleAlerts: Array<{ alert: Alert; isChild: boolean }> = [];
    // First pass: add roots with their children
    others.forEach(a => {
      if (isRootAlert(a)) {
        const rootId = getRootKeyFromRootAlert(a)!;
        visibleAlerts.push({ alert: a, isChild: false });
        const kids = childrenByRoot.get(rootId);
        if (kids && kids.length) {
          kids.forEach(k => visibleAlerts.push({ alert: k, isChild: true }));
          childrenByRoot.delete(rootId);
        }
      }
    });
    // Second pass: add non-root, non-impacted alerts
    others.forEach(a => {
      if (!isRootAlert(a)) {
        visibleAlerts.push({ alert: a, isChild: false });
      }
    });
    // Finally, add any impacted whose root alert isn't present (fallback)
    childrenByRoot.forEach(kids => {
      kids.forEach(k => visibleAlerts.push({ alert: k, isChild: false }));
    });
    const criticalCount = baseAlerts.filter(a => a.severity === "critical").length;
    const warningCount = baseAlerts.filter(a => a.severity === "warning").length;

    // Expansion state for root alerts
    const [expandedRoots, setExpandedRoots] = React.useState<Set<string>>(new Set());
    // Default: expand all root alerts when the alert list changes
    React.useEffect(() => {
      const next = new Set<string>();
      // Expand only real roots present in baseAlerts
      baseAlerts.forEach(a => {
        if (isRootAlert(a)) {
          const rk = getRootKeyFromRootAlert(a);
          if (rk) next.add(rk);
        }
      });
      setExpandedRoots(next);
    }, [baseAlerts, isRootAlert, getRootKeyFromRootAlert]);

    const toggleRoot = (rootKey: string) => {
      setExpandedRoots(prev => {
        const next = new Set(prev);
        if (next.has(rootKey)) next.delete(rootKey); else next.add(rootKey);
        return next;
      });
    };

    const canShowProcesses = Boolean(processesEnabled && components && dependencies && workflows && impactedComponentIds);

    // Full list of affected critical dependencies with names
    const affectedCriticalDeps = React.useMemo(() => {
      if (!dependencies || !components) return [] as Array<{ id: string; sourceId: string; targetId: string; sourceName: string; targetName: string }>; 
      const impacted = impactedComponentIds ?? new Set(
        components
          .filter(c => c.status === 'offline' || c.status === 'warning')
          .map(c => c.id)
      );
      return dependencies
        .filter(d => d.criticality === 'critical' && (impacted.has(d.sourceId) || impacted.has(d.targetId)))
        .map(d => ({
          id: `${d.sourceId}->${d.targetId}`,
          sourceId: d.sourceId,
          targetId: d.targetId,
          sourceName: components.find(c => c.id === d.sourceId)?.name || d.sourceId,
          targetName: components.find(c => c.id === d.targetId)?.name || d.targetId,
        }));
    }, [dependencies, impactedComponentIds, components]);

    // Compute impacted processes when data is available
    const isStepImpacted = React.useCallback((step: BusinessWorkflow["steps"][number]): boolean => {
      const primaries = step.primaryComponentIds && step.primaryComponentIds.length
        ? step.primaryComponentIds
        : (step.primaryComponentId ? [step.primaryComponentId] : []);
      return primaries.some(id => impactedComponentIds?.has(id));
    }, [impactedComponentIds]);

    const { impactedProcessesCount, totalProcesses } = React.useMemo(() => {
      if (!canShowProcesses || !workflows || !impactedComponentIds) {
        return { impactedProcessesCount: 0, totalProcesses: 0 };
      }

      const isWorkflowImpacted = (wf: BusinessWorkflow): boolean => {
        return wf.steps.some(isStepImpacted);
      };

      const total = workflows.length;
      const impacted = workflows.filter(isWorkflowImpacted).length;
      return { impactedProcessesCount: impacted, totalProcesses: total };
    }, [canShowProcesses, workflows, impactedComponentIds, isStepImpacted]);

    return (
      <Card ref={ref} className={cn("bg-card border-border shadow-depth flex flex-col h-full", className)} {...props}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="section-title flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span>Active Alerts</span>
            </CardTitle>
            {canShowProcesses && (
              <div className="inline-flex items-center rounded-full border border-white/10 bg-background/40 backdrop-blur-md p-0.5 text-xs shadow-sm">
                <button
                  type="button"
                  aria-label="Show processes"
                  aria-pressed={activeSubTab === 'processes'}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full font-medium transition-all",
                    activeSubTab === 'processes'
                      ? "bg-primary/90 text-primary-foreground shadow ring-1 ring-white/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => setActiveSubTab('processes')}
                >
                  Processes
                </button>
                <button
                  type="button"
                  aria-label="Show assets"
                  aria-pressed={activeSubTab === 'assets'}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full font-medium transition-all",
                    activeSubTab === 'assets'
                      ? "bg-primary/90 text-primary-foreground shadow ring-1 ring-white/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => setActiveSubTab('assets')}
                >
                  Assets
                </button>
              </div>
            )}

            {/* Removed timestamp display */}
          </div>
          
          {canShowProcesses && activeSubTab === 'processes' && impactedProcessesCount > 0 && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                <span className="text-muted-foreground">{impactedProcessesCount} Impacted processes</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                <span className="text-muted-foreground">{totalProcesses} Total</span>
              </div>
            </div>
          )}
          {activeSubTab === 'assets' && (criticalCount > 0 || warningCount > 0) && (
            <div className="flex items-center space-x-4 text-sm">
              {criticalCount > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-destructive rounded-full" />
                  <span className="text-muted-foreground">{criticalCount} Critical</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span className="text-muted-foreground">{warningCount} Warning</span>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0 flex-1 min-h-0 flex flex-col">
          {canShowProcesses && activeSubTab === 'processes' ? (
            impactedProcessesCount === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle className="w-8 h-8 mb-2 text-success" />
                <p>All systems operational</p>
                <p className="text-xs mt-1">No active alerts</p>
              </div>
            ) : (
              <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
                <ProcessImpactPanel
                  components={components!}
                  dependencies={dependencies!}
                  workflows={workflows!}
                  impactedComponentIds={impactedComponentIds!}
                  embedded
                  className="border-0 shadow-none"
                />
              </div>
            )
          ) : visibleAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle className="w-8 h-8 mb-2 text-success" />
              <p>All systems operational</p>
              <p className="text-xs mt-1">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {visibleAlerts.map(({ alert, isChild }) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                const rootKey = isChild
                  ? (getRootIdFromImpacted(alert) || '')
                  : (getRootKeyFromRootAlert(alert) || '');
                // Hide children unless their root is expanded
                if (isChild && rootKey && !expandedRoots.has(rootKey)) {
                  return null;
                }
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "relative p-2 rounded-lg border transition-all duration-200",
                      alert.acknowledged 
                        ? "bg-muted/30 border-muted" 
                        : "bg-background border-border hover:bg-accent/10",
                      !isChild && "cursor-pointer",
                      isChild && "ml-6 border-l-2"
                    )}
                    onClick={() => {
                      if (!isChild && rootKey) {
                        toggleRoot(rootKey);
                      } else {
                        onAlertClick?.(alert);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn("flex items-start space-x-3 flex-1", isChild && "pl-3") }>
                        {!isChild && rootKey && (
                          expandedRoots.has(rootKey) ? (
                            <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          )
                        )}
                        <SeverityIcon className={cn("w-4 h-4 mt-0.5", getSeverityColor(alert.severity))} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-0.5">
                            <p className="font-medium text-foreground text-sm truncate">
                              {alert.title}
                            </p>
                            {/* Removed impacted badge as requested */}
                            {(() => {
                              const crit = alert.criticality?.trim();
                              const label = crit ? crit : alert.severity;
                              const variant = crit 
                                ? getCriticalityBadgeVariant(crit)
                                : getSeverityBadgeVariant(alert.severity);
                              return (
                                <Badge 
                                  variant={variant}
                                  className="text-xs px-1.5 py-0.5 capitalize"
                                >
                                  {label}
                                </Badge>
                              );
                            })()}
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {sanitizeMessage(alert)}
                          </p>
                          {/* Removed impacted subtitle; details visible when expanded */}
                          {alert.impactedComponents && alert.impactedComponents.length > 0 && (
                            <div className="text-[11px] text-muted-foreground mb-1">
                              <span className="font-medium">Impacted:</span>{' '}
                              {(() => {
                                const max = 5;
                                const shown = alert.impactedComponents.slice(0, max).join(', ');
                                const more = alert.impactedComponents.length - max;
                                return more > 0 ? `${shown} +${more} more` : shown;
                              })()}
                            </div>
                          )}
                          
                          {/* Third metadata line (component • time) removed for compactness */}
                          {alert.actionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 absolute top-2 right-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(alert.actionUrl, '_blank');
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AlertPanel.displayName = "AlertPanel";

export { AlertPanel, type Alert as AlertType };
