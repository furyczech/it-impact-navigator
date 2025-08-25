import { supabase } from '@/lib/supabase';
import type { ITComponent } from '@/types/itiac';

// Database representation of a component
type DBComponent = Omit<ITComponent, 'id' | 'lastUpdated'> & {
  last_updated: string;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch all components, ordered by name
 */
export const fetchComponents = async (): Promise<ITComponent[]> => {
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .order('name');
  
  if (error) throw error;
  
  // Helper function to safely parse dates with time
  const parseDate = (dateString: string | null | undefined): Date => {
    if (!dateString) return new Date();
    // Try parsing as ISO string first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
    
    // Try parsing custom format: YYYY-MM-DD HH:MM:SS
    const match = String(dateString).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [_, year, month, day, hours, minutes, seconds] = match.map(Number);
      date = new Date(year, month - 1, day, hours, minutes, seconds);
    }
    
    return isNaN(date.getTime()) ? new Date() : date;
  };

  // Map database fields to ITComponent
  return (data || []).map((dbComp: any) => ({
    id: dbComp.id,
    name: dbComp.name,
    type: dbComp.type,
    status: dbComp.status,
    criticality: dbComp.criticality,
    description: dbComp.description || '',
    location: dbComp.location || '',
    owner: dbComp.owner || '',
    vendor: dbComp.vendor || '',
    helpdeskEmail: dbComp.helpdeskEmail || dbComp.metadata?.helpdeskEmail || undefined,
    lastUpdated: parseDate(dbComp.last_updated || dbComp.updated_at || dbComp.created_at),
    metadata: dbComp.metadata || {}
  }));
};

/**
 * Create a new component
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

export const createComponent = async (component: Omit<ITComponent, 'id' | 'lastUpdated'> & {
  id?: string; // Make id optional since we'll generate it if not provided
  last_updated?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}): Promise<ITComponent> => {
  const now = formatDate();
  
  // Generate a unique ID if one isn't provided
  const componentWithId = {
    ...component,
    id: component.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    last_updated: component.last_updated || now,
    created_at: component.created_at || now,
    updated_at: component.updated_at || now
  } as any;
  
  const { data, error } = await supabase
    .from('components')
    .insert([componentWithId])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating component:', error);
    throw error;
  }
  
  // Map database response to ITComponent
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    status: data.status,
    criticality: data.criticality,
    description: data.description,
    location: data.location,
    owner: data.owner,
    vendor: data.vendor,
    helpdeskEmail: data.helpdeskEmail || data.metadata?.helpdeskEmail || undefined,
    lastUpdated: new Date(data.last_updated),
    metadata: data.metadata || {}
  };
};

/**
 * Update an existing component
 */
export const updateComponent = async (
  id: string, 
  updates: Partial<Omit<ITComponent, 'id' | 'lastUpdated'>> & {
    last_updated?: string;
    updated_at?: string;
  }
): Promise<ITComponent> => {
  const { data, error } = await supabase
    .from('components')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Map database response to ITComponent
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    status: data.status,
    criticality: data.criticality,
    description: data.description,
    location: data.location,
    owner: data.owner,
    vendor: data.vendor,
    helpdeskEmail: data.helpdeskEmail || data.metadata?.helpdeskEmail || undefined,
    lastUpdated: new Date(data.last_updated),
    metadata: data.metadata || {}
  };
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
