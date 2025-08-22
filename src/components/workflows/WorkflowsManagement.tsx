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
import { Plus, GitBranch, Users, Search, ArrowRight, Pencil, Trash2, ChevronRight } from "lucide-react";

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
  const [initialEditingStepId, setInitialEditingStepId] = useState<string | undefined>(undefined);

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
    <div className="flex flex-col h-full min-h-0 overflow-hidden gap-4 overscroll-none">
      {/* Header */}
      <div className="flex justify-between items-center flex-none">
        <div>
          <h1 className="page-title">Business Processes</h1>
          <p className="page-subtitle">Define and manage business processes and their workflows</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsFormOpen(true)} size="default">
            <Plus className="w-5 h-5 mr-2" />
            Create Process
          </Button>
        </div>
        
        <WorkflowForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingWorkflow(null);
            setInitialEditingStepId(undefined);
          }}
          onSave={(workflow) => {
            if (editingWorkflow) {
              updateWorkflow(workflow.id, workflow);
            } else {
              addWorkflow(workflow);
            }
            setInitialEditingStepId(undefined);
          }}
          workflow={editingWorkflow || undefined}
          components={components}
          isEdit={!!editingWorkflow}
          initialEditingStepId={initialEditingStepId}
        />
      </div>

      {/* Stats removed as per request */}

      {/* Filters */}
      <Card className="bg-card border-border flex-none">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] items-stretch gap-6 min-h-0 flex-1 min-w-0 overflow-hidden">
        {/* Workflows Table */}
        <Card className="lg:col-span-1 bg-card border-border shadow-depth flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="section-title flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <span>Business Processes ({filteredWorkflows.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto overscroll-none">
            <div className="h-full max-h-full overflow-y-auto overscroll-none">
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
                        className={(selectedWorkflow?.id === workflow.id ? "bg-primary/5 " : "") + "cursor-pointer hover:bg-accent/10"}
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{workflow.name}</div>
                            <div className="text-sm text-muted-foreground">{workflow.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={criticalityColors[workflow.criticality]} className="capitalize text-xs px-2 py-0.5">
                            {workflow.criticality}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={riskLevel === "high" ? "destructive" : riskLevel === "medium" ? "secondary" : "default"}
                            className="capitalize text-xs px-2 py-0.5"
                          >
                            {riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{workflow.steps.length}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingWorkflow(workflow);
                                setIsFormOpen(true);
                              }}
                              aria-label="Edit process"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); deleteWorkflow(workflow.id); }}
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete process"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Process Details */}
        <Card className="lg:col-span-1 bg-card border-border shadow-depth flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="section-title flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Process Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 min-w-0 overflow-hidden overscroll-none flex flex-col">
            {selectedWorkflow ? (
              <>
                <div className="flex-none">
                  <h3 className="font-semibold text-foreground">{selectedWorkflow.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedWorkflow.description}</p>
                </div>

                <div className="flex items-center space-x-4 flex-none mt-2">
                  <Badge variant={criticalityColors[selectedWorkflow.criticality]} className="text-base px-3.5 py-1.5 capitalize">
                    {selectedWorkflow.criticality}
                  </Badge>
                </div>

                <div className="flex-1 min-h-0 mt-4">
                  <h4 className="font-medium text-foreground mb-3">Process Steps</h4>
                  <div className="h-full max-h-full overflow-y-auto overscroll-none space-y-2 pr-1 pb-2">
                    {selectedWorkflow.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step) => {
                        const primaryIds = (step.primaryComponentIds && step.primaryComponentIds.length > 0)
                          ? step.primaryComponentIds
                          : (step.primaryComponentId ? [step.primaryComponentId] : []);
                        return (
                          <div
                            key={step.id}
                            className="group flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/10 transition cursor-pointer"
                            onClick={() => {
                              if (!selectedWorkflow) return;
                              setEditingWorkflow(selectedWorkflow);
                              setInitialEditingStepId(step.id);
                              setIsFormOpen(true);
                            }}
                          >
                            <div className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium grid place-items-center">
                              {step.order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium text-foreground truncate">{step.name}</div>
                                  {step.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                                      {step.description}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                              </div>
                              <div className="mt-2 text-[11px] text-muted-foreground">
                                <span className="font-medium">Primary IT Assets:</span>
                                <span className="sr-only"> </span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {primaryIds.map(pid => (
                                    <Badge key={pid} variant="secondary" className="text-[11px] px-2 py-0.5">
                                      {getComponentName(pid)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              {step.alternativeComponentIds && step.alternativeComponentIds.length > 0 && (
                                <div className="mt-2 text-[11px] text-muted-foreground">
                                  <span className="font-medium">Alternative IT Assets:</span>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {step.alternativeComponentIds.map(aid => (
                                      <Badge key={aid} variant="outline" className="text-[11px] px-2 py-0.5">
                                        {getComponentName(aid)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="pt-4 flex-none mt-4">
                  <div className="text-sm text-muted-foreground">
                    <div>Owner: {selectedWorkflow.owner}</div>
                    <div>Last Updated: {new Date(selectedWorkflow.lastUpdated as any).toLocaleDateString()}</div>
                  </div>
                </div>
              </>
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