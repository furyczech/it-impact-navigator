import { useMemo, useState, useCallback } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ComponentDependency, ITComponent } from "@/types/itiac";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Network, GitBranch, AlertTriangle, Zap, Plus, Trash2, Maximize2, Minimize2, Focus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import '@xyflow/react/dist/style.css';
import { DependencyNetworkFlow } from './DependencyNetworkFlow';


const statusColors = {
  online: "text-success",
  offline: "text-destructive",
  warning: "text-warning",
  maintenance: "text-secondary"
};

const criticalityColors = {
  low: "border-muted",
  medium: "border-primary",
  high: "border-warning",
  critical: "border-destructive"
};

export const DependenciesVisualization = () => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const addDependency = useItiacStore((s) => s.addDependency);
  const deleteDependency = useItiacStore((s) => s.deleteDependency);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "critical" | "offline">("all");
  const [isDepDialogOpen, setIsDepDialogOpen] = useState(false);
  const [newDependency, setNewDependency] = useState({ sourceId: "", targetId: "", type: "", criticality: "" });
  // New controls
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<'none'|'type'|'criticality'>('none');
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [layoutTrigger, setLayoutTrigger] = useState(0);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [nodeCritFilter, setNodeCritFilter] = useState<'all'|'low'|'medium'|'high'|'critical'>('all');
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string>('all');
  const [edgeCritFilter, setEdgeCritFilter] = useState<'all'|'low'|'medium'|'high'|'critical'>('all');

  const getComponentDependencies = useCallback((componentId: string) => {
    const incoming = dependencies.filter(dep => dep.targetId === componentId);
    const outgoing = dependencies.filter(dep => dep.sourceId === componentId);
    return { incoming, outgoing };
  }, [dependencies]);

  const getFilteredComponents = useCallback(() => {
    switch (viewMode) {
      case "critical":
        return components.filter(c => c.criticality === "critical");
      case "offline":
        return components.filter(c => c.status === "offline" || c.status === "warning");
      default:
        return components;
    }
  }, [components, viewMode]);

  const filteredComponents = getFilteredComponents();

  // Dynamic metrics: SPOF and Network Health
  const spofCount = useMemo(() => {
    if (!components.length) return 0;
    const incomingMap = new Map<string, number>();
    dependencies.forEach(d => {
      incomingMap.set(d.targetId, (incomingMap.get(d.targetId) || 0) + 1);
    });
    // Heuristic: SPOF = nodes with >=2 incoming deps OR (>=1 incoming and criticality high/critical)
    return components.reduce((acc, c) => {
      const inc = incomingMap.get(c.id) || 0;
      const highCrit = c.criticality === 'high' || c.criticality === 'critical';
      if (inc >= 2 || (inc >= 1 && highCrit)) return acc + 1;
      return acc;
    }, 0);
  }, [components, dependencies]);

  const networkHealth = useMemo(() => {
    if (!components.length) return 100;
    const total = components.length;
    const online = components.filter(c => c.status === 'online').length;
    const onlineRatio = online / total;
    const totalDeps = dependencies.length;
    const criticalDeps = dependencies.filter(d => d.criticality === 'critical').length;
    const criticalEdgeRatio = totalDeps ? (criticalDeps / totalDeps) : 0;
    // Weighted score: 70% node health, 30% edge risk
    const score = 70 * onlineRatio + 30 * (1 - criticalEdgeRatio);
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [components, dependencies]);

  // Options for filters
  const componentTypes = useMemo(() => Array.from(new Set(components.map(c => String(c.type)))).sort(), [components]);
  const dependencyTypes = useMemo(() => Array.from(new Set(dependencies.map(d => String(d.type)))).sort(), [dependencies]);
  const filters = useMemo(() => ({
    nodeTypes: nodeTypeFilter !== 'all' ? [nodeTypeFilter] : [],
    nodeCriticalities: nodeCritFilter !== 'all' ? [nodeCritFilter] as any : [],
    edgeTypes: edgeTypeFilter !== 'all' ? [edgeTypeFilter] : [],
    edgeCriticalities: edgeCritFilter !== 'all' ? [edgeCritFilter] as any : [],
  }), [nodeTypeFilter, nodeCritFilter, edgeTypeFilter, edgeCritFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dependencies Visualization</h1>
          <p className="text-muted-foreground mt-1">Visualize and manage component dependencies</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {/* Grouping */}
          <Select value={groupBy} onValueChange={(v: any) => { setGroupBy(v); setLayoutTrigger(x=>x+1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Group by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="type">Group by Type</SelectItem>
              <SelectItem value="criticality">Group by Criticality</SelectItem>
            </SelectContent>
          </Select>

          {/* Node Type */}
          <Select value={nodeTypeFilter} onValueChange={(v) => { setNodeTypeFilter(v); setLayoutTrigger(x=>x+1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Node type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Node Types</SelectItem>
              {componentTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>

          {/* Node Criticality */}
          <Select value={nodeCritFilter} onValueChange={(v: any) => { setNodeCritFilter(v); setLayoutTrigger(x=>x+1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Node criticality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Node Criticalities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          {/* Edge Type */}
          <Select value={edgeTypeFilter} onValueChange={(v) => setEdgeTypeFilter(v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Edge type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Edge Types</SelectItem>
              {dependencyTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>

          {/* Edge Criticality */}
          <Select value={edgeCritFilter} onValueChange={(v: any) => setEdgeCritFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Edge criticality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Edge Criticalities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode (existing) */}
          <Select value={viewMode} onValueChange={(value: "all" | "critical" | "offline") => setViewMode(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="offline">Issues Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={() => setFitViewTrigger(x=>x+1)} aria-label="Fit to view">
            <Focus className="w-4 h-4 mr-2" /> Fit to view
          </Button>
          <Button onClick={() => setFullscreenOpen(true)} aria-label="Fullscreen">
            <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
          </Button>
          <Dialog open={isDepDialogOpen} onOpenChange={setIsDepDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Add Dependency
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Dependency</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={newDependency.sourceId} onValueChange={(value) => setNewDependency({...newDependency, sourceId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source component" />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map(component => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newDependency.targetId} onValueChange={(value) => setNewDependency({...newDependency, targetId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target component" />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map(component => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newDependency.type} onValueChange={(value) => setNewDependency({...newDependency, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dependency type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requires">Requires</SelectItem>
                    <SelectItem value="uses">Uses</SelectItem>
                    <SelectItem value="feeds">Feeds</SelectItem>
                    <SelectItem value="monitors">Monitors</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newDependency.criticality} onValueChange={(value) => setNewDependency({...newDependency, criticality: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDepDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    if (newDependency.sourceId && newDependency.targetId && newDependency.type && newDependency.criticality) {
                      const dependency: ComponentDependency = {
                        id: Date.now().toString(),
                        sourceId: newDependency.sourceId,
                        targetId: newDependency.targetId,
                        type: newDependency.type as any,
                        criticality: newDependency.criticality as any
                      };
                      addDependency(dependency);
                      setNewDependency({ sourceId: "", targetId: "", type: "", criticality: "" });
                      setIsDepDialogOpen(false);
                    }
                  }}>Create Dependency</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Network className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Total Dependencies
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Celkový počet vazeb (hran) mezi komponentami v síti.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
                <p className="text-2xl font-bold text-foreground">{dependencies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Critical Paths
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Počet závislostí označených jako "critical", jejichž selhání má vysoký dopad.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {dependencies.filter(d => d.criticality === "critical").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Zap className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Single Points of Failure
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Uzl(y), jejichž selhání pravděpodobně způsobí výpadky více závislých komponent (např. mnoho příchozích závislostí nebo vysoká kritičnost).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
                <p className="text-2xl font-bold text-foreground">{spofCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <GitBranch className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Network Health
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs text-sm">
                          Celkové zdraví sítě: 70% podíl dostupnosti uzlů (online) + 30% penalizace za podíl kritických závislostí.
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
                <p className="text-2xl font-bold text-foreground">{networkHealth}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Map */}
        <Card className="lg:col-span-2 bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <span>Dependency Network Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DependencyNetworkFlow 
              components={filteredComponents}
              dependencies={dependencies}
              groupBy={groupBy}
              filters={filters}
              layoutTrigger={layoutTrigger}
              fitViewTrigger={fitViewTrigger}
              onAddDependency={(sourceId: string, targetId: string) => {
                const dependency: ComponentDependency = {
                  id: Date.now().toString(),
                  sourceId,
                  targetId,
                  type: "uses",
                  criticality: "medium"
                };
                addDependency(dependency);
              }}
            />
          </CardContent>
        </Card>

        {/* Component Details */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <span>Components</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Match the height of the network map container */}
            <div className="space-y-3 h-[72vh] md:h-[80vh] overflow-y-auto p-4">
              {filteredComponents.map((component) => {
                const deps = getComponentDependencies(component.id);
                const isSelected = selectedComponent === component.id;
                
                return (
                  <div
                    key={component.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/10" : criticalityColors[component.criticality]
                    }`}
                    onClick={() => setSelectedComponent(isSelected ? null : component.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground">{component.name}</span>
                          <div className={`w-2 h-2 rounded-full ${statusColors[component.status].replace('text-', 'bg-')}`} />
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {component.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {deps.incoming.length} in • {deps.outgoing.length} out
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">Incoming Dependencies</p>
                            {deps.incoming.length > 0 ? (
                              <div className="space-y-1 mt-1">
                                {deps.incoming.map((dep) => {
                                  const sourceComponent = components.find(c => c.id === dep.sourceId);
                                  return (
                                    <div key={dep.id} className="text-xs text-muted-foreground flex items-center space-x-2">
                                      <span>{sourceComponent?.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {dep.type}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          if (confirm('Delete this dependency?')) deleteDependency(dep.id);
                                        }}
                                        aria-label="Delete dependency"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">None</p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-foreground">Outgoing Dependencies</p>
                            {deps.outgoing.length > 0 ? (
                              <div className="space-y-1 mt-1">
                                {deps.outgoing.map((dep) => {
                                  const targetComponent = components.find(c => c.id === dep.targetId);
                                  return (
                                    <div key={dep.id} className="text-xs text-muted-foreground flex items-center space-x-2">
                                      <span>{targetComponent?.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {dep.type}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          if (confirm('Delete this dependency?')) deleteDependency(dep.id);
                                        }}
                                        aria-label="Delete dependency"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">None</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <span className="font-medium">Dependency Network Map</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setFitViewTrigger(x=>x+1)}>
                <Focus className="w-4 h-4 mr-1" /> Fit to view
              </Button>
              <Button size="sm" onClick={() => setFullscreenOpen(false)}>
                <Minimize2 className="w-4 h-4 mr-1" /> Close
              </Button>
            </div>
          </div>
          <div className="h-[calc(92vh-44px)]">
            <DependencyNetworkFlow
              components={filteredComponents}
              dependencies={dependencies}
              groupBy={groupBy}
              filters={filters}
              layoutTrigger={layoutTrigger}
              fitViewTrigger={fitViewTrigger}
              fullscreen
              onAddDependency={(sourceId: string, targetId: string) => {
                const dependency: ComponentDependency = {
                  id: Date.now().toString(),
                  sourceId,
                  targetId,
                  type: "uses",
                  criticality: "medium"
                };
                addDependency(dependency);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};