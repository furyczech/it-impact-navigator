import { useItiacStore } from '@/store/useItiacStore';
import { supabase } from '@/lib/supabase';
import { ITComponent, ComponentDependency, BusinessWorkflow } from '@/types/itiac';

let isInitialized = false;

// No need for subscription-based syncing since we're using Supabase directly
export async function initializeSync() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // Load data from Supabase on startup
    const store = useItiacStore.getState();
    await store.loadData();
  } catch (e) {
    console.warn('Initial sync: failed to load from Supabase', e);
  }
}

// Keep for compatibility, but no cleanup needed for Supabase
export function teardownSync() {
  isInitialized = false;
}
