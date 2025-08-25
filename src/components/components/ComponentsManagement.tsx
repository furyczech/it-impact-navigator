import { useEffect, useMemo, useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ITComponent } from "@/types/itiac";
import { computeImpactedFromOfflines, buildForwardMap } from "@/lib/utils";
import { ComponentForm } from "@/components/forms/ComponentForm";
import { ExportService } from "@/services/exportService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Server, 
  Database, 
  Globe, 
  Zap, 
  Network, 
  Code, 
  Settings, 
  HardDrive, 
  Plug, 
  Cpu, 
  Shield, 
  Cloud, 
  BadgeCheck, 
  User, 
  Archive, 
  Puzzle, 
  AlertTriangle 
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const componentIcons = {
  server: Server,
  database: Database,
  api: Globe,
  'load-balancer': Zap,
  network: Network,
  application: Code,
  service: Settings,
  storage: HardDrive,
  endpoint: Plug,
  'virtual-machine': Cpu,
  firewall: Shield,
  router: Network,
  switch: Network,
  'cloud-instance': Cloud,
  license: BadgeCheck,
  backup: Archive,
  domain: Globe,
  certificate: BadgeCheck,
  'user-account': User,
  modul: Puzzle
} as const;

const statusColors = {
  online: "success",
  offline: "destructive", 
  warning: "secondary",
  maintenance: "outline"
} as const;

const criticalityColors = {
  low: "success",
  medium: "warning",
  high: "high",
  critical: "critical",
} as const;

export const ComponentsManagement = () => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);
  const addComponent = useItiacStore((s) => s.addComponent);
  const updateComponent = useItiacStore((s) => s.updateComponent);
  const deleteComponent = useItiacStore((s) => s.deleteComponent);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [impactedOnly, setImpactedOnly] = useState<boolean>(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ITComponent | null>(null);
  const [sortBy, setSortBy] = useState<'name'|'type'|'status'|'criticality'|'location'|'vendor'|'owner'|'lastUpdated'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [headerElevated, setHeaderElevated] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ITComponent | null>(null);

  // Parse hash parameters for pre-filters e.g. #components?impacted=1&focus=<id>
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      if (hash.startsWith('#components')) {
        const q = hash.split('?')[1] || '';
        const params = new URLSearchParams(q);
        const impacted = params.get('impacted');
        const root = params.get('root');
        const focus = params.get('focus');
        if (impacted === '1') setImpactedOnly(true);
        if (root) {
          // Optionally restrict by root by setting searchTerm to root name
          const rc = components.find(c => c.id === root);
          if (rc) setSearchTerm(rc.name);
        }
        if (focus) setFocusId(focus);
      }
    } catch {}
  }, [components]);

  // Scroll focused row into view when set by deep link
  useEffect(() => {
    try {
      if (focusId) {
        const el = document.getElementById(`row-${focusId}`);
        if (el) el.scrollIntoView({ block: 'center' });
      }
    } catch {}
  }, [focusId]);

  // Compute impacted components via shared downstream-only utility
  const impactedIds = computeImpactedFromOfflines(components, dependencies);

  // Build immediate cause map for impacted components from offline roots
  const impactCauseMap = useMemo(() => {
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
            // Only set if not set, or if this path is shallower
            const prev = map.get(nxt);
            if (!prev || depth + 1 < prev.depth) {
              map.set(nxt, { causeId: id, depth: depth + 1 });
            }
            if (!visitedGlobal.has(nxt)) queue.push({ id: nxt, depth: depth + 1 });
          }
        }
      }
      offlineRoots.forEach(r => visitedGlobal.add(r));
    }
    return map;
  }, [components, dependencies]);

  const filteredComponents = components.filter(component => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = component.name.toLowerCase().includes(q) ||
                         component.description?.toLowerCase().includes(q) ||
                         component.vendor?.toLowerCase().includes(q);
    const matchesType = filterType === "all" || component.type === filterType;
    const matchesStatus = filterStatus === "all" || component.status === filterStatus;
    const matchesImpacted = !impactedOnly || impactedIds.has(component.id) || component.status === 'offline';
    
    return matchesSearch && matchesType && matchesStatus && matchesImpacted;
  });

  const sortedComponents = [...filteredComponents].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const get = (c: ITComponent) => {
      switch (sortBy) {
        case 'lastUpdated': return new Date(c.lastUpdated as any).getTime();
        case 'name': return c.name.toLowerCase();
        case 'type': return c.type.toLowerCase();
        case 'status': return c.status.toLowerCase();
        case 'criticality': return c.criticality.toLowerCase();
        case 'location': return (c.location || '').toLowerCase();
        case 'vendor': return (c.vendor || '').toLowerCase();
        case 'owner': return (c.owner || '').toLowerCase();
        default: return '';
      }
    };
    const va = get(a);
    const vb = get(b);
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
  });

  const headerSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortIndicator = (key: typeof sortBy) => sortBy === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">IT Assets Management</h1>
          <p className="page-subtitle">Manage IT assets and their configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            title="Add IT Asset"
            aria-label="Add IT Asset"
            onClick={() => setIsDialogOpen(true)}
            className="hover:bg-primary/80 hover:saturate-150 focus-visible:ring-primary/60"
          >
            <Plus className="w-3 h-3" />
            Add IT Asset
          </Button>
        </div>
        
        <ComponentForm
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingComponent(null);
          }}
          onSave={(component) => {
            const { name, type, status, criticality, description, location, owner, vendor, metadata, helpdeskEmail } = component;
            if (editingComponent) {
              // Pass only patchable fields (no id, no lastUpdated)
              updateComponent(component.id, {
                name,
                type,
                status,
                criticality,
                description,
                location,
                owner,
                vendor,
                // keep metadata merge in store, include helpdeskEmail hint
                metadata,
                helpdeskEmail
              });
            } else {
              // Create with only allowed fields
              addComponent({
                name,
                type,
                status,
                criticality,
                description,
                location,
                owner,
                vendor,
                // keep metadata merge in store, include helpdeskEmail hint
                metadata: metadata || {},
                helpdeskEmail
              } as any);
            }
          }}
          component={editingComponent || undefined}
          isEdit={!!editingComponent}
        />

        {/* Confirm Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete IT Asset</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete
                {" "}
                <span className="font-medium text-foreground">
                  {deleteTarget?.name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deleteTarget) deleteComponent(deleteTarget.id);
                  setIsDeleteOpen(false);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search IT assets..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="backup">Backup</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="cloud-instance">Cloud Instance</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="domain">Domain</SelectItem>
                <SelectItem value="endpoint">Endpoint</SelectItem>
                <SelectItem value="firewall">Firewall</SelectItem>
                <SelectItem value="license">License</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="router">Router</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="switch">Switch</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="user-account">User Account</SelectItem>
                <SelectItem value="virtual-machine">Virtual Machine</SelectItem>
                <SelectItem value="modul">Modul</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <input
                type="checkbox"
                checked={impactedOnly}
                onChange={(e) => setImpactedOnly(e.target.checked)}
              />
              Impacted only
            </label>
          </div>
        </CardContent>
      </Card>

      {/* IT Assets Table */}
      <Card className="bg-card border-border shadow-depth mb-0 overflow-hidden flex-1 flex flex-col min-h-0">
        <CardHeader className="pl-4 pr-0">
          <CardTitle className="section-title flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary" />
            <span>IT Assets ({filteredComponents.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <div
            className="max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-hidden"
            onScroll={(e) => {
              const scrolled = (e.target as HTMLDivElement).scrollTop > 0;
              if (scrolled !== headerElevated) setHeaderElevated(scrolled);
            }}
          >
          <Table className="w-full table-edge-tight table-collapse compact-tables text-xs table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead
                  className={`cursor-pointer w-[34%] sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('name')}
                >
                  IT Asset{sortIndicator('name')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[7%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('type')}
                >
                  Type{sortIndicator('type')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[7%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('status')}
                >
                  Status{sortIndicator('status')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[7%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('criticality')}
                >
                  Criticality{sortIndicator('criticality')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[7%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('location')}
                >
                  Location{sortIndicator('location')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[7%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('vendor')}
                >
                  Vendor{sortIndicator('vendor')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[7%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('owner')}
                >
                  Owner{sortIndicator('owner')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer w-[8%] px-2 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('lastUpdated')}
                >
                  Last Updated{sortIndicator('lastUpdated')}
                </TableHead>
                <TableHead
                  className={`text-right w-[10%] px-2 pr-3 sticky top-0 z-10 bg-card border-b border-border text-xs ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedComponents.map((component) => {
                const Icon = componentIcons[component.type];
                const impacted = impactedIds.has(component.id) && component.status === 'online';
                const causeId = impactCauseMap.get(component.id)?.causeId;
                const causeName = causeId ? components.find(c => c.id === causeId)?.name : undefined;
                return (
                  <TableRow key={component.id} id={`row-${component.id}`}>
                    <TableCell className="w-[34%]">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0">
                          <label className="switch" title={component.status === 'offline' ? 'Bring Online' : 'Mark as Down (offline)'}>
                            <input
                              type="checkbox"
                              checked={component.status !== 'offline'}
                              onChange={(e) => {
                                const makeOnline = e.target.checked;
                                updateComponent(component.id, { status: makeOnline ? 'online' : 'offline' });
                              }}
                              aria-label={component.status === 'offline' ? 'Bring Online' : 'Mark as Down'}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 max-w-full">
                          <div className="font-medium text-foreground truncate text-sm">{component.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{component.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs w-[7%] px-2 truncate">
                      <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">
                        {component.type.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs w-[7%] px-2 truncate">
                      <div className="flex items-center gap-2">
                        {impacted ? (
                          <>
                            <Badge 
                              variant="warning" 
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              Impacted
                            </Badge>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle 
                                    className="w-3.5 h-3.5 cursor-help"
                                    style={{ color: 'hsl(var(--warning))' }}
                                    aria-label="Impacted details"
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {causeName ? `Impacted by ${causeName}` : 'Impacted by downstream outage'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        ) : (
                          <Badge variant={statusColors[component.status]} className="capitalize text-xs px-2 py-0.5">
                            {component.status}
                          </Badge>
                        )}
                        {impactedOnly && component.status === 'offline' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Root</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs w-[7%] px-2 truncate">
                      <Badge variant={criticalityColors[component.criticality]} className="capitalize text-xs px-2 py-0.5">
                        {component.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground w-[7%] px-2 truncate" title={component.location}>
                      {component.location}
                    </TableCell>
                    <TableCell className="text-muted-foreground w-[7%] px-2 truncate" title={component.vendor}>
                      {component.vendor}
                    </TableCell>
                    <TableCell className="text-muted-foreground w-[7%] px-2 truncate" title={component.owner}>
                      {component.owner}
                    </TableCell>
                    <TableCell className="text-muted-foreground w-[8%] px-2 truncate">
                      {new Date(component.lastUpdated as any).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-[10%] px-2 pr-3">
                      <div className="w-full flex items-center justify-end gap-1 whitespace-nowrap">
                        <Button
                          variant="default"
                          size="sm"
                          title="Edit"
                          aria-label={`Edit ${component.name}`}
                          onClick={() => {
                            setEditingComponent(component);
                            setIsDialogOpen(true);
                          }}
                          className="w-[88px] hover:bg-primary/80 hover:saturate-150 focus-visible:ring-primary/60"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          title="Delete"
                          aria-label={`Delete ${component.name}`}
                          onClick={() => { setDeleteTarget(component); setIsDeleteOpen(true); }}
                          className="w-[88px] hover:bg-destructive/80 hover:saturate-150 focus-visible:ring-destructive/60"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};