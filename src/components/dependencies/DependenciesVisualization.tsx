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

// Chip styles for criticality labels
const critChipClasses: Record<'low'|'medium'|'high'|'critical', string> = {
  low: "bg-muted text-foreground/70",
  medium: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

export const DependenciesVisualization = () => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const addDependency = useItiacStore((s) => s.addDependency);
  const deleteDependency = useItiacStore((s) => s.deleteDependency);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDepDialogOpen, setIsDepDialogOpen] = useState(false);
  const [newDependency, setNewDependency] = useState({ sourceId: "", targetId: "", criticality: "" });
  // New controls
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [layoutTrigger, setLayoutTrigger] = useState(0);
  // Post-edge creation config dialog
  const [depConfigOpen, setDepConfigOpen] = useState(false);
  const [pendingEdge, setPendingEdge] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [pendingCrit, setPendingCrit] = useState<'low'|'medium'|'high'|'critical'>('medium');
  // Map visibility toggle
  const [showAll, setShowAll] = useState(false);
  // Manage dialog state for per-asset dependency details
  const [manageOpen, setManageOpen] = useState(false);
  const [manageComponentId, setManageComponentId] = useState<string | null>(null);
  // Assets search
  const [assetSearch, setAssetSearch] = useState("");
  // Assets sort
  const [assetSort, setAssetSort] = useState<'name'|'status'|'criticality'|'deps'>('name');
  // Delete dependency confirm
  const [depDeleteOpen, setDepDeleteOpen] = useState(false);
  const [depToDelete, setDepToDelete] = useState<string | null>(null);

  const getComponentDependencies = useCallback((componentId: string) => {
    const incoming = dependencies.filter(dep => dep.targetId === componentId);
    const outgoing = dependencies.filter(dep => dep.sourceId === componentId);
    return { incoming, outgoing };
  }, [dependencies]);

  const getFilteredComponents = useCallback(() => components, [components]);

  const filteredComponents = getFilteredComponents().filter(c =>
    c.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const sortedComponents = useMemo(() => {
    const clone = [...filteredComponents];
    switch (assetSort) {
      case 'status':
        return clone.sort((a, b) => String(a.status).localeCompare(String(b.status)) || a.name.localeCompare(b.name));
      case 'criticality':
        const order: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
        return clone.sort((a, b) => (order[a.criticality] - order[b.criticality]) || a.name.localeCompare(b.name));
      case 'deps':
        const counts = (c: any) => {
          const incoming = dependencies.filter(d => d.targetId === c.id).length;
          const outgoing = dependencies.filter(d => d.sourceId === c.id).length;
          return incoming + outgoing;
        };
        return clone.sort((a, b) => counts(b) - counts(a) || a.name.localeCompare(b.name));
      default:
        return clone.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filteredComponents, assetSort, dependencies]);

  // Components shown in map
  // - Default: none
  // - When some are selected in the left list: show selected + all directly related assets
  // - When "View all" is enabled: show all (respecting current filters)
  const mapComponents = useMemo(() => {
    if (showAll) return sortedComponents;
    if (selectedIds.size === 0) return [] as typeof components;
    const visible = new Set<string>([...selectedIds]);
    for (const dep of dependencies) {
      if (visible.has(dep.sourceId)) visible.add(dep.targetId);
      if (visible.has(dep.targetId)) visible.add(dep.sourceId);
    }
    return components.filter(c => visible.has(c.id));
  }, [showAll, sortedComponents, selectedIds, dependencies, components]);

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="h-full min-h-0 flex flex-col gap-6 pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground whitespace-nowrap">Dependencies Visualization</h1>
          <p className="text-muted-foreground mt-1">Visualize and manage IT asset dependencies</p>
        </div>

        <div className="flex items-center gap-2 w-full">
          {/* Filters removed per request */}
          <div className="h-2" />
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
                      disabled={!(newDependency.sourceId && newDependency.targetId && newDependency.criticality) || newDependency.sourceId === newDependency.targetId}
                      onClick={() => {
                        const dependency: ComponentDependency = {
                          id: Date.now().toString(),
                          sourceId: newDependency.sourceId,
                          targetId: newDependency.targetId,
                          type: 'uses' as any,
                          criticality: newDependency.criticality as any
                        };
                        addDependency(dependency);
                        setNewDependency({ sourceId: "", targetId: "", criticality: "" });
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 items-stretch">
        {/* Assets list on the LEFT (1/3) */}
        <Card className="bg-card border-border shadow-depth h-full overflow-hidden flex flex-col">
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
          <CardContent className="p-0 flex-1 min-h-0">
            <div className="p-4 flex flex-col h-full min-h-0">
              <div className="pb-2">
                <Input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="h-8 text-xs"
                />
                {/* tip removed per request */}
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{sortedComponents.length} items</span>
                    {selectedIds.size > 0 && (
                      <span className="text-muted-foreground">• {selectedIds.size} selected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Sort:</span>
                    <Select value={assetSort} onValueChange={(v: any) => setAssetSort(v)}>
                      <SelectTrigger className="h-7 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name (A–Z)</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="criticality">Criticality</SelectItem>
                        <SelectItem value="deps">Connections</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedIds.size > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                {sortedComponents.length === 0 && (
                  <div className="text-xs text-muted-foreground py-8 text-center border rounded-md">No assets match your search/filter.</div>
                )}
                {sortedComponents.map((component) => {
                  const deps = getComponentDependencies(component.id);
                  const isSelected = selectedIds.has(component.id);
                  return (
                    <div
                      key={component.id}
                      className={`group relative p-3 rounded-md border cursor-pointer transition-colors bg-card/40 hover:bg-card/70 ${
                        isSelected ? "ring-2 ring-primary border-transparent bg-primary/5" : "border-border"
                      }`}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        if (e.ctrlKey) {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(component.id)) next.delete(component.id); else next.add(component.id);
                            return next;
                          });
                        } else {
                          // single-select fallback + open manage dialog
                          setSelectedIds(new Set([component.id]));
                          setManageComponentId(component.id);
                          setManageOpen(true);
                        }
                      }}
                    >
                      {/* Left status accent bar */}
                      <span
                        className={`absolute left-0 top-0 h-full w-1 rounded-l-md ${statusColors[component.status].replace('text-', 'bg-')}`}
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-3 pl-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground" title={component.name}>{component.name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-2xs capitalize">{component.type}</Badge>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${critChipClasses[component.criticality as 'low'|'medium'|'high'|'critical']}`}>
                              {component.criticality}
                            </span>
                            <span>{deps.incoming.length} depends on • {deps.outgoing.length} supports</span>
                          </div>
                        </div>
                        {/* manage button removed per request */}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Map on the RIGHT (2/3) */}
        <Card className="lg:col-span-2 bg-card border-border shadow-depth overflow-hidden flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <span>Dependency Network Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
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
            <div className="relative flex-1 min-h-0">
              {/* Overlay controls at top-right of the map */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAll(v => !v); setFitViewTrigger(x=>x+1); }}>
                  {showAll ? 'Hide all' : 'View all'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setFitViewTrigger(x=>x+1)}>
                  <Focus className="w-4 h-4 mr-1" /> Fit to view
                </Button>
                <Button size="sm" onClick={() => setFullscreenOpen(true)}>
                  <Maximize2 className="w-4 h-4 mr-1" /> Fullscreen
                </Button>
              </div>
              <DependencyNetworkFlow 
                components={mapComponents}
                dependencies={dependencies}
                layoutTrigger={layoutTrigger}
                fitViewTrigger={fitViewTrigger}
                onAddDependency={(sourceId: string, targetId: string) => {
                  setPendingEdge({ sourceId, targetId });
                  setPendingCrit('medium');
                  setDepConfigOpen(true);
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
          <div className="relative">
            {/* Overlay controls at top-right in fullscreen map */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowAll(v => !v); setFitViewTrigger(x=>x+1); }}>
                {showAll ? 'Hide all' : 'View all'}
              </Button>
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
              layoutTrigger={layoutTrigger}
              fitViewTrigger={fitViewTrigger}
              fullscreen
              onAddDependency={(sourceId: string, targetId: string) => {
                setPendingEdge({ sourceId, targetId });
                setPendingCrit('medium');
                setDepConfigOpen(true);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-edge dependency configuration */}
      <Dialog open={depConfigOpen} onOpenChange={setDepConfigOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configure dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* type note removed */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Criticality</span>
              <Select value={pendingCrit} onValueChange={(v) => setPendingCrit(v as any)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setDepConfigOpen(false); setPendingEdge(null); }}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!pendingEdge) return;
                  const dependency: ComponentDependency = {
                    id: Date.now().toString(),
                    sourceId: pendingEdge.sourceId,
                    targetId: pendingEdge.targetId,
                    type: "uses" as any,
                    criticality: pendingCrit as any,
                  };
                  addDependency(dependency);
                  setDepConfigOpen(false);
                  setPendingEdge(null);
                }}
              >
                Save
              </Button>
            </div>
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
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <DialogHeader className="p-0">
                      <DialogTitle className="flex items-center gap-2">
                        <span>Dependencies for {comp.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{comp.type}</Badge>
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground mt-1">Review and manage this asset's connections.</p>
                  </div>
                </div>

                {/* Quick actions removed: adding is available via inline 'Add' per column */}

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* In */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Depends on</h4>
                    <div className="rounded-md border bg-card p-2">
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {incoming.length === 0 ? (
                          <div className="flex items-center justify-between rounded-md border bg-background px-2 h-9">
                            <span className="text-xs text-muted-foreground">None</span>
                          </div>
                        ) : (
                          incoming.map((dep) => {
                            const from = components.find(c => c.id === dep.sourceId);
                            return (
                              <div key={dep.id} className="flex items-center justify-between rounded-md border bg-background px-2 h-9">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{from?.name || dep.sourceId}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive outline-none ring-0 ring-offset-0 focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!ring-transparent focus-visible:!ring-offset-transparent"
                                  onClick={() => { setDepToDelete(dep.id); setDepDeleteOpen(true); }}
                                  aria-label="Delete dependency"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 outline-none ring-0 ring-offset-0 focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!ring-transparent focus-visible:!ring-offset-transparent" onClick={() => { setNewDependency({ sourceId: "", targetId: comp.id, criticality: "" }); setIsDepDialogOpen(true); }}>Add</Button>
                      </div>
                    </div>
                  </div>

                  {/* Out */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Supports</h4>
                    <div className="rounded-md border bg-card p-2">
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {outgoing.length === 0 ? (
                          <div className="flex items-center justify-between rounded-md border bg-background px-2 h-9">
                            <span className="text-xs text-muted-foreground">None</span>
                          </div>
                        ) : (
                          outgoing.map((dep) => {
                            const to = components.find(c => c.id === dep.targetId);
                            return (
                              <div key={dep.id} className="flex items-center justify-between rounded-md border bg-background px-2 h-9">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{to?.name || dep.targetId}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive outline-none ring-0 ring-offset-0 focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!ring-transparent focus-visible:!ring-offset-transparent"
                                  onClick={() => { setDepToDelete(dep.id); setDepDeleteOpen(true); }}
                                  aria-label="Delete dependency"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 outline-none ring-0 ring-offset-0 focus:outline-none focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!ring-transparent focus-visible:!ring-offset-transparent" onClick={() => { setNewDependency({ sourceId: comp.id, targetId: "", criticality: "" }); setIsDepDialogOpen(true); }}>Add</Button>
                      </div>
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