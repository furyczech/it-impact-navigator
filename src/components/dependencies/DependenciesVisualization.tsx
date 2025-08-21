import { useMemo, useState, useCallback } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ComponentDependency } from "@/types/itiac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  // Manage dialog state for per-asset dependency details
  const [manageOpen, setManageOpen] = useState(false);
  const [manageComponentId, setManageComponentId] = useState<string | null>(null);
  // Assets search
  const [assetSearch, setAssetSearch] = useState("");
  // Delete dependency confirm
  const [depDeleteOpen, setDepDeleteOpen] = useState(false);
  const [depToDelete, setDepToDelete] = useState<string | null>(null);

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

  const filteredComponents = getFilteredComponents().filter(c =>
    c.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  // Components shown in map: only selected if 2+ selected, otherwise fallback to filtered set
  const mapComponents = selectedIds.size >= 2
    ? components.filter(c => selectedIds.has(c.id))
    : filteredComponents;

  const clearSelection = () => setSelectedIds(new Set());

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
                <Button size="sm" title="Add Dependency" aria-label="Add Dependency" className="hover:bg-primary/80 hover:saturate-150">
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
                  {newDependency.sourceId === newDependency.targetId && newDependency.sourceId !== '' && (
                    <p className="text-xs text-destructive">Source and target cannot be the same.</p>
                  )}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDepDialogOpen(false)}>Cancel</Button>
                    <Button
                      disabled={!(newDependency.sourceId && newDependency.targetId && newDependency.type && newDependency.criticality) || newDependency.sourceId === newDependency.targetId}
                      onClick={() => {
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
                      }}
                    >
                      Create Dependency
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      

      {/* Stats removed per request */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets list on the LEFT (1/3) */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-primary" />
                <span>IT Assets</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Hold CTRL to multi-select
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[72vh] md:h-[80vh] p-4 flex flex-col">
              <div className="pb-2">
                <Input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="h-8 text-xs"
                />
                {selectedIds.size > 0 && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Selected: {selectedIds.size}</span>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-3 overflow-y-auto pr-1">
                {filteredComponents.map((component) => {
                  const deps = getComponentDependencies(component.id);
                  const isSelected = selectedIds.has(component.id);
                  return (
                    <div
                      key={component.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected ? "border-primary bg-primary/10" : criticalityColors[component.criticality]
                      }`}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        if (e.ctrlKey) {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(component.id)) next.delete(component.id); else next.add(component.id);
                            return next;
                          });
                        } else {
                          // single-select fallback
                          setSelectedIds(new Set([component.id]));
                        }
                      }}
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
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Map on the RIGHT (2/3) */}
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
                components={mapComponents}
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
              components={mapComponents}
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

      {/* Manage Dependencies modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl">
          {(() => {
            const comp = components.find(c => c.id === manageComponentId);
            if (!comp) return <div />;
            const { incoming, outgoing } = getComponentDependencies(comp.id);
            return (
              <div className="space-y-3">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Dependencies for {comp.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">{comp.type}</Badge>
                      <span>{incoming.length} in • {outgoing.length} out</span>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2 justify-center">
                  <Button size="sm" onClick={() => { setNewDependency({ sourceId: "", targetId: comp.id, type: "", criticality: "" }); setIsDepDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Incoming
                  </Button>
                  <Button size="sm" onClick={() => { setNewDependency({ sourceId: comp.id, targetId: "", type: "", criticality: "" }); setIsDepDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Outgoing
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Incoming</p>
                    <div className="mt-2 space-y-1">
                      {incoming
                        .map(dep => ({ dep, source: components.find(c => c.id === dep.sourceId) }))
                        .map(({ dep, source }) => (
                          <div key={dep.id} className="flex items-center justify-between text-sm rounded border p-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate" title={source?.name}>{source?.name}</span>
                              <Badge variant="outline" className="text-2xs">{dep.type}</Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => { setDepToDelete(dep.id); setDepDeleteOpen(true); }}
                              aria-label="Delete dependency"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      {incoming.length === 0 && (
                        <p className="text-xs text-muted-foreground">None</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Outgoing</p>
                    <div className="mt-2 space-y-1">
                      {outgoing
                        .map(dep => ({ dep, target: components.find(c => c.id === dep.targetId) }))
                        .map(({ dep, target }) => (
                          <div key={dep.id} className="flex items-center justify-between text-sm rounded border p-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate" title={target?.name}>{target?.name}</span>
                              <Badge variant="outline" className="text-2xs">{dep.type}</Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => { setDepToDelete(dep.id); setDepDeleteOpen(true); }}
                              aria-label="Delete dependency"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      {outgoing.length === 0 && (
                        <p className="text-xs text-muted-foreground">None</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete dependency confirm */}
      <Dialog open={depDeleteOpen} onOpenChange={setDepDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete dependency</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this dependency? This action cannot be undone.</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDepDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (depToDelete) deleteDependency(depToDelete); setDepDeleteOpen(false); setDepToDelete(null); }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};