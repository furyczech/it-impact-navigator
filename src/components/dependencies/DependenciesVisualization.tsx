import { useMemo, useState, useCallback } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ComponentDependency } from "@/types/itiac";
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
import { Network, GitBranch, Plus, Trash2, Maximize2, Minimize2, Focus } from "lucide-react";
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
  // Layout controls
  const [layoutEngine, setLayoutEngine] = useState<'internal'|'dagre'|'elk'>('internal');
  const [direction, setDirection] = useState<'LR'|'TB'>('TB');

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

  // KPI metrics removed (spofCount, networkHealth) as per request

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground whitespace-nowrap">Dependencies Visualization</h1>
          <p className="text-muted-foreground mt-1">Visualize and manage IT asset dependencies</p>
        </div>

        <div className="flex items-center gap-2 w-full">
          {/* Centered filters */}
          <div className="flex flex-nowrap items-center gap-2 mx-auto overflow-x-auto">
          {/* Grouping */}
          <Select value={groupBy} onValueChange={(v: any) => { setGroupBy(v); setLayoutTrigger(x=>x+1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Group by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="type">Group by Type</SelectItem>
              <SelectItem value="criticality">Group by Criticality</SelectItem>
            </SelectContent>
          </Select>

          {/* Layout Engine */}
          <Select value={layoutEngine} onValueChange={(v: any) => { setLayoutEngine(v); setLayoutTrigger(x=>x+1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Layout engine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="dagre">Dagre</SelectItem>
              <SelectItem value="elk">ELK</SelectItem>
            </SelectContent>
          </Select>

          {/* Direction */}
          <Select value={direction} onValueChange={(v: any) => { setDirection(v); setLayoutTrigger(x=>x+1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Direction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TB">Top-Bottom</SelectItem>
              <SelectItem value="LR">Left-Right</SelectItem>
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
              <SelectItem value="all">All IT Assets</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="offline">Issues Only</SelectItem>
            </SelectContent>
          </Select>
          </div>
          {/* Actions: only '+ Add Dependency' right-aligned */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Dialog open={isDepDialogOpen} onOpenChange={setIsDepDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="uiv-glow-btn uiv-glow-blue uiv-glow-wide text-base inline-flex items-center"
                  title="Add Dependency"
                  aria-label="Add Dependency"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Dependency
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Dependency</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={newDependency.sourceId} onValueChange={(value) => setNewDependency({...newDependency, sourceId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source IT asset" />
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
                      <SelectValue placeholder="Select target IT asset" />
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
      </div>
      

      {/* Stats removed per request */}

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
            {/* Legend (match NetworkTopology) */}
            <div className="px-4 pt-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--success))'}} /> Online</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--warning))'}} /> Warning</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--primary))'}} /> Impacted</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--destructive))'}} /> Offline</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--secondary))'}} /> Maintenance</div>
              </div>
            </div>
            <div className="relative">
              {/* Overlay controls at top-right of the map */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setFitViewTrigger(x=>x+1)} aria-label="Fit to view">
                  <Focus className="w-4 h-4 mr-1" /> Fit to view
                </Button>
                <Button size="sm" onClick={() => setFullscreenOpen(true)} aria-label="Fullscreen">
                  <Maximize2 className="w-4 h-4 mr-1" /> Fullscreen
                </Button>
              </div>
              <DependencyNetworkFlow 
                components={filteredComponents}
                dependencies={dependencies}
                groupBy={groupBy}
                filters={filters}
                layoutTrigger={layoutTrigger}
                fitViewTrigger={fitViewTrigger}
                layoutEngine={layoutEngine}
                direction={direction}
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
          </CardContent>
        </Card>

        {/* Component Details */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <span>IT Assets</span>
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
            {/* Fit/Close moved to map overlay */}
          </div>
          {/* Legend (fullscreen) */}
          <div className="px-2 pt-1">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-1">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--success))'}} /> Online</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--warning))'}} /> Warning</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--primary))'}} /> Impacted</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--destructive))'}} /> Offline</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--secondary))'}} /> Maintenance</div>
            </div>
          </div>
          <div className="relative h-[calc(92vh-72px)]">
            {/* Overlay controls at top-right in fullscreen map */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setFitViewTrigger(x=>x+1)}>
                <Focus className="w-4 h-4 mr-1" /> Fit to view
              </Button>
              <Button size="sm" onClick={() => setFullscreenOpen(false)}>
                <Minimize2 className="w-4 h-4 mr-1" /> Close
              </Button>
            </div>
            <DependencyNetworkFlow
              components={filteredComponents}
              dependencies={dependencies}
              groupBy={groupBy}
              filters={filters}
              layoutTrigger={layoutTrigger}
              fitViewTrigger={fitViewTrigger}
              fullscreen
              layoutEngine={layoutEngine}
              direction={direction}
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