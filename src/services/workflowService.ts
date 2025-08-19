import { supabase } from '@/lib/supabase';
import type { BusinessWorkflow, WorkflowStep } from '@/types/itiac';

// Helper function to format date with hours, minutes, and seconds
const formatDate = (date: Date = new Date()): string => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Parse various date formats safely
const parseDate = (dateString?: string | null): Date => {
  if (!dateString) return new Date();
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  const m = String(dateString).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const [_, y, mo, da, h, mi, s] = m.map(Number);
    d = new Date(y, mo - 1, da, h, mi, s);
  }
  return isNaN(d.getTime()) ? new Date() : d;
};

// Map DB row to BusinessWorkflow
const mapDbWorkflow = (db: any): BusinessWorkflow => ({
  id: db.id,
  name: db.name,
  description: db.description || '',
  businessProcess: db.business_process,
  criticality: db.criticality,
  steps: [],
  owner: db.owner || '',
  lastUpdated: parseDate(db.last_updated || db.updated_at || db.created_at)
});

// Map DB row to WorkflowStep
const mapDbStep = (db: any): WorkflowStep => {
  const primaryArray: string[] = Array.isArray(db.primary_component_ids)
    ? db.primary_component_ids
    : (db.primary_component_id ? [db.primary_component_id] : []);
  const alternativeArray: string[] = Array.isArray(db.alternative_component_ids)
    ? db.alternative_component_ids
    : [];
  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    primaryComponentId: db.primary_component_id || (primaryArray.length ? primaryArray[0] : undefined),
    primaryComponentIds: primaryArray,
    alternativeComponentIds: alternativeArray,
    fallbackWorkflowId: db.fallback_workflow_id || undefined,
    order: db.order ?? 0
  };
};

