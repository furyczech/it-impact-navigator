import { useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ITComponent } from "@/types/itiac";
import { ComponentForm } from "@/components/forms/ComponentForm";
import { ExportService } from "@/services/exportService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Plus, Search, Server, Database, Globe, Zap, Network, Code, Settings } from "lucide-react";


const componentIcons = {
  server: Server,
  database: Database,
  api: Globe,
  'load-balancer': Zap,
  network: Network,
  application: Code,
  service: Settings
};

const statusColors = {
  online: "default",
  offline: "destructive", 
  warning: "secondary",
  maintenance: "outline"
} as const;

const criticalityColors = {
  low: "outline",
  medium: "default",
  high: "secondary", 
  critical: "destructive"
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
          <h1 className="text-3xl font-bold text-foreground">Components Management</h1>
          <p className="text-muted-foreground mt-1">Manage IT components and their configurations</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
          <Button variant="outline" onClick={() => ExportService.exportFullBackup(components, dependencies, workflows)}>
            Export JSON
          </Button>
        </div>
        
        <ComponentForm
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingComponent(null);
          }}
          onSave={(component) => {
            if (editingComponent) {
              updateComponent(component.id, component);
            } else {
              addComponent(component);
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
                  placeholder="Search components..."
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
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="service">Service</SelectItem>
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

      {/* Components Table */}
      <Card className="bg-card border-border shadow-depth">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary" />
            <span>Components ({filteredComponents.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => headerSort('name')}>Component{sortIndicator('name')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('type')}>Type{sortIndicator('type')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('status')}>Status{sortIndicator('status')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('criticality')}>Criticality{sortIndicator('criticality')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('location')}>Location{sortIndicator('location')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('vendor')}>Vendor{sortIndicator('vendor')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('owner')}>Owner{sortIndicator('owner')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => headerSort('lastUpdated')}>Last Updated{sortIndicator('lastUpdated')}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedComponents.map((component) => {
                const Icon = componentIcons[component.type];
                return (
                  <TableRow key={component.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {component.status !== 'offline' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateComponent(component.id, { status: 'offline' })}
                              className="border-destructive text-destructive hover:text-destructive"
                              title="Mark as Down (offline)"
                            >
                              Mark as Down
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateComponent(component.id, { status: 'online' })}
                              className="border-success text-success hover:text-success"
                              title="Bring Online"
                            >
                              Mark as Online
                            </Button>
                          )}
                        </div>
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{component.name}</div>
                          <div className="text-sm text-muted-foreground truncate">{component.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {component.type.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[component.status]} className="capitalize">
                        {component.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={criticalityColors[component.criticality]} className="capitalize">
                        {component.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{component.location}</TableCell>
                    <TableCell className="text-muted-foreground">{component.vendor}</TableCell>
                    <TableCell className="text-muted-foreground">{component.owner}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(component.lastUpdated as any).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingComponent(component);
                            setIsDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteComponent(component.id)}
                          className="text-destructive hover:text-destructive"
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
        </CardContent>
      </Card>
    </div>
  );
};