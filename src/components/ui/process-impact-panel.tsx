import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ITComponent, ComponentDependency, BusinessWorkflow, WorkflowStep } from "@/types/itiac";
import { buildForwardMap } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ProcessImpactPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  workflows: BusinessWorkflow[];
  impactedComponentIds: Set<string>;
  // When embedded inside another Card (e.g., AlertPanel), hide Card chrome and just render body
  embedded?: boolean;
}

export const ProcessImpactPanel = React.forwardRef<HTMLDivElement, ProcessImpactPanelProps>(
  ({ components, dependencies, workflows, impactedComponentIds, embedded, className, ...props }, ref) => {
    // Build quick lookups
    const compById = React.useMemo(() => new Map(components.map(c => [c.id, c])), [components]);
    // Per-workflow toggle: show all steps vs impacted-only (+context)
    const [showAllSteps, setShowAllSteps] = React.useState<Record<string, boolean>>({});

    const isStepImpacted = React.useCallback((step: WorkflowStep): boolean => {
      const ids = [
        ...(step.primaryComponentIds || []),
        ...(step.primaryComponentId ? [step.primaryComponentId] : [])
      ];
      return ids.some(id => impactedComponentIds.has(id));
    }, [impactedComponentIds]);

    // Precompute immediate offline cause per impacted component (downstream-only)
    const impactCauseMap = React.useMemo(() => {
      const map = new Map<string, { causeId: string; depth: number }>();
      const forward = buildForwardMap(dependencies);
      const offlineRoots = components.filter(c => c.status === 'offline').map(c => c.id);
      const visitedGlobal = new Set<string>();
      for (const root of offlineRoots) {
        const visited = new Set<string>([root]);
        const queue: Array<{ id: string; depth: number }> = [{ id: root, depth: 0 }];
        while (queue.length) {
          const { id, depth } = queue.shift()!;
          const nexts = forward.get(id) || [];
          for (const nxt of nexts) {
            if (!visited.has(nxt)) {
              visited.add(nxt);
              const prev = map.get(nxt);
              if (!prev || depth + 1 < prev.depth) {
                map.set(nxt, { causeId: root, depth: depth + 1 });
              }
              if (!visitedGlobal.has(nxt)) queue.push({ id: nxt, depth: depth + 1 });
            }
          }
        }
        offlineRoots.forEach(r => visitedGlobal.add(r));
      }
      return map;
    }, [components, dependencies]);

    const impactedWorkflows = React.useMemo(() => {
      return workflows
        .map(wf => {
          const stepsSorted = (wf.steps || []).slice().sort((a,b) => a.order - b.order);
          const impactedStepIds = new Set(stepsSorted.filter(isStepImpacted).map(s => s.id));
          return {
            wf,
            stepsSorted,
            impactedStepIds,
            impacted: impactedStepIds.size > 0
          };
        })
        .filter(x => x.impacted)
        .sort((a, b) => {
          const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
          const sdiff = sevOrder[a.wf.criticality] - sevOrder[b.wf.criticality];
          if (sdiff !== 0) return sdiff;
          return b.impactedStepIds.size - a.impactedStepIds.size;
        });
    }, [workflows, isStepImpacted]);

    // Fallback list of offline root names (for guaranteed display)
    const offlineRootNames = React.useMemo(() => {
      return components.filter(c => c.status === 'offline').map(c => c.name).filter((n): n is string => !!n);
    }, [components]);

    const Body = (
      <div className={cn("pt-0 flex-1 min-h-0 overflow-y-auto pr-1", embedded && "p-0", !embedded && "p-0") /* keep neutral padding */}>
        {impactedWorkflows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            No processes affected by current outages.
          </div>
        ) : (
          <div className="space-y-2">
            {impactedWorkflows.map(({ wf, stepsSorted, impactedStepIds }) => {
              const showAll = !!showAllSteps[wf.id];
              // When showing impacted only: include 1 neighbor before/after each impacted step
              const visibleIndices = new Set<number>();
              if (!showAll) {
                stepsSorted.forEach((s, idx) => {
                  if (impactedStepIds.has(s.id)) {
                    visibleIndices.add(idx);
                    if (idx > 0) visibleIndices.add(idx - 1);
                    if (idx < stepsSorted.length - 1) visibleIndices.add(idx + 1);
                  }
                });
              }
              const list = showAll ? stepsSorted : stepsSorted.filter((_, i) => visibleIndices.has(i));

              // Determine offline cause name for this workflow: choose first available among impacted steps
              const impactedCompIdsInWf: string[] = [];
              stepsSorted.forEach(s => {
                const ids = [
                  ...(s.primaryComponentIds || []),
                  ...(s.primaryComponentId ? [s.primaryComponentId] : [])
                ];
                ids.forEach(id => { if (impactedComponentIds.has(id)) impactedCompIdsInWf.push(id); });
              });
              const causeNames = (() => {
                const names: string[] = [];
                for (const id of impactedCompIdsInWf) {
                  const causeId = impactCauseMap.get(id)?.causeId;
                  const n = causeId ? compById.get(causeId)?.name : undefined;
                  const comp = compById.get(id);
                  const candidate = n || (comp && comp.status === 'offline' ? comp.name : undefined);
                  if (candidate) names.push(candidate);
                }
                // Deduplicate while keeping order
                return Array.from(new Set(names));
              })();
              // Guarantee display: if no specific causes were found, fallback to first offline root name (if any)
              const primaryName = causeNames.length > 0
                ? causeNames[0]
                : (offlineRootNames[0] || undefined);
              const moreCount = causeNames.length > 1 ? (causeNames.length - 1) : 0;

              return (
                <div key={wf.id} className={cn("p-3 rounded-lg border transition-all duration-200")}> 
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{wf.name}</p>
                    <Badge
                      variant={wf.criticality === 'critical' ? 'destructive' : wf.criticality === 'high' ? 'destructive' : wf.criticality === 'medium' ? 'warning' : 'secondary'}
                      className="text-xs px-1.5 py-0.5 capitalize"
                    >
                      {wf.criticality}
                    </Badge>
                    {primaryName && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">impacted by {primaryName}</span>
                        {moreCount > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="underline decoration-dotted underline-offset-2 cursor-help whitespace-nowrap">+ {moreCount} more</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="text-xs">
                                  {causeNames.map((n, i) => (
                                    <div key={`${n}-${i}`}>{n}</div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                    <div className="ml-auto" />
                    <button
                      type="button"
                      onClick={() => setShowAllSteps(prev => ({ ...prev, [wf.id]: !showAll }))}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      {showAll ? 'Show impacted only' : 'Show all steps'}
                    </button>
                  </div>
                  {wf.description && (
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{wf.description}</p>
                  )}

                  {/* Numbered vertical timeline */}
                  <div className="space-y-2">
                    {list.map((step, idxInList) => {
                      const realIndex = stepsSorted.findIndex(s => s.id === step.id);
                      // Merge legacy single ID and array, then dedupe IDs and names
                      const idList = [
                        ...(step.primaryComponentIds || []),
                        ...(step.primaryComponentId ? [step.primaryComponentId] : [])
                      ];
                      const uniqueIds = Array.from(new Set(idList));
                      const comps = Array.from(new Set(uniqueIds.map(id => compById.get(id)?.name).filter((n): n is string => !!n)));
                      const isImp = impactedStepIds.has(step.id);
                      const isLast = idxInList === list.length - 1;
                      return (
                        <div key={step.id} className="grid grid-cols-[28px_1fr] gap-3">
                          {/* Timeline rail */}
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center border",
                              isImp ? "bg-destructive text-destructive-foreground border-destructive/80" : "bg-muted text-foreground/70 border-border"
                            )}>
                              {realIndex + 1}
                            </div>
                            {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                          </div>

                          {/* Content */}
                          <div className={cn(
                            "rounded-md px-2 py-1.5 text-xs",
                            isImp ? "bg-destructive/10 border border-destructive/50" : "bg-card/40 border border-transparent"
                          )}>
                            <div className="font-medium flex flex-wrap items-baseline gap-1">
                              <span className={cn(isImp ? "text-destructive" : "text-foreground")}>{step.name}</span>
                              {comps.length > 0 && (
                                <span className="text-muted-foreground">– {comps.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    if (embedded) {
      return (
        <div ref={ref} className={cn("flex flex-col h-full flex-1 min-h-0 overflow-hidden", className)} {...props}>
          {Body}
        </div>
      );
    }

    return (
      <Card ref={ref} className={cn("bg-card border-border shadow-depth flex flex-col h-full", className)} {...props}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <span>Affected Processes</span>
            <Badge variant="outline">{impactedWorkflows.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">{Body}</CardContent>
      </Card>
    );
  }
);

ProcessImpactPanel.displayName = "ProcessImpactPanel";
