import { ITComponent, ComponentDependency, BusinessWorkflow } from "@/types/itiac";

export interface ImpactResult {
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
    reasonComponentIds: string[];
    severity: 'warning' | 'error';
  }[];
  businessImpactScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export function analyzeImpact(
  componentId: string,
  components: ITComponent[],
  dependencies: ComponentDependency[],
  workflows: BusinessWorkflow[]
): ImpactResult {
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

  const adj = new Map<string, string[]>();
  dependencies.forEach(dep => {
    if (!adj.has(dep.sourceId)) adj.set(dep.sourceId, []);
    adj.get(dep.sourceId)!.push(dep.targetId);
  });

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
      if (primaryReason.length === 0) continue;
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

  const directImpactScore = directCount * 12;
  const indirectImpactScore = indirectCount * 8;
  const workflowImpactScore = affectedWorkflows.size * 20;
  const stepImpactScore = affectedSteps.filter(s => s.severity === 'error').length * 5;
  const chainSeverityScore = (avgIndirectDepth * 5) + (maxDepth * 3);
  const breadthSeverityScore = totalImpacted * 2;

  const criticalityMultiplier = component.criticality === 'critical' ? 2 : 
                               component.criticality === 'high' ? 1.5 : 1;

  const rawScore = directImpactScore + indirectImpactScore + workflowImpactScore + stepImpactScore + chainSeverityScore + breadthSeverityScore;
  const businessImpactScore = Math.round(rawScore * criticalityMultiplier);

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
    riskLevel,
  };
}

export function computeAnalysisResults(
  components: ITComponent[],
  dependencies: ComponentDependency[],
  workflows: BusinessWorkflow[],
  scope: 'all-components' | 'non-online' = 'non-online'
) {
  const source = scope === 'all-components' ? components : components.filter(c => c.status !== 'online');
  const results = source.map(c => analyzeImpact(c.id, components, dependencies, workflows));
  return results.sort((a, b) => b.businessImpactScore - a.businessImpactScore);
}