// Workflow operations
export const fetchWorkflows = async (): Promise<BusinessWorkflow[]> => {
  try {
    const { data, error, status } = await supabase
      .from('workflows')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('[WorkflowService] Error fetching workflows:', {
        status,
        error,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }
    
    const workflows = (data || []).map(mapDbWorkflow);
    return workflows;
  } catch (error) {
    console.error('[WorkflowService] Error in fetchWorkflows:', error);
    throw error;
  }
};

export const createWorkflow = async (
  workflow: Omit<BusinessWorkflow, 'id' | 'lastUpdated' | 'steps'> & { steps?: WorkflowStep[] }
): Promise<BusinessWorkflow> => {
  try {
    const now = formatDate();
    const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Insert into workflows without steps payload
    const insertPayload = {
      id,
      name: workflow.name,
      description: workflow.description || '',
      business_process: workflow.businessProcess,
      criticality: workflow.criticality,
      owner: workflow.owner || '',
      last_updated: now,
      created_at: now,
      updated_at: now
    };
    
    const { data, error, status } = await supabase
      .from('workflows')
      .insert([insertPayload])
      .select()
      .single();
    
    if (error) {
      console.error('[WorkflowService] Error creating workflow:', {
        status,
        error,
        workflowName: workflow.name,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
    
    // Save steps if provided
    let savedSteps: WorkflowStep[] = [];
    if (workflow.steps && workflow.steps.length > 0) {
      savedSteps = await saveWorkflowSteps(id, workflow.steps);
    }

    const created: BusinessWorkflow = {
      ...mapDbWorkflow(data),
      steps: savedSteps
    };
    return created;
  } catch (error) {
    console.error('[WorkflowService] Error in createWorkflow:', error);
    throw error;
  }
};

export const updateWorkflow = async (
  id: string,
  updates: Partial<Omit<BusinessWorkflow, 'id' | 'lastUpdated' | 'steps'>> & { steps?: WorkflowStep[] }
): Promise<BusinessWorkflow> => {
  // Separate steps from other fields
  const { steps, ...rest } = updates as any;

  // Build DB updates
  const dbUpdates: any = {};
  if (rest.name !== undefined) dbUpdates.name = rest.name;
  if (rest.description !== undefined) dbUpdates.description = rest.description ?? '';
  if (rest.businessProcess !== undefined) dbUpdates.business_process = rest.businessProcess;
  if (rest.criticality !== undefined) dbUpdates.criticality = rest.criticality;
  if (rest.owner !== undefined) dbUpdates.owner = rest.owner ?? '';
  dbUpdates.last_updated = formatDate();
  dbUpdates.updated_at = formatDate();

  let updatedRow: any = null;
  if (Object.keys(dbUpdates).length > 0) {
    const { data, error } = await supabase
      .from('workflows')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    updatedRow = data;
  } else {
    // Fetch current row if no column updates (only steps)
    const { data } = await supabase.from('workflows').select('*').eq('id', id).single();
    updatedRow = data;
  }

  // Update steps if provided
  let savedSteps: WorkflowStep[] | undefined = undefined;
  if (steps) {
    savedSteps = await saveWorkflowSteps(id, steps);
  } else {
    // Preserve existing steps when not part of update
    savedSteps = await fetchWorkflowSteps(id);
  }

  const result: BusinessWorkflow = {
    ...mapDbWorkflow(updatedRow),
    steps: savedSteps ?? []
  };
  return result;
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  // Delete steps first to satisfy FK constraints
  const { error: stepsErr } = await supabase
    .from('workflow_steps')
    .delete()
    .eq('workflow_id', id);
  if (stepsErr) throw stepsErr;

  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Workflow Steps operations
export const fetchWorkflowSteps = async (workflowId: string): Promise<WorkflowStep[]> => {
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('order');
  
  if (error) throw error;
  return (data || []).map(mapDbStep);
};

export const saveWorkflowSteps = async (workflowId: string, steps: WorkflowStep[]): Promise<WorkflowStep[]> => {
  // First delete existing steps
  const { error: delErr } = await supabase
    .from('workflow_steps')
    .delete()
    .eq('workflow_id', workflowId);
  if (delErr) throw delErr;
  
  // Insert new steps (map to DB shape)
  const now = formatDate();
  const rows = steps.map((s, idx) => ({
    id: s.id || `wfs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    workflow_id: workflowId,
    name: s.name,
    description: s.description || '',
    // Persist both legacy single id and JSONB arrays for full fidelity
    primary_component_id: s.primaryComponentId || (s.primaryComponentIds && s.primaryComponentIds.length > 0 ? s.primaryComponentIds[0] : null),
    primary_component_ids: (s.primaryComponentIds && s.primaryComponentIds.length > 0)
      ? s.primaryComponentIds
      : (s.primaryComponentId ? [s.primaryComponentId] : []),
    alternative_component_ids: s.alternativeComponentIds ?? [],
    fallback_workflow_id: s.fallbackWorkflowId || null,
    order: s.order ?? idx,
    created_at: now,
    updated_at: now
  }));
  
  // Try insert with JSONB columns first; if the view doesn't have them yet, retry without
  let data: any[] | null = null;
  let error: any = null;
  const insertReq = await supabase
    .from('workflow_steps')
    .insert(rows)
    .select();
  data = insertReq.data as any[] | null;
  error = insertReq.error;
  if (error && String(error.message || '').includes('column') && String(error.message || '').includes('does not exist')) {
    // Retry with legacy shape only
    const legacyRows = rows.map(r => ({
      id: r.id,
      workflow_id: r.workflow_id,
      name: r.name,
      description: r.description,
      primary_component_id: r.primary_component_id,
      fallback_workflow_id: r.fallback_workflow_id,
      order: r.order,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    const retry = await supabase
      .from('workflow_steps')
      .insert(legacyRows)
      .select();
    if (retry.error) throw retry.error;
    data = retry.data as any[] | null;
  } else if (error) {
    throw error;
  }
  // Map DB rows; arrays will be present if JSONB exists, otherwise derived from legacy
  return (data || []).map(mapDbStep);
};
