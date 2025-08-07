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
import { AlertTriangle, TrendingUp, Shield, Activity, Play } from "lucide-react";

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
  affectedWorkflows: string[];
  businessImpactScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const ImpactAnalysisEngine = ({ components, dependencies, workflows }: ImpactAnalysisEngineProps) => {
  const [selectedComponent, setSelectedComponent] = useState<string>("");
  const [analysisResults, setAnalysisResults] = useState<ImpactResult[]>([]);

  const analyzeImpact = (componentId: string): ImpactResult => {
    const component = components.find(c => c.id === componentId);
    if (!component) {
      return {
        componentId,
        componentName: "Unknown",
        directImpacts: [],
        indirectImpacts: [],
        affectedWorkflows: [],
        businessImpactScore: 0,
        riskLevel: 'low'
      };
    }

    // Find direct dependencies (components that depend on this one)
    const directImpacts = dependencies
      .filter(dep => dep.sourceId === componentId)
      .map(dep => {
        const targetComponent = components.find(c => c.id === dep.targetId);
        return targetComponent?.name || "Unknown";
      });

    // Find indirect dependencies (recursive search)
    const indirectImpacts: string[] = [];
    const visited = new Set<string>();
    const findIndirectImpacts = (currentId: string, depth: number) => {
      if (depth > 3 || visited.has(currentId)) return; // Prevent infinite loops and limit depth
      visited.add(currentId);
      
      const nextDeps = dependencies.filter(dep => dep.sourceId === currentId);
      nextDeps.forEach(dep => {
        const targetComponent = components.find(c => c.id === dep.targetId);
        if (targetComponent && !directImpacts.includes(targetComponent.name)) {
          indirectImpacts.push(targetComponent.name);
          findIndirectImpacts(dep.targetId, depth + 1);
        }
      });
    };
    
    directImpacts.forEach(() => findIndirectImpacts(componentId, 1));

    // Find affected workflows
    const affectedWorkflows = workflows
      .filter(workflow => 
        workflow.steps.some(step => 
          step.primaryComponentId === componentId || 
          step.alternativeComponentIds?.includes(componentId)
        )
      )
      .map(workflow => workflow.name);

    // Calculate business impact score
    const directImpactScore = directImpacts.length * 10;
    const indirectImpactScore = indirectImpacts.length * 5;
    const workflowImpactScore = affectedWorkflows.length * 15;
    const criticalityMultiplier = component.criticality === 'critical' ? 2 : 
                                 component.criticality === 'high' ? 1.5 : 1;
    
    const businessImpactScore = Math.round((directImpactScore + indirectImpactScore + workflowImpactScore) * criticalityMultiplier);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (businessImpactScore >= 100) riskLevel = 'critical';
    else if (businessImpactScore >= 60) riskLevel = 'high';
    else if (businessImpactScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      componentId,
      componentName: component.name,
      directImpacts,
      indirectImpacts,
      affectedWorkflows,
      businessImpactScore,
      riskLevel
    };
  };

  const runAnalysis = () => {
    if (selectedComponent) {
      const result = analyzeImpact(selectedComponent);
      setAnalysisResults([result]);
    } else {
      // Analyze all components
      const results = components.map(component => analyzeImpact(component.id));
      setAnalysisResults(results.sort((a, b) => b.businessImpactScore - a.businessImpactScore));
    }
  };

  const riskColorMap = {
    low: "default",
    medium: "secondary",
    high: "destructive", 
    critical: "destructive"
  } as const;

  const criticalComponents = useMemo(() => 
    components.filter(c => c.criticality === 'critical'), 
    [components]
  );

  const singlePointsOfFailure = useMemo(() => {
    return components.filter(component => {
      const incomingDeps = dependencies.filter(dep => dep.targetId === component.id);
      const outgoingDeps = dependencies.filter(dep => dep.sourceId === component.id);
      
      // Component is SPOF if it has many outgoing dependencies but few alternatives
      return outgoingDeps.length > 2 && incomingDeps.length <= 1;
    });
  }, [components, dependencies]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Impact Analysis Engine</h1>
          <p className="text-muted-foreground mt-1">Analyze component failure impacts on business processes</p>
        </div>
        <Button onClick={runAnalysis} className="bg-gradient-primary hover:opacity-90">
          <Play className="w-4 h-4 mr-2" />
          Run Analysis
        </Button>
      </div>

      {/* Controls */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component to analyze (leave empty for all)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Components</SelectItem>
                  {components.map(component => (
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical Components</p>
                <p className="text-2xl font-bold text-foreground">{criticalComponents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Single Points of Failure</p>
                <p className="text-2xl font-bold text-foreground">{singlePointsOfFailure.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Dependencies</p>
                <p className="text-2xl font-bold text-foreground">{dependencies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Workflows</p>
                <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Component</TableHead>
                  <TableHead>Business Impact Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Direct Impacts</TableHead>
                  <TableHead>Affected Workflows</TableHead>
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
                      <Badge variant={riskColorMap[result.riskLevel]} className="capitalize">
                        {result.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {result.directImpacts.slice(0, 3).map((impact, index) => (
                          <Badge key={index} variant="outline" className="mr-1 text-xs">
                            {impact}
                          </Badge>
                        ))}
                        {result.directImpacts.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{result.directImpacts.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {result.affectedWorkflows.slice(0, 2).map((workflow, index) => (
                          <Badge key={index} variant="secondary" className="mr-1 text-xs">
                            {workflow}
                          </Badge>
                        ))}
                        {result.affectedWorkflows.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{result.affectedWorkflows.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};