import { supabase } from '@/lib/supabase';
import type { ITComponent } from '@/types/itiac';

/**
 * Fetch all components, ordered by name
 */
export const fetchComponents = async (): Promise<ITComponent[]> => {
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

/**
 * Create a new component
 */
export const createComponent = async (component: Omit<ITComponent, 'id'>): Promise<ITComponent> => {
  const { data, error } = await supabase
    .from('components')
    .insert([component])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Update an existing component
 */
export const updateComponent = async (id: string, updates: Partial<ITComponent>): Promise<ITComponent> => {
  const { data, error } = await supabase
    .from('components')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Delete a component by ID
 */
export const deleteComponent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('components')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

/**
 * Get a single component by ID
 */
export const getComponent = async (id: string): Promise<ITComponent | null> => {
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data;
};
