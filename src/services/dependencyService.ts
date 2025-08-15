import { supabase } from '@/lib/supabase';
import type { ITDependency } from '@/types/itiac';

/**
 * Fetch all dependencies
 */
export const fetchDependencies = async (): Promise<ITDependency[]> => {
  const { data, error } = await supabase
    .from('dependencies')
    .select('*');
  
  if (error) throw error;
  return data || [];
};

/**
 * Fetch dependencies where the given component is the source
 */
export const fetchOutgoingDependencies = async (componentId: string): Promise<ITDependency[]> => {
  const { data, error } = await supabase
    .from('dependencies')
    .select('*')
    .eq('source_id', componentId);
  
  if (error) throw error;
  return data || [];
};

/**
 * Fetch dependencies where the given component is the target
 */
export const fetchIncomingDependencies = async (componentId: string): Promise<ITDependency[]> => {
  const { data, error } = await supabase
    .from('dependencies')
    .select('*')
    .eq('target_id', componentId);
  
  if (error) throw error;
  return data || [];
};

/**
 * Create a new dependency
 */
export const createDependency = async (dependency: Omit<ITDependency, 'id'>): Promise<ITDependency> => {
  const { data, error } = await supabase
    .from('dependencies')
    .insert([dependency])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Update a dependency
 */
export const updateDependency = async (id: string, updates: Partial<ITDependency>): Promise<ITDependency> => {
  const { data, error } = await supabase
    .from('dependencies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Delete a dependency by ID
 */
export const deleteDependency = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('dependencies')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

/**
 * Delete all dependencies for a component (both incoming and outgoing)
 */
export const deleteComponentDependencies = async (componentId: string): Promise<void> => {
  const { error } = await supabase
    .from('dependencies')
    .delete()
    .or(`source_id.eq.${componentId},target_id.eq.${componentId}`);
  
  if (error) throw error;
};
