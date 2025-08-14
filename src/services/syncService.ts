import { useItiacStore } from '@/store/useItiacStore';
import { fetchData, saveData } from './apiClient';

let isInitialized = false;
let unsubscribe: (() => void) | null = null;

export async function initializeSync() {
  if (isInitialized) return;
  isInitialized = true;

  // 1) Load data from server on startup (if available)
  try {
    const serverData = await fetchData();
    if (serverData && Array.isArray(serverData.components) && Array.isArray(serverData.dependencies) && Array.isArray(serverData.workflows)) {
      const importData = useItiacStore.getState().importData;
      importData({
        components: serverData.components.map((c: any) => ({ ...c, lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date() })),
        dependencies: serverData.dependencies,
        workflows: serverData.workflows.map((w: any) => ({ ...w, lastUpdated: w.lastUpdated ? new Date(w.lastUpdated) : new Date() })),
      });
    }
  } catch (e) {
    console.warn('Initial sync: failed to load from server', e);
  }

  // 2) Subscribe to store changes and persist to server
  if (!unsubscribe) {
    unsubscribe = useItiacStore.subscribe((state) => {
      // Note: convert Date objects to ISO strings for JSON
      const payload = {
        components: state.components.map((c) => ({ ...c, lastUpdated: c.lastUpdated instanceof Date ? c.lastUpdated.toISOString() : c.lastUpdated })),
        dependencies: state.dependencies,
        workflows: state.workflows.map((w) => ({ ...w, lastUpdated: w.lastUpdated instanceof Date ? w.lastUpdated.toISOString() : w.lastUpdated })),
      };
      saveData(payload).catch((e) => console.warn('Sync save failed', e));
    });
  }
}

export function teardownSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  isInitialized = false;
}
