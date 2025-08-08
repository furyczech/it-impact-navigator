import { useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ITComponent } from "@/types/itiac";
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
  const addComponent = useItiacStore((s) => s.addComponent);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComponent, setNewComponent] = useState({ name: "", type: "", criticality: "" });

  const filteredComponents = components.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || component.type === filterType;
    const matchesStatus = filterStatus === "all" || component.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Components Management</h1>
          <p className="text-muted-foreground mt-1">Manage IT components and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Component</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input 
                placeholder="Component name" 
                value={newComponent.name}
                onChange={(e) => setNewComponent({...newComponent, name: e.target.value})}
              />
              <Select value={newComponent.type} onValueChange={(value) => setNewComponent({...newComponent, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="load-balancer">Load Balancer</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newComponent.criticality} onValueChange={(value) => setNewComponent({...newComponent, criticality: value})}>
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (newComponent.name && newComponent.type && newComponent.criticality) {
                    const component: ITComponent = {
                      id: Date.now().toString(),
                      name: newComponent.name,
                      type: newComponent.type as any,
                      status: "online",
                      criticality: newComponent.criticality as any,
                      description: `New ${newComponent.type} component`,
                      location: "Data Center A",
                      owner: "System Admin",
                      lastUpdated: new Date()
                    };
                    addComponent(component);
                    setNewComponent({ name: "", type: "", criticality: "" });
                    setIsDialogOpen(false);
                  }
                }}>Create Component</Button>
              </div>
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
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="load-balancer">Load Balancer</SelectItem>
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
                <TableHead>Component</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComponents.map((component) => {
                const Icon = componentIcons[component.type];
                return (
                  <TableRow key={component.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{component.name}</div>
                          <div className="text-sm text-muted-foreground">{component.description}</div>
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
                    <TableCell className="text-muted-foreground">{component.owner}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(component.lastUpdated as any).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm">Dependencies</Button>
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