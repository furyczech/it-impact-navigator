import { useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ITComponent } from "@/types/itiac";
import { ComponentForm } from "@/components/forms/ComponentForm";
import { ExportService } from "@/services/exportService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Server, Database, Globe, Zap, Network, Code, Settings, HardDrive, Plug, Cpu, Shield, Cloud, BadgeCheck, User, Archive, Puzzle } from "lucide-react";


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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ITComponent | null>(null);
  const [sortBy, setSortBy] = useState<'name'|'type'|'status'|'criticality'|'location'|'vendor'|'owner'|'lastUpdated'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [headerElevated, setHeaderElevated] = useState(false);

  const filteredComponents = components.filter(component => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = component.name.toLowerCase().includes(q) ||
                         component.description?.toLowerCase().includes(q) ||
                         component.vendor?.toLowerCase().includes(q);
    const matchesType = filterType === "all" || component.type === filterType;
    const matchesStatus = filterStatus === "all" || component.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">IT Assets Management</h1>
          <p className="text-muted-foreground mt-1">Manage IT assets and their configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="uiv-glow-btn uiv-glow-blue uiv-glow-wide text-base inline-flex items-center whitespace-nowrap"
            title="Add IT Asset"
            aria-label="Add IT Asset"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add IT Asset
          </button>
        </div>
        
        <ComponentForm
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingComponent(null);
          }}
          onSave={(component) => {
            const { name, type, status, criticality, description, location, owner, vendor, metadata } = component;
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
                metadata
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
                metadata: metadata || {}
              });
            }
          }}
          component={editingComponent || undefined}
          isEdit={!!editingComponent}
        />
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
          </div>
        </CardContent>
      </Card>

      {/* IT Assets Table */}
      <Card className="bg-card border-border shadow-depth">
        <CardHeader className="pl-4 pr-0">
          <CardTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary" />
            <span>IT Assets ({filteredComponents.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div
            className="h-[70vh] overflow-auto"
            onScroll={(e) => {
              const scrolled = (e.target as HTMLDivElement).scrollTop > 0;
              if (scrolled !== headerElevated) setHeaderElevated(scrolled);
            }}
          >
          <Table className="w-full table-edge-tight table-collapse">
            <TableHeader>
              <TableRow>
                <TableHead
                  className={`cursor-pointer w-[420px] sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('name')}
                >
                  IT Asset{sortIndicator('name')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('type')}
                >
                  Type{sortIndicator('type')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('status')}
                >
                  Status{sortIndicator('status')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('criticality')}
                >
                  Criticality{sortIndicator('criticality')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('location')}
                >
                  Location{sortIndicator('location')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('vendor')}
                >
                  Vendor{sortIndicator('vendor')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('owner')}
                >
                  Owner{sortIndicator('owner')}
                </TableHead>
                <TableHead
                  className={`cursor-pointer sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}
                  onClick={() => headerSort('lastUpdated')}
                >
                  Last Updated{sortIndicator('lastUpdated')}
                </TableHead>
                <TableHead className={`w-[140px] sticky top-0 z-10 bg-card border-b border-border ${headerElevated ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : ''}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedComponents.map((component) => {
                const Icon = componentIcons[component.type];
                return (
                  <TableRow key={component.id}>
                    <TableCell className="w-[420px]">
                      <div className="flex items-center gap-3">
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
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 max-w-[420px]">
                          <div className="font-medium text-foreground truncate">{component.name}</div>
                          <div className="text-sm text-muted-foreground truncate">{component.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">
                      <Badge variant="outline" className="capitalize text-base px-3.5 py-1.5">
                        {component.type.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base">
                      <Badge variant={statusColors[component.status]} className="capitalize text-lg px-4 py-2">
                        {component.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base">
                      <Badge variant={criticalityColors[component.criticality]} className="capitalize text-base px-3.5 py-1.5">
                        {component.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{component.location}</TableCell>
                    <TableCell className="text-muted-foreground">{component.vendor}</TableCell>
                    <TableCell className="text-muted-foreground">{component.owner}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(component.lastUpdated as any).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-[140px]">
                      <div className="flex items-center gap-2">
                        <button
                          className="uiv-glow-btn uiv-glow-blue"
                          title="Edit"
                          aria-label={`Edit ${component.name}`}
                          onClick={() => {
                            setEditingComponent(component);
                            setIsDialogOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="uiv-glow-btn uiv-glow-red ml-2"
                          title="Delete"
                          aria-label={`Delete ${component.name}`}
                          onClick={() => deleteComponent(component.id)}
                        >
                          Delete
                        </button>
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