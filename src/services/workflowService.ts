import { supabase } from '@/lib/supabase';
import type { ITWorkflow, WorkflowStep } from '@/types/itiac';

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

// Workflow operations
export const fetchWorkflows = async (): Promise<ITWorkflow[]> => {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const createWorkflow = async (workflow: Omit<ITWorkflow, 'id' | 'lastUpdated'>): Promise<ITWorkflow> => {
  const now = formatDate();
  const workflowWithTimestamps = {
    ...workflow,
    last_updated: now,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('workflows')
    .insert([workflowWithTimestamps])
    .select()
    .single();
  
  if (error) throw error;
  
  // Map database fields to frontend model
  return {
    ...data,
    lastUpdated: new Date(data.last_updated)
  };
};

export const updateWorkflow = async (id: string, updates: Partial<ITWorkflow>): Promise<ITWorkflow> => {
  const { data, error } = await supabase
    .from('workflows')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteWorkflow = async (id: string): Promise<void> => {
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
    .order('order_index');
  
  if (error) throw error;
  return data || [];
};

export const saveWorkflowSteps = async (workflowId: string, steps: WorkflowStep[]): Promise<WorkflowStep[]> => {
  // First delete existing steps
  await supabase
    .from('workflow_steps')
    .delete()
    .eq('workflow_id', workflowId);
  
  // Insert new steps
  const stepsWithWorkflowId = steps.map(step => ({
    ...step,
    workflow_id: workflowId,
  }));
  
  const { data, error } = await supabase
    .from('workflow_steps')
    .insert(stepsWithWorkflowId)
    .select();
  
  if (error) throw error;
  return data || [];
};
