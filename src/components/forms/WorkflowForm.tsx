import { useEffect, useState } from "react";
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
import { Plus, Trash2, ArrowUp, ArrowDown, X, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
    name: workflow?.name || (workflow as any)?.businessProcess || "",
    description: workflow?.description || "",
    criticality: workflow?.criticality || "medium",
    owner: workflow?.owner || ""
  });

  const [steps, setSteps] = useState<WorkflowStep[]>(
    workflow?.steps || []
  );

  const [newStep, setNewStep] = useState({
    name: "",
    description: "",
    primaryComponentIds: [] as string[],
    alternativeComponentIds: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ensure form fields populate correctly when opening in edit mode
  useEffect(() => {
    if (isOpen && isEdit && workflow) {
      setFormData({
        name: workflow.name || (workflow as any).businessProcess || "",
        description: workflow.description || "",
        criticality: (workflow.criticality as any) || "medium",
        owner: workflow.owner || "",
      });
      setSteps(workflow.steps || []);
    }
    // When creating a new process, ensure clean slate on open
    if (isOpen && !isEdit && !workflow) {
      setFormData({ name: "", description: "", criticality: "medium", owner: "" });
      setSteps([]);
    }
  }, [isOpen, isEdit, workflow]);

  // Edit existing step
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: "",
    description: "",
    primaryComponentIds: [] as string[],
    alternativeComponentIds: [] as string[],
  });

  const startEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setEditDraft({
      name: step.name,
      description: step.description || "",
      primaryComponentIds: (step.primaryComponentIds && step.primaryComponentIds.length > 0)
        ? step.primaryComponentIds
        : (step.primaryComponentId ? [step.primaryComponentId] : []),
      alternativeComponentIds: step.alternativeComponentIds || [],
    });
  };

  const saveEditStep = () => {
    if (!editingStep) return;
    if (!editDraft.name.trim() || editDraft.primaryComponentIds.length === 0) return;

    const updated = steps.map(s => {
      if (s.id !== editingStep.id) return s;
      return {
        ...s,
        name: editDraft.name.trim(),
        description: editDraft.description.trim(),
        primaryComponentIds: editDraft.primaryComponentIds,
        primaryComponentId: editDraft.primaryComponentIds[0], // legacy
        alternativeComponentIds: editDraft.alternativeComponentIds,
      };
    });
    setSteps(updated);
    setEditingStep(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Name is required";
    // single-name mode: no separate businessProcess field
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
      // keep data model compatibility by mirroring name
      businessProcess: formData.name.trim(),
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
        criticality: "medium",
        owner: ""
      });
      setSteps([]);
    }
  };

  const addStep = () => {
    if (!newStep.name.trim() || newStep.primaryComponentIds.length === 0) return;

    const step: WorkflowStep = {
      id: Date.now().toString(),
      name: newStep.name.trim(),
      description: newStep.description.trim(),
      // keep legacy single field as the first selected primary
      primaryComponentId: newStep.primaryComponentIds[0],
      primaryComponentIds: newStep.primaryComponentIds,
      alternativeComponentIds: newStep.alternativeComponentIds,
      order: steps.length + 1
    };

    setSteps([...steps, step]);
    setNewStep({
      name: "",
      description: "",
      primaryComponentIds: [],
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Process" : "Create New Process"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Process Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Process name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
                placeholder="Process description..."
                rows={3}
              />
            </div>
          </div>

          {/* Process Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Process Steps</h3>
            
            {/* Add Step Form */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div className="space-y-2">
                  <Label>Step name *</Label>
                  <Input
                    placeholder="Step name"
                    value={newStep.name}
                    onChange={(e) => setNewStep(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Primary IT Assets *</Label>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 bg-background">
                    {components.map(c => (
                      <div key={c.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`prim-${c.id}`}
                          checked={newStep.primaryComponentIds.includes(c.id)}
                          onCheckedChange={(checked) => {
                            setNewStep(prev => {
                              const set = new Set(prev.primaryComponentIds);
                              if (checked) set.add(c.id); else set.delete(c.id);
                              return { ...prev, primaryComponentIds: Array.from(set) };
                            });
                          }}
                        />
                        <Label htmlFor={`prim-${c.id}`} className="text-sm cursor-pointer">
                          {c.name} ({c.type})
                        </Label>
                      </div>
                    ))}
                  </div>
                  {newStep.primaryComponentIds.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Vyberte alespoň jednu primární komponentu.</p>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <Textarea
                  placeholder="Step description (optional)"
                  value={newStep.description}
                  onChange={(e) => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
              {/* Alternative components selection */}
              <div className="space-y-2 mb-3">
                <Label>Alternative IT Assets (optional)</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border p-2 bg-background">
                  {components
                    .filter(c => !newStep.primaryComponentIds.includes(c.id))
                    .map(c => (
                      <div key={c.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`alt-${c.id}`}
                          checked={newStep.alternativeComponentIds.includes(c.id)}
                          onCheckedChange={(checked) => {
                            setNewStep(prev => {
                              const set = new Set(prev.alternativeComponentIds);
                              if (checked) set.add(c.id); else set.delete(c.id);
                              return { ...prev, alternativeComponentIds: Array.from(set) };
                            });
                          }}
                        />
                        <Label htmlFor={`alt-${c.id}`} className="text-sm cursor-pointer">
                          {c.name} ({c.type})
                        </Label>
                      </div>
                    ))}
                </div>
                {newStep.alternativeComponentIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newStep.alternativeComponentIds.map(id => {
                      const comp = components.find(c => c.id === id);
                      return (
                        <Badge key={id} variant="outline" className="flex items-center gap-1">
                          {comp?.name || id}
                          <button
                            type="button"
                            onClick={() => setNewStep(prev => ({
                              ...prev,
                              alternativeComponentIds: prev.alternativeComponentIds.filter(cid => cid !== id)
                            }))}
                            className="inline-flex items-center justify-center ml-1 hover:text-destructive"
                            aria-label="Remove alternative"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
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
                      <TableHead>Primary Components</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Alternatives</TableHead>
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
                          {(step.primaryComponentIds && step.primaryComponentIds.length > 0) ? (
                            <div className="flex flex-wrap gap-1">
                              {step.primaryComponentIds.map(id => (
                                <Badge key={id} variant="secondary">{getComponentName(id)}</Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="secondary">{getComponentName(step.primaryComponentId || "")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {step.description || "No description"}
                        </TableCell>
                        <TableCell>
                          {(step.alternativeComponentIds && step.alternativeComponentIds.length > 0) ? (
                            <div className="flex flex-wrap gap-2">
                              {(step.alternativeComponentIds || []).map(id => {
                                const comp = components.find(c => c.id === id);
                                return (
                                  <Badge key={id} variant="outline" className="flex items-center gap-1">
                                    {comp?.name || id}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditStep(step)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
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
            {isEdit ? "Update Process" : "Create Process"}
          </Button>
        </div>
      </DialogContent>
      {/* Edit Step Dialog */}
      <Dialog open={!!editingStep} onOpenChange={(open) => { if (!open) setEditingStep(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Step name *</Label>
                <Input value={editDraft.name} onChange={(e) => setEditDraft(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editDraft.description} onChange={(e) => setEditDraft(prev => ({ ...prev, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Primary IT Assets *</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border p-2 bg-background">
                  {components.map(c => (
                    <div key={c.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`edit-prim-${c.id}`}
                        checked={editDraft.primaryComponentIds.includes(c.id)}
                        onCheckedChange={(checked) => {
                          setEditDraft(prev => {
                            const set = new Set(prev.primaryComponentIds);
                            if (checked) set.add(c.id); else set.delete(c.id);
                            return { ...prev, primaryComponentIds: Array.from(set) };
                          });
                        }}
                      />
                      <Label htmlFor={`edit-prim-${c.id}`} className="text-sm cursor-pointer">
                        {c.name} ({c.type})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alternative IT Assets (optional)</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border p-2 bg-background">
                  {components
                    .filter(c => !editDraft.primaryComponentIds.includes(c.id))
                    .map(c => (
                      <div key={c.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`edit-alt-${c.id}`}
                          checked={editDraft.alternativeComponentIds.includes(c.id)}
                          onCheckedChange={(checked) => {
                            setEditDraft(prev => {
                              const set = new Set(prev.alternativeComponentIds);
                              if (checked) set.add(c.id); else set.delete(c.id);
                              return { ...prev, alternativeComponentIds: Array.from(set) };
                            });
                          }}
                        />
                        <Label htmlFor={`edit-alt-${c.id}`} className="text-sm cursor-pointer">
                          {c.name} ({c.type})
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={() => setEditingStep(null)}>Cancel</Button>
            <Button onClick={saveEditStep}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};