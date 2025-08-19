import { useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { BusinessWorkflow, WorkflowStep, ITComponent } from "@/types/itiac";
import { WorkflowForm } from "@/components/forms/WorkflowForm";
// removed ExportService (no longer used)
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
import { Plus, GitBranch, Users, Search, ArrowRight } from "lucide-react";


const criticalityColors = {
  low: "success",
  medium: "warning",
  high: "high",
  critical: "critical",
} as const;

export const WorkflowsManagement = () => {
  const workflows = useItiacStore((s) => s.workflows);
  const components = useItiacStore((s) => s.components);
  const addWorkflow = useItiacStore((s) => s.addWorkflow);
  const updateWorkflow = useItiacStore((s) => s.updateWorkflow);
  const deleteWorkflow = useItiacStore((s) => s.deleteWorkflow);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCriticality, setFilterCriticality] = useState<string>("all");
  const [selectedWorkflow, setSelectedWorkflow] = useState<BusinessWorkflow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<BusinessWorkflow | null>(null);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.businessProcess.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCriticality = filterCriticality === "all" || workflow.criticality === filterCriticality;
    
    return matchesSearch && matchesCriticality;
  });

  const getComponentName = (componentId?: string) => {
    if (!componentId) return "N/A";
    const component = components.find(c => c.id === componentId);
    return component?.name || "Unknown IT Asset";
  };

  const getWorkflowRisk = (workflow: BusinessWorkflow) => {
    // Simple risk calculation based on critical primary components (supports multi-primary)
    const criticalSteps = workflow.steps.filter(step => {
      const primaryIds = (step.primaryComponentIds && step.primaryComponentIds.length > 0)
        ? step.primaryComponentIds
        : (step.primaryComponentId ? [step.primaryComponentId] : []);
      return primaryIds.some(pid => components.find(c => c.id === pid)?.criticality === "critical");
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
          <h1 className="text-3xl font-bold text-foreground">Business Processes</h1>
          <p className="text-muted-foreground mt-1">Define and manage business processes and their workflows</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsFormOpen(true)}
            className="uiv-glow-btn uiv-glow-blue uiv-glow-wide text-base inline-flex items-center whitespace-nowrap"
            title="Create Process"
            aria-label="Create Process"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Process
          </button>
        </div>
        
        <WorkflowForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingWorkflow(null);
          }}
          onSave={(workflow) => {
            if (editingWorkflow) {
              updateWorkflow(workflow.id, workflow);
            } else {
              addWorkflow(workflow);
            }
          }}
          workflow={editingWorkflow || undefined}
          components={components}
          isEdit={!!editingWorkflow}
        />
      </div>

      {/* Stats removed as per request */}

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search processes..."
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
              <span>Business Processes ({filteredWorkflows.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
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
                        <Badge variant={criticalityColors[workflow.criticality]} className="capitalize text-base px-3.5 py-1.5">
                          {workflow.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={riskLevel === "high" ? "destructive" : riskLevel === "medium" ? "secondary" : "default"}
                          className="capitalize text-base px-3.5 py-1.5"
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingWorkflow(workflow);
                              setIsFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteWorkflow(workflow.id)}
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

        {/* Process Details */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Process Details</span>
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
                  <Badge variant={criticalityColors[selectedWorkflow.criticality]} className="text-base px-3.5 py-1.5 capitalize">
                    {selectedWorkflow.criticality}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Process Steps</h4>
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
                              <span>Primary IT Assets:</span>
                              <div className="flex flex-wrap gap-1">
                                {(((step.primaryComponentIds && step.primaryComponentIds.length > 0)
                                  ? step.primaryComponentIds
                                  : (step.primaryComponentId ? [step.primaryComponentId] : [])) as string[])
                                  .map(pid => (
                                    <Badge key={pid} variant="outline" className="text-xs">
                                      {getComponentName(pid)}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                            {step.alternativeComponentIds && step.alternativeComponentIds.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center space-x-1">
                                <span>Alternative IT Assets:</span>
                                <div className="flex flex-wrap gap-1">
                                  {step.alternativeComponentIds.map(aid => (
                                    <Badge key={aid} variant="secondary" className="text-xs">
                                      {getComponentName(aid)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
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
                    <div>Last Updated: {new Date(selectedWorkflow.lastUpdated as any).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a process to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};