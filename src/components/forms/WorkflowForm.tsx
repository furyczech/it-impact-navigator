import { useState } from "react";
import { BusinessWorkflow, WorkflowStep, ITComponent } from "@/types/itiac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface WorkflowFormProps {
  workflow?: BusinessWorkflow;
  components: ITComponent[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (workflow: BusinessWorkflow) => void;
  isEdit?: boolean;
}

export const WorkflowForm = ({ workflow, components, isOpen, onClose, onSave, isEdit = false }: WorkflowFormProps) => {
  const [formData, setFormData] = useState({
    name: workflow?.name || "",
    description: workflow?.description || "",
    businessProcess: workflow?.businessProcess || "",
    criticality: workflow?.criticality || "medium",
    owner: workflow?.owner || ""
  });

  const [steps, setSteps] = useState<WorkflowStep[]>(
    workflow?.steps || []
  );

  const [newStep, setNewStep] = useState({
    name: "",
    description: "",
    primaryComponentId: "",
    alternativeComponentIds: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.businessProcess.trim()) newErrors.businessProcess = "Business process is required";
    if (!formData.criticality) newErrors.criticality = "Criticality is required";
    if (steps.length === 0) newErrors.steps = "At least one step is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const newWorkflow: BusinessWorkflow = {
      id: workflow?.id || Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      businessProcess: formData.businessProcess.trim(),
      criticality: formData.criticality as BusinessWorkflow['criticality'],
      owner: formData.owner.trim(),
      lastUpdated: new Date(),
      steps: steps.map((step, index) => ({
        ...step,
        order: index + 1
      }))
    };

    onSave(newWorkflow);
    onClose();
    
    if (!isEdit) {
      setFormData({
        name: "",
        description: "",
        businessProcess: "",
        criticality: "medium",
        owner: ""
      });
      setSteps([]);
    }
  };

  const addStep = () => {
    if (!newStep.name.trim() || !newStep.primaryComponentId) return;

    const step: WorkflowStep = {
      id: Date.now().toString(),
      name: newStep.name.trim(),
      description: newStep.description.trim(),
      primaryComponentId: newStep.primaryComponentId,
      alternativeComponentIds: newStep.alternativeComponentIds,
      order: steps.length + 1
    };

    setSteps([...steps, step]);
    setNewStep({
      name: "",
      description: "",
      primaryComponentId: "",
      alternativeComponentIds: []
    });
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
    setSteps(newSteps);
  };

  const getComponentName = (componentId: string) => {
    return components.find(c => c.id === componentId)?.name || "Unknown";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Workflow" : "Create New Workflow"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Workflow name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessProcess">Business Process *</Label>
              <Input
                id="businessProcess"
                value={formData.businessProcess}
                onChange={(e) => setFormData(prev => ({ ...prev, businessProcess: e.target.value }))}
                placeholder="e.g., Sales, HR, Finance"
                className={errors.businessProcess ? "border-destructive" : ""}
              />
              {errors.businessProcess && <p className="text-sm text-destructive">{errors.businessProcess}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="criticality">Criticality *</Label>
              <Select value={formData.criticality} onValueChange={(value: "low" | "medium" | "high" | "critical") => setFormData(prev => ({ ...prev, criticality: value }))}>
                <SelectTrigger className={errors.criticality ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              {errors.criticality && <p className="text-sm text-destructive">{errors.criticality}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                placeholder="e.g., Sales Team"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Workflow description..."
                rows={3}
              />
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Workflow Steps</h3>
            
            {/* Add Step Form */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Input
                  placeholder="Step name"
                  value={newStep.name}
                  onChange={(e) => setNewStep(prev => ({ ...prev, name: e.target.value }))}
                />
                <Select 
                  value={newStep.primaryComponentId} 
                  onValueChange={(value) => setNewStep(prev => ({ ...prev, primaryComponentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Primary component" />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map(component => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name} ({component.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-3">
                <Textarea
                  placeholder="Step description (optional)"
                  value={newStep.description}
                  onChange={(e) => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <Button onClick={addStep} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>

            {/* Steps List */}
            {steps.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Order</TableHead>
                      <TableHead>Step Name</TableHead>
                      <TableHead>Primary Component</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {steps.map((step, index) => (
                      <TableRow key={step.id}>
                        <TableCell>
                          <Badge variant="outline">{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{step.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getComponentName(step.primaryComponentId || "")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {step.description || "No description"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStep(step.id, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStep(step.id, 'down')}
                              disabled={index === steps.length - 1}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(step.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {errors.steps && <p className="text-sm text-destructive">{errors.steps}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {isEdit ? "Update Workflow" : "Create Workflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};