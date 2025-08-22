import { useState, useMemo } from "react";
import { ITComponent, ComponentDependency, BusinessWorkflow } from "@/types/itiac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ImpactAnalysisEngineProps {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  workflows: BusinessWorkflow[];
}

interface ImpactResult {
  componentId: string;
  componentName: string;
  directImpacts: string[];
  indirectImpacts: string[];
  impactedComponentIds: string[];
  impactedComponents: string[];
  affectedWorkflows: string[];
  affectedSteps: {
    workflowId: string;
    workflowName: string;
    stepId: string;
    stepName: string;
    reasonComponentIds: string[]; // components that caused the impact
    severity: 'warning' | 'error';
    alternativeIds?: string[]; // alternative components that kept the process running
  }[];
  businessImpactScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const ImpactAnalysisEngine = ({ components, dependencies, workflows }: ImpactAnalysisEngineProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsFor, setDetailsFor] = useState<ImpactResult | null>(null);
  
  // KPIs removed per request; no derived KPI metrics are computed here

  const analyzeImpact = (componentId: string): ImpactResult => {
    const component = components.find(c => c.id === componentId);
    if (!component) {
      return {
        componentId,
        componentName: "Unknown",
        directImpacts: [],
        indirectImpacts: [],
        impactedComponentIds: [],
        impactedComponents: [],
        affectedWorkflows: [],
        affectedSteps: [],
        businessImpactScore: 0,
        riskLevel: 'low'
      };
    }

    // Build adjacency for cascading impacts: sourceId -> [targetId]
    const adj = new Map<string, string[]>();
    dependencies.forEach(dep => {
      if (!adj.has(dep.sourceId)) adj.set(dep.sourceId, []);
      adj.get(dep.sourceId)!.push(dep.targetId);
    });

    // Compute reachability (BFS) and track depths
    const visited = new Set<string>([componentId]);
    const depth = new Map<string, number>();
    depth.set(componentId, 0);
    const queue: string[] = [];
    for (const nid of (adj.get(componentId) || [])) {
      visited.add(nid);
      depth.set(nid, 1);
      queue.push(nid);
    }
    while (queue.length) {
      const cur = queue.shift()!;
      const next = adj.get(cur) || [];
      const nextDepth = (depth.get(cur) || 0) + 1;
      for (const n of next) {
        if (!visited.has(n)) {
          visited.add(n);
          depth.set(n, nextDepth);
          queue.push(n);
        }
      }
    }

    const directIds = new Set<string>((adj.get(componentId) || []));
    const allImpactedIds = Array.from(visited).filter(id => id !== componentId);
    const indirectIds = allImpactedIds.filter(id => !directIds.has(id));

    const idToName = (id: string) => components.find(c => c.id === id)?.name || 'Unknown';
    const directImpacts = Array.from(directIds).map(idToName);
    const indirectImpacts = Array.from(new Set(indirectIds)).map(idToName);
    const impactedComponentIds = allImpactedIds;
    const impactedComponents = allImpactedIds.map(idToName);

    // Find affected workflows (if any step uses the failed or any impacted component)
    const impactedSet = new Set<string>([componentId, ...allImpactedIds]);
    const affectedSteps: ImpactResult['affectedSteps'] = [];
    const affectedWorkflows = new Set<string>();
    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        const primaryIds = [
          ...(step.primaryComponentId ? [step.primaryComponentId] : []),
          ...(step.primaryComponentIds || [])
        ];
        const altIds = step.alternativeComponentIds || [];
        const primaryReasonRaw = primaryIds.filter(id => impactedSet.has(id));
        const primaryReason = Array.from(new Set(primaryReasonRaw));
        if (primaryReason.length === 0) continue; // primary unaffected
        const altOnlineIds = altIds.filter(aid => components.find(c => c.id === aid)?.status === 'online');
        const severity: 'warning' | 'error' = altOnlineIds.length > 0 ? 'warning' : 'error';
        if (severity === 'error') {
          affectedWorkflows.add(workflow.name);
        }
        affectedSteps.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          stepId: step.id,
          stepName: step.name,
          reasonComponentIds: primaryReason,
          severity,
          alternativeIds: altOnlineIds.length > 0 ? altOnlineIds : undefined,
        });
      }
    }

    // Option B: Simplified Business Impact Score (normalized 0–100)
    const directCount = directImpacts.length;
    const indirectCount = indirectImpacts.length;
    const errorWorkflowsCount = affectedWorkflows.size; // only added when severity === 'error'

    const cappedDirect = Math.min(directCount, 10);      // max 10
    const cappedIndirect = Math.min(indirectCount, 20);  // max 20
    const cappedErrWf = Math.min(errorWorkflowsCount, 5);// max 5

    const summed = (cappedDirect * 8) + (cappedIndirect * 2) + (cappedErrWf * 10);

    const criticalityMultiplier = component.criticality === 'critical' ? 2
                                 : component.criticality === 'high' ? 1.5
                                 : 1;

    const scaled = summed * criticalityMultiplier;
    const businessImpactScore = Math.max(0, Math.min(100, Math.round(scaled)));

    // Risk thresholds for 0–100 scale
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (businessImpactScore >= 80) riskLevel = 'critical';
    else if (businessImpactScore >= 60) riskLevel = 'high';
    else if (businessImpactScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      componentId,
      componentName: component.name,
      directImpacts,
      indirectImpacts,
      impactedComponentIds,
      impactedComponents,
      affectedWorkflows: Array.from(affectedWorkflows),
      affectedSteps,
      businessImpactScore,
      riskLevel
    };
  };

  const analysisResults = useMemo<ImpactResult[]>(() => {
    // initial independent computation
    const results = components.map(component => analyzeImpact(component.id));

    // enforce monotonicity: parent (source) should not be much lower than child (target)
    const idToResult = new Map<string, ImpactResult>(results.map(r => [r.componentId, { ...r }]));
    const decay = 0; // enforce parent >= child (no allowed negative gap)

    // helper to recompute risk from score
    const riskFromScore = (score: number): ImpactResult['riskLevel'] => {
      if (score >= 80) return 'critical';
      if (score >= 60) return 'high';
      if (score >= 40) return 'medium';
      return 'low';
    };

    // propagate upward along chains (more iterations for longer paths)
    const maxIters = Math.max(3, components.length);
    for (let iter = 0; iter < maxIters; iter++) {
      let changed = false;
      for (const dep of dependencies) {
        const parent = idToResult.get(dep.sourceId);
        const child = idToResult.get(dep.targetId);
        if (!parent || !child) continue;
        const minParent = Math.max(0, child.businessImpactScore - decay);
        if (parent.businessImpactScore < minParent) {
          parent.businessImpactScore = Math.min(100, minParent);
          parent.riskLevel = riskFromScore(parent.businessImpactScore);
          changed = true;
        }
      }
      if (!changed) break;
    }

    const adjusted = Array.from(idToResult.values());
    return adjusted.sort((a, b) => b.businessImpactScore - a.businessImpactScore);
  }, [components, dependencies, workflows]);

  const riskColorMap = {
    low: "success",
    medium: "warning",
    high: "high", 
    critical: "critical"
  } as const;

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">IT Asset Impact Overview</h1>
          <p className="page-subtitle">Overview of failure impacts across all IT assets and processes</p>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <Card className="enhanced-card shadow-depth mb-0 overflow-hidden flex-1 flex flex-col min-h-0">
          <CardContent className="impact-scroll enhanced-card-content p-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 pb-2" style={{ scrollbarGutter: 'stable' }}>
            <Table className="enhanced-table w-full table-edge-tight table-collapse compact-tables text-xs table-fixed bg-transparent">
              <TableHeader className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
                <TableRow>
                    <TableHead>IT Asset</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Business Impact Score
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-sm text-sm space-y-2">
                                <div className="font-semibold">Business Impact Score (0–100)</div>
                                <ul className="list-disc pl-4 space-y-1">
                                  <li><span className="font-medium">Direct impacts</span>: assets directly dependent (1 hop). Capped at 10.</li>
                                  <li><span className="font-medium">Indirect impacts</span>: assets affected via 2+ hops. Capped at 20.</li>
                                  <li><span className="font-medium">Error workflows</span>: workflows without a working alternative. Capped at 5.</li>
                                </ul>
                                <div className="font-mono text-xs leading-5 bg-muted/40 rounded p-2">
                                  Score = 8×min(Direct,10) + 2×min(Indirect,20) + 10×min(ErrorWorkflows,5)
                                </div>
                                <div>
                                  Then multiplied by asset criticality: <span className="font-mono">Critical×2</span>, <span className="font-mono">High×1.5</span>, else <span className="font-mono">×1</span>. Final score is clamped to <span className="font-mono">0–100</span>.
                                </div>
                                <div className="text-xs text-muted-foreground">Risk levels: Low &lt; 40, Medium ≥ 40, High ≥ 60, Critical ≥ 80.</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Impacted IT Assets</TableHead>
                    <TableHead>Affected Processes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisResults.map((result) => (
                    <TableRow
                      key={result.componentId}
                      onClick={() => { setDetailsFor(result); setDetailsOpen(true); }}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailsFor(result);
                          setDetailsOpen(true);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="font-medium text-foreground">{result.componentName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-base text-foreground">{result.businessImpactScore}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={riskColorMap[result.riskLevel]} className="capitalize text-xs px-2 py-0.5">
                          {result.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[600px]">
                          {result.impactedComponents.map((impact, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {impact}
                            </Badge>
                          ))}
                          {result.impactedComponents.length === 0 && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {result.affectedWorkflows.slice(0, 2).map((workflow, index) => (
                            <Badge key={index} variant="secondary" className="mr-1 text-xs px-2 py-0.5">
                              {workflow}
                            </Badge>
                          ))}
                          {result.affectedWorkflows.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              +{result.affectedWorkflows.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Impact Details{detailsFor ? `: ${detailsFor.componentName}` : ''}</DialogTitle>
          </DialogHeader>
          {detailsFor && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Direct Impacts</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {detailsFor.directImpacts.length > 0 ? detailsFor.directImpacts.map((n, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
                  )) : <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Indirect Impacts</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {detailsFor.indirectImpacts.length > 0 ? detailsFor.indirectImpacts.map((n, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
                  )) : <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Affected Processes</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {detailsFor.affectedWorkflows.length > 0 ? detailsFor.affectedWorkflows.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-base px-3.5 py-1.5">{w}</Badge>
                  )) : <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Affected Process Steps</p>
                {detailsFor.affectedSteps.length > 0 ? (
                  <div className="mt-2 space-y-2 max-h-60 overflow-auto pr-1">
                    {detailsFor.affectedSteps.map((s, idx) => (
                      <div key={`${s.workflowId}-${s.stepId}-${idx}`} className="text-xs text-foreground">
                        <span className="font-semibold">{s.workflowName}</span> → <span className="italic">{s.stepName}</span>
                        <span className="ml-1">[{s.severity === 'error' ? 'error' : 'warning'}]</span>
                        <span className="ml-1 text-muted-foreground">(impacted by: {s.reasonComponentIds.map(id => components.find(c => c.id === id)?.name || id).join(', ')})</span>
                        {s.severity === 'warning' && s.alternativeIds && s.alternativeIds.length > 0 && (
                          <span className="ml-1 text-muted-foreground">, alternative: {s.alternativeIds.map(id => components.find(c => c.id === id)?.name || id).join(', ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setDetailsOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};