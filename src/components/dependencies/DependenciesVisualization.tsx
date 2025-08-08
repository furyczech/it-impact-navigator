import { useState, useCallback } from "react";
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
import { Network, GitBranch, AlertTriangle, Zap, Plus } from "lucide-react";
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
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "critical" | "offline">("all");
  const [isDepDialogOpen, setIsDepDialogOpen] = useState(false);
  const [newDependency, setNewDependency] = useState({ sourceId: "", targetId: "", type: "", criticality: "" });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dependencies Visualization</h1>
          <p className="text-muted-foreground mt-1">Visualize and manage component dependencies</p>
        </div>
        <div className="flex space-x-3">
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
                <p className="text-sm text-muted-foreground">Total Dependencies</p>
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
                <p className="text-sm text-muted-foreground">Critical Paths</p>
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
                <p className="text-sm text-muted-foreground">Single Points of Failure</p>
                <p className="text-2xl font-bold text-foreground">3</p>
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
                <p className="text-sm text-muted-foreground">Network Health</p>
                <p className="text-2xl font-bold text-foreground">98%</p>
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
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
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
    </div>
  );
};