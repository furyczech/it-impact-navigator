import { useState } from "react";
import { BusinessWorkflow, WorkflowStep, ITComponent } from "@/types/itiac";
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
import { Plus, GitBranch, Users, AlertTriangle, CheckCircle, Search, ArrowRight } from "lucide-react";

// Mock data
const mockComponents: ITComponent[] = [
  { id: "1", name: "Database Cluster", type: "database", status: "online", criticality: "critical", lastUpdated: new Date() },
  { id: "2", name: "API Gateway", type: "api", status: "online", criticality: "high", lastUpdated: new Date() },
  { id: "3", name: "Payment Service", type: "service", status: "online", criticality: "critical", lastUpdated: new Date() }
];

const mockWorkflows: BusinessWorkflow[] = [
  {
    id: "1",
    name: "Customer Order Processing",
    description: "End-to-end customer order processing workflow",
    businessProcess: "Sales",
    criticality: "critical",
    owner: "Sales Team",
    lastUpdated: new Date("2024-01-15"),
    steps: [
      {
        id: "s1",
        name: "Order Validation",
        description: "Validate customer order details",
        primaryComponentId: "2",
        alternativeComponentIds: [],
        order: 1
      },
      {
        id: "s2", 
        name: "Payment Processing",
        description: "Process customer payment",
        primaryComponentId: "3",
        alternativeComponentIds: [],
        order: 2
      },
      {
        id: "s3",
        name: "Order Storage",
        description: "Store order in database",
        primaryComponentId: "1",
        alternativeComponentIds: [],
        order: 3
      }
    ]
  },
  {
    id: "2",
    name: "User Registration",
    description: "New user registration process",
    businessProcess: "Customer Management",
    criticality: "high",
    owner: "Customer Success Team",
    lastUpdated: new Date("2024-01-14"),
    steps: [
      {
        id: "s4",
        name: "Data Validation",
        description: "Validate user registration data",
        primaryComponentId: "2",
        alternativeComponentIds: [],
        order: 1
      },
      {
        id: "s5",
        name: "Account Creation",
        description: "Create user account in database",
        primaryComponentId: "1",
        alternativeComponentIds: [],
        order: 2
      }
    ]
  }
];

const criticalityColors = {
  low: "outline",
  medium: "default",
  high: "secondary", 
  critical: "destructive"
} as const;

export const WorkflowsManagement = () => {
  const [workflows] = useState<BusinessWorkflow[]>(mockWorkflows);
  const [components] = useState<ITComponent[]>(mockComponents);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCriticality, setFilterCriticality] = useState<string>("all");
  const [selectedWorkflow, setSelectedWorkflow] = useState<BusinessWorkflow | null>(null);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.businessProcess.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCriticality = filterCriticality === "all" || workflow.criticality === filterCriticality;
    
    return matchesSearch && matchesCriticality;
  });

  const getComponentName = (componentId?: string) => {
    if (!componentId) return "N/A";
    const component = components.find(c => c.id === componentId);
    return component?.name || "Unknown Component";
  };

  const getWorkflowRisk = (workflow: BusinessWorkflow) => {
    // Simple risk calculation based on critical components
    const criticalSteps = workflow.steps.filter(step => {
      const component = components.find(c => c.id === step.primaryComponentId);
      return component?.criticality === "critical";
    });
    
    if (criticalSteps.length === workflow.steps.length) return "high";
    if (criticalSteps.length > 0) return "medium";
    return "low";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflows Management</h1>
          <p className="text-muted-foreground mt-1">Define and manage business process workflows</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Workflow name" />
              <Input placeholder="Business process" />
              <Select>
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
                <Button variant="outline">Cancel</Button>
                <Button>Create Workflow</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
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
                <p className="text-sm text-muted-foreground">Critical Workflows</p>
                <p className="text-2xl font-bold text-foreground">
                  {workflows.filter(w => w.criticality === "critical").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Healthy Workflows</p>
                <p className="text-2xl font-bold text-foreground">
                  {workflows.filter(w => getWorkflowRisk(w) === "low").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Processes</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(workflows.map(w => w.businessProcess)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search workflows..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterCriticality} onValueChange={setFilterCriticality}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Criticality</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows Table */}
        <Card className="lg:col-span-2 bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <span>Business Workflows ({filteredWorkflows.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Business Process</TableHead>
                  <TableHead>Criticality</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.map((workflow) => {
                  const riskLevel = getWorkflowRisk(workflow);
                  return (
                    <TableRow 
                      key={workflow.id}
                      className={selectedWorkflow?.id === workflow.id ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{workflow.name}</div>
                          <div className="text-sm text-muted-foreground">{workflow.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{workflow.businessProcess}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={criticalityColors[workflow.criticality]} className="capitalize">
                          {workflow.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={riskLevel === "high" ? "destructive" : riskLevel === "medium" ? "secondary" : "default"}
                          className="capitalize"
                        >
                          {riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{workflow.steps.length}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedWorkflow(workflow)}
                          >
                            View
                          </Button>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Workflow Details */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Workflow Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedWorkflow ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedWorkflow.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedWorkflow.description}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Badge variant={criticalityColors[selectedWorkflow.criticality]}>
                    {selectedWorkflow.criticality}
                  </Badge>
                  <Badge variant="outline">{selectedWorkflow.businessProcess}</Badge>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Workflow Steps</h4>
                  <div className="space-y-3">
                    {selectedWorkflow.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <div key={step.id} className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                            {step.order}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{step.name}</div>
                            <div className="text-sm text-muted-foreground">{step.description}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center space-x-1">
                              <span>Primary:</span>
                              <Badge variant="outline" className="text-xs">
                                {getComponentName(step.primaryComponentId)}
                              </Badge>
                            </div>
                          </div>
                          {index < selectedWorkflow.steps.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    <div>Owner: {selectedWorkflow.owner}</div>
                    <div>Last Updated: {selectedWorkflow.lastUpdated.toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a workflow to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};