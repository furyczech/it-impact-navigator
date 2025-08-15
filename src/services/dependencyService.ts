import { supabase } from '@/lib/supabase';
import type { ComponentDependency } from '@/types/itiac';

// Database representation of a dependency
type DBDependency = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  description: string | null;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  last_updated: string;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch all dependencies
 */
export const fetchDependencies = async (): Promise<ComponentDependency[]> => {
  try {
    console.log('Fetching dependencies from Supabase...');
    const { data, error, status } = await supabase
      .from('dependencies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching dependencies:', error);
      throw error;
    }
    
    console.log(`Fetched ${data?.length || 0} dependencies`);
    
    if (!data) return [];
    
    // Map database fields to frontend model
    return data.map((dep: any) => {
      try {
        const dependency: ComponentDependency = {
          id: dep.id,
          sourceId: dep.source_id,
          targetId: dep.target_id,
          type: dep.type as ComponentDependency['type'],
          description: dep.description || '',
          criticality: dep.criticality || 'medium'
        };
        return dependency;
      } catch (mapError) {
        console.error('Error mapping dependency:', mapError, 'Raw data:', dep);
        return null;
      }
    }).filter(Boolean) as ComponentDependency[];
    
  } catch (error) {
    console.error('Error in fetchDependencies:', error);
    throw error;
  }
};

/**
 * Fetch dependencies where the given component is the source
 */
export const fetchOutgoingDependencies = async (componentId: string): Promise<ComponentDependency[]> => {
  const { data, error } = await supabase
    .from('dependencies')
    .select('*')
    .eq('source_id', componentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Map database fields to frontend model
  return (data || []).map((dep: DBDependency) => ({
    id: dep.id,
    sourceId: dep.source_id,
    targetId: dep.target_id,
    type: dep.type as ComponentDependency['type'],
    description: dep.description || '',
    criticality: dep.criticality,
    lastUpdated: new Date(dep.last_updated)
  }));
};

/**
 * Fetch dependencies where the given component is the target
 */
export const fetchIncomingDependencies = async (componentId: string): Promise<ComponentDependency[]> => {
  const { data, error } = await supabase
    .from('dependencies')
    .select('*')
    .eq('target_id', componentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Map database fields to frontend model
  return (data || []).map((dep: DBDependency) => ({
    id: dep.id,
    sourceId: dep.source_id,
    targetId: dep.target_id,
    type: dep.type as ComponentDependency['type'],
    description: dep.description || '',
    criticality: dep.criticality,
    lastUpdated: new Date(dep.last_updated)
  }));
};

/**
 * Create a new dependency
 */
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

export const createDependency = async (dependency: Omit<ComponentDependency, 'id'>): Promise<ComponentDependency> => {
  const now = formatDate();
  
  // Generate a unique ID for the new dependency
  const dependencyId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Convert to database model
  const dbDependency = {
    id: dependencyId,
    source_id: dependency.sourceId,
    target_id: dependency.targetId,
    type: dependency.type,
    description: dependency.description || null,
    criticality: dependency.criticality || 'medium',
    last_updated: now,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('dependencies')
    .insert([dbDependency])
    .select()
    .single();
  
  if (error) throw error;
  
  // Map database response to frontend model
  return {
    id: data.id,
    sourceId: data.source_id,
    targetId: data.target_id,
    type: data.type as ComponentDependency['type'],
    description: data.description || '',
    criticality: data.criticality,
    lastUpdated: new Date(data.last_updated)
  };
};

/**
 * Update a dependency
 */
export const updateDependency = async (id: string, updates: Partial<Omit<ComponentDependency, 'id'>>): Promise<ComponentDependency> => {
  // Convert updates to database model
  const dbUpdates: Partial<DBDependency> = {};
  
  if (updates.sourceId !== undefined) dbUpdates.source_id = updates.sourceId;
  if (updates.targetId !== undefined) dbUpdates.target_id = updates.targetId;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.criticality !== undefined) dbUpdates.criticality = updates.criticality;
  
  // Always update the last_updated timestamp
  dbUpdates.last_updated = new Date().toISOString();
  dbUpdates.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('dependencies')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Map database response to frontend model
  return {
    id: data.id,
    sourceId: data.source_id,
    targetId: data.target_id,
    type: data.type as ComponentDependency['type'],
    description: data.description || '',
    criticality: data.criticality,
    lastUpdated: new Date(data.last_updated)
  };
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
