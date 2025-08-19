import { useState, useMemo } from "react";
import { ITComponent, ComponentDependency, BusinessWorkflow } from "@/types/itiac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AlertTriangle, Info } from "lucide-react";
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
  }[];
  businessImpactScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const ImpactAnalysisEngine = ({ components, dependencies, workflows }: ImpactAnalysisEngineProps) => {
  const [selectedComponent, setSelectedComponent] = useState<string>("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsFor, setDetailsFor] = useState<ImpactResult | null>(null);
  
  // Only analyze components that are NOT online
  const nonOnlineComponents = useMemo(() => (
    components.filter(c => c.status !== 'online')
  ), [components]);
  const nonOnlineIds = useMemo(() => new Set(nonOnlineComponents.map(c => c.id)), [nonOnlineComponents]);
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
        const primaryReason = primaryIds.filter(id => impactedSet.has(id));
        if (primaryReason.length === 0) continue; // primary unaffected
        const anyAltOnline = altIds.some(aid => components.find(c => c.id === aid)?.status === 'online');
        const severity: 'warning' | 'error' = anyAltOnline ? 'warning' : 'error';
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
        });
      }
    }

    // Calculate business impact score (heavier weights for more deps, workflows, and deeper chains)
    const directCount = directImpacts.length;
    const indirectCount = indirectImpacts.length;
    const totalImpacted = impactedComponentIds.length;
    const indirectDepths = indirectImpacts
      .map(name => {
        const id = impactedComponentIds.find(id => (components.find(c => c.id === id)?.name || 'Unknown') === name);
        return id ? (depth.get(id) || 0) : 0;
      })
      .filter(d => d >= 2);
    const avgIndirectDepth = indirectDepths.length ? (indirectDepths.reduce((a, b) => a + b, 0) / indirectDepths.length) : 0;
    const maxDepth = Math.max(0, ...Array.from(depth.values()));

    const directImpactScore = directCount * 12; // higher weight
    const indirectImpactScore = indirectCount * 8; // higher than before
    const workflowImpactScore = affectedWorkflows.size * 20; // only error workflows counted
    const stepImpactScore = affectedSteps.filter(s => s.severity === 'error').length * 5; // count only error steps
    const chainSeverityScore = (avgIndirectDepth * 5) + (maxDepth * 3); // deeper chains are worse
    const breadthSeverityScore = totalImpacted * 2; // broader blast radius is worse

    const criticalityMultiplier = component.criticality === 'critical' ? 2 : 
                                 component.criticality === 'high' ? 1.5 : 1;

    const rawScore = directImpactScore + indirectImpactScore + workflowImpactScore + stepImpactScore + chainSeverityScore + breadthSeverityScore;
    const businessImpactScore = Math.round(rawScore * criticalityMultiplier);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (businessImpactScore >= 150) riskLevel = 'critical';
    else if (businessImpactScore >= 90) riskLevel = 'high';
    else if (businessImpactScore >= 45) riskLevel = 'medium';
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

  // Auto-computed results (no need to press Run)
  const analysisResults = useMemo<ImpactResult[]>(() => {
    if (selectedComponent === 'all-components') {
      const results = components.map(component => analyzeImpact(component.id));
      return results.sort((a, b) => b.businessImpactScore - a.businessImpactScore);
    }
    if (selectedComponent && selectedComponent !== "all") {
      const comp = components.find(c => c.id === selectedComponent);
      if (comp && comp.status !== 'online') {
        return [analyzeImpact(selectedComponent)];
      }
      return [];
    } else {
      const results = nonOnlineComponents.map(component => analyzeImpact(component.id));
      return results.sort((a, b) => b.businessImpactScore - a.businessImpactScore);
    }
  }, [selectedComponent, components, dependencies, workflows, nonOnlineComponents]);

  // Removed manual run; results update automatically via useMemo

  const riskColorMap = {
    low: "success",
    medium: "warning",
    high: "high", 
    critical: "critical"
  } as const;


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Impact Analysis Engine</h1>
          <p className="text-muted-foreground mt-1">Analyze IT asset failure impacts on business processes</p>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      {/* Controls */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select IT asset or All (Non-Online / All IT Assets)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Non-Online</SelectItem>
                  <SelectItem value="all-components">All IT Assets</SelectItem>
                  {nonOnlineComponents.map(component => (
                    <SelectItem key={component.id} value={component.id}>
                      {component.name} ({component.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards removed per request */}

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <span>Impact Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
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
                            <div className="max-w-xs text-sm">
                              Souhrnný skóre dopadu: 10× přímé zásahy + 5× nepřímé zásahy + 15× zasažené procesy, násobeno kritičností IT assetu.
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Impacted IT Assets</TableHead>
                  <TableHead>Affected Processes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisResults.map((result) => (
                  <TableRow key={result.componentId}>
                    <TableCell>
                      <div className="font-medium text-foreground">{result.componentName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-2xl text-foreground">{result.businessImpactScore}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={riskColorMap[result.riskLevel]} className="capitalize text-base px-3.5 py-1.5">
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
                          <Badge key={index} variant="secondary" className="mr-1 text-base px-3.5 py-1.5">
                            {workflow}
                          </Badge>
                        ))}
                        {result.affectedWorkflows.length > 2 && (
                          <Badge variant="secondary" className="text-base px-3.5 py-1.5">
                            +{result.affectedWorkflows.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setDetailsFor(result); setDetailsOpen(true); }}>View Details</Button>
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