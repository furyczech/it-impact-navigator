import { create } from 'zustand';
import { ITComponent, ComponentDependency, BusinessWorkflow, WorkflowStep } from '@/types/itiac';
import { AuditService } from '@/services/auditService';
import { 
  fetchComponents, 
  createComponent as createComponentApi, 
  updateComponent as updateComponentApi, 
  deleteComponent as deleteComponentApi
} from '@/services/componentService';
import { 
  fetchDependencies, 
  createDependency as createDependencyApi, 
  updateDependency as updateDependencyApi, 
  deleteDependency as deleteDependencyApi
} from '@/services/dependencyService';
import { 
  fetchWorkflows as fetchWorkflowsApi, 
  createWorkflow as createWorkflowApi, 
  updateWorkflow as updateWorkflowApi, 
  deleteWorkflow as deleteWorkflowApi,
  fetchWorkflowSteps as fetchWorkflowStepsApi
} from '@/services/workflowService';
import { toast } from 'sonner';

// Helper function to ensure date is in the correct format
const ensureDate = (date: Date | string | undefined): Date => {
  if (!date) return new Date();
  return date instanceof Date ? date : new Date(date);
};

interface ItiacState {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  workflows: BusinessWorkflow[];
  isLoading: boolean;
  error: string | null;
  // actions
  addComponent: (component: Omit<ITComponent, 'id' | 'lastUpdated'>) => Promise<ITComponent>;
  updateComponent: (id: string, patch: Partial<Omit<ITComponent, 'id' | 'lastUpdated'>>) => Promise<ITComponent | undefined>;
  deleteComponent: (id: string) => Promise<void>;
  addDependency: (dependency: Omit<ComponentDependency, 'id'>) => Promise<ComponentDependency>;
  updateDependency: (id: string, patch: Partial<Omit<ComponentDependency, 'id'>>) => Promise<ComponentDependency | undefined>;
  deleteDependency: (id: string) => Promise<void>;
  // workflow actions
  addWorkflow: (workflow: Omit<BusinessWorkflow, 'id' | 'lastUpdated' | 'steps'> & { steps?: WorkflowStep[] }) => Promise<BusinessWorkflow>;
  updateWorkflow: (id: string, patch: Partial<Omit<BusinessWorkflow, 'id' | 'lastUpdated'>>) => Promise<BusinessWorkflow | undefined>;
  deleteWorkflow: (id: string) => Promise<void>;
  // bulk operations
  importData: (data: { components?: any[]; dependencies?: any[]; workflows?: any[] }) => Promise<void>;
  resetAllData: () => Promise<void>;
  loadData: () => Promise<{ components: ITComponent[]; dependencies: ComponentDependency[]; workflows: BusinessWorkflow[] }>;
}

// Initial empty state
const initialComponents: ITComponent[] = [];
const initialDependencies: ComponentDependency[] = [];
const initialWorkflows: BusinessWorkflow[] = [];

export const useItiacStore = create<ItiacState>((set, get) => ({
  components: initialComponents,
  dependencies: initialDependencies,
  workflows: initialWorkflows,
  isLoading: false,
  error: null,

  loadData: async () => {
    try {
      set({ isLoading: true, error: null });
      const [wfRes, compRes, depRes] = await Promise.allSettled([
        fetchWorkflowsApi(),
        fetchComponents(),
        fetchDependencies()
      ]);
      const workflows = wfRes.status === 'fulfilled' ? (wfRes.value || []) : [];
      const components = compRes.status === 'fulfilled' ? (compRes.value || []) : [];
      const dependencies = depRes.status === 'fulfilled' ? (depRes.value || []) : [];
      if (wfRes.status === 'rejected') console.warn('Workflows load failed, continuing without workflows:', wfRes.reason);
      if (compRes.status === 'rejected') console.warn('Components load failed:', compRes.reason);
      if (depRes.status === 'rejected') console.warn('Dependencies load failed:', depRes.reason);
      
      // Enrich workflows with steps
      const workflowsWithSteps: BusinessWorkflow[] = await Promise.all(
        (workflows || []).map(async (wf) => {
          try {
            const steps = await fetchWorkflowStepsApi(wf.id);
            return { ...wf, steps };
          } catch (e) {
            console.warn('Failed to load steps for workflow', wf.id, e);
            return { ...wf, steps: [] };
          }
        })
      );

      // Normalize dates
      const normalizedComponents = (components || []).map(comp => ({
        ...comp,
        lastUpdated: ensureDate(comp.lastUpdated)
      }));
      const normalizedDependencies = (dependencies || []).map(dep => ({
        ...dep,
        lastUpdated: ensureDate((dep as any).lastUpdated)
      }));
      const normalizedWorkflows = (workflowsWithSteps || []).map(wf => ({
        ...wf,
        lastUpdated: ensureDate(wf.lastUpdated)
      }));
      
      set({ 
        components: normalizedComponents, 
        dependencies: normalizedDependencies,
        workflows: normalizedWorkflows,
        isLoading: false 
      });

      return { components: normalizedComponents, dependencies: normalizedDependencies, workflows: normalizedWorkflows };
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ error: 'Failed to load data', isLoading: false });
      toast.error('Failed to load data from server');
      throw error;
    }
  },

  addComponent: async (componentData: Omit<ITComponent, 'id' | 'lastUpdated'>) => {
    try {
      set({ isLoading: true });
      
      // Create a database-compatible object with all required fields
      const dbComponent = {
        name: componentData.name,
        type: componentData.type,
        status: componentData.status,
        criticality: componentData.criticality,
        description: componentData.description || '',
        location: componentData.location || '',
        owner: componentData.owner || '',
        vendor: componentData.vendor || '',
        metadata: componentData.metadata || {}
        // Let the service handle the timestamps
      };
      
      
      
      // Call the API to create the component
      const newComponent = await createComponentApi(dbComponent);
      
      if (!newComponent) {
        throw new Error('Failed to create component: No data returned from API');
      }
      
      // Map the database response back to the frontend model
      // The service already returns ITComponent with lastUpdated
      AuditService.logComponentAction('CREATE', newComponent);
      
      set((state) => ({
        components: [...state.components, newComponent],
        isLoading: false
      }));
      
      toast.success('Component created successfully');
      return newComponent;
    } catch (error) {
      console.error('Failed to create component:', error);
      set({ error: 'Failed to create component', isLoading: false });
      toast.error('Failed to create component');
      throw error;
    }
  },

  updateComponent: async (id, patch) => {
    try {
      set({ isLoading: true });
      const beforeComponent = get().components.find(c => c.id === id);
      if (!beforeComponent) throw new Error('Component not found');
      
      // Create a database-compatible update object
      const updateData = {
        ...patch,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Remove any undefined values to avoid overwriting with null
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      const updatedComponent = await updateComponentApi(id, updateData);
      
      // The service already returns ITComponent with lastUpdated
      AuditService.logComponentAction('UPDATE', updatedComponent, beforeComponent);
      
      set((state) => ({
        components: state.components.map((c) => (c.id === id ? updatedComponent : c)),
        isLoading: false
      }));
      
      toast.success('Component updated successfully');
      return updatedComponent;
    } catch (error) {
      console.error('Failed to update component:', error);
      set({ error: 'Failed to update component', isLoading: false });
      toast.error('Failed to update component');
      throw error;
    }
  },

  deleteComponent: async (id: string) => {
    try {
      set({ isLoading: true });
      const component = get().components.find(c => c.id === id);
      if (!component) return;
      
      await deleteComponentApi(id);
      AuditService.logComponentAction('DELETE', component);
      
      // Delete all related dependencies
      const relatedDependencies = get().dependencies.filter(
        d => d.sourceId === id || d.targetId === id
      );
      
      // Delete related dependencies
      await Promise.all(
        relatedDependencies.map(dep => deleteDependencyApi(dep.id))
      );
      
      set((state) => ({
        components: state.components.filter((c) => c.id !== id),
        dependencies: state.dependencies.filter(
          (d) => d.sourceId !== id && d.targetId !== id
        ),
        isLoading: false
      }));
      
      toast.success('Component deleted successfully');
    } catch (error) {
      console.error('Failed to delete component:', error);
      set({ error: 'Failed to delete component', isLoading: false });
      toast.error('Failed to delete component');
      throw error;
    }
  },

  addDependency: async (dependencyData: Omit<ComponentDependency, 'id' | 'lastUpdated'>) => {
    try {
      set({ isLoading: true });
      
      // Create the dependency using the API
      const newDependency = await createDependencyApi({
        sourceId: dependencyData.sourceId,
        targetId: dependencyData.targetId,
        type: dependencyData.type,
        description: dependencyData.description,
        criticality: dependencyData.criticality || 'medium'
      });
      
      // Log the action
      await AuditService.logDependencyAction('CREATE', newDependency);
      
      // Update the store
      set((state) => ({
        dependencies: [...state.dependencies, newDependency],
        isLoading: false
      }));
      
      toast.success('Dependency created successfully');
      return newDependency;
    } catch (error) {
      console.error('Failed to create dependency:', error);
      set({ error: 'Failed to create dependency', isLoading: false });
      toast.error('Failed to create dependency');
      throw error;
    }
  },

  updateDependency: async (id: string, patch: Partial<Omit<ComponentDependency, 'id' | 'lastUpdated'>>) => {
    try {
      set({ isLoading: true });
      
      // Get the current dependency for audit logging
      const beforeDependency = get().dependencies.find(d => d.id === id);
      if (!beforeDependency) throw new Error('Dependency not found');
      
      // Update the dependency using the API
      const updatedDependency = await updateDependencyApi(id, patch);
      
      // Get component names for audit log
      const sourceComponent = get().components.find(c => c.id === updatedDependency.sourceId);
      const targetComponent = get().components.find(c => c.id === updatedDependency.targetId);
      
      // Log the action
      await AuditService.logDependencyAction(
        'UPDATE',
        updatedDependency,
        sourceComponent?.name,
        targetComponent?.name,
        beforeDependency
      );
      
      // Update the store
      set((state) => ({
        dependencies: state.dependencies.map((d) => (d.id === id ? updatedDependency : d)),
        isLoading: false
      }));
      
      toast.success('Dependency updated successfully');
      return updatedDependency;
    } catch (error) {
      console.error('Failed to update dependency:', error);
      set({ error: 'Failed to update dependency', isLoading: false });
      toast.error('Failed to update dependency');
      throw error;
    }
  },

  deleteDependency: async (id: string) => {
    try {
      set({ isLoading: true });
      
      // Get the dependency for audit logging
      const dependency = get().dependencies.find(d => d.id === id);
      if (!dependency) return;
      
      // Delete the dependency using the API
      await deleteDependencyApi(id);
      
      // Log the action
      await AuditService.logDependencyAction('DELETE', dependency);
      
      // Update the store
      set((state) => ({
        dependencies: state.dependencies.filter((d) => d.id !== id),
        isLoading: false
      }));
      
      toast.success('Dependency deleted successfully');
    } catch (error) {
      console.error('Failed to delete dependency:', error);
      set({ error: 'Failed to delete dependency', isLoading: false });
      toast.error('Failed to delete dependency');
      throw error;
    }
  },

  importData: async (data: { components?: any[]; dependencies?: any[]; workflows?: any[] }) => {
    try {
      set({ isLoading: true });
      const now = new Date();
      
      // Import components
      if (data.components && data.components.length > 0) {
        // Process components with proper timestamps
        const componentsToImport = data.components.map(comp => {
          const { lastUpdated, ...rest } = comp;
          return {
            ...rest,
            lastUpdated: ensureDate(lastUpdated || now)
          };
        });
        
        // In a real app, you might want to batch these or use a bulk insert endpoint
        await Promise.all(
          componentsToImport.map(comp => 
            createComponentApi(comp as Omit<ITComponent, 'id'>).catch(console.error)
          )
        );
        
        AuditService.logImport('components', 'bulk-import', componentsToImport.length);
      }
      
      // Import dependencies
      if (data.dependencies && data.dependencies.length > 0) {
        // Process dependencies with proper timestamps
        const dependenciesToImport = data.dependencies.map(dep => {
          const { lastUpdated, ...rest } = dep;
          return {
            ...rest,
            lastUpdated: ensureDate(lastUpdated || now)
          };
        });
        
        await Promise.all(
          dependenciesToImport.map(dep => 
            createDependencyApi(dep as Omit<ComponentDependency, 'id'>).catch(console.error)
          )
        );
        
        AuditService.logImport('dependencies', 'bulk-import', dependenciesToImport.length);
      }

      // Import workflows (with steps)
      if (data.workflows && data.workflows.length > 0) {
        const workflowsToImport = data.workflows.map(wf => {
          const { lastUpdated, steps = [], ...rest } = wf || {};
          return {
            ...rest,
            steps,
            lastUpdated: ensureDate(lastUpdated || now)
          };
        });
        await Promise.all(
          workflowsToImport.map(wf =>
            createWorkflowApi({
              name: wf.name,
              description: wf.description || '',
              businessProcess: wf.businessProcess,
              criticality: wf.criticality,
              owner: wf.owner || '',
              steps: wf.steps || []
            }).catch(console.error)
          )
        );
        AuditService.logImport('workflows', 'bulk-import', workflowsToImport.length);
      }
      
      // Refresh data after import
      await get().loadData();
      
      toast.success('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      set({ error: 'Failed to import data', isLoading: false });
      toast.error('Failed to import data');
      throw error;
    }
  },

  resetAllData: async () => {
    try {
      set({ isLoading: true });
      
      // Delete all data (be careful with this in production!)
      await Promise.all([
        ...get().dependencies.map(dep => deleteDependencyApi(dep.id).catch(console.error)),
        ...get().components.map(comp => deleteComponentApi(comp.id).catch(console.error)),
        // Add workflow deletion if needed
      ]);
      
      // Reset local state
      set({
        components: initialComponents,
        dependencies: initialDependencies,
        workflows: initialWorkflows,
        isLoading: false
      });
      
      toast.success('All data has been reset');
    } catch (error) {
      console.error('Failed to reset data:', error);
      set({ error: 'Failed to reset data', isLoading: false });
      toast.error('Failed to reset data');
      throw error;
    }
  },
  
  addWorkflow: async (workflowData: Omit<BusinessWorkflow, 'id' | 'lastUpdated' | 'steps'> & { steps?: WorkflowStep[] }): Promise<BusinessWorkflow> => {
    try {
      // Create workflow in Supabase
      const newWorkflow = await createWorkflowApi({
        ...workflowData,
        steps: workflowData.steps || []
      });
      
      // Update local state
      set(state => ({
        workflows: [...state.workflows, newWorkflow]
      }));
      
      toast.success('Workflow created successfully');
      return newWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error(`Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
  
  updateWorkflow: async (id: string, patch: Partial<Omit<BusinessWorkflow, 'id' | 'lastUpdated'>>) => {
    try {
      // Update workflow in Supabase
      const updatedWorkflow = await updateWorkflowApi(id, patch);
      
      if (updatedWorkflow) {
        // Update local state
        set(state => ({
          workflows: state.workflows.map(w => 
            w.id === id ? updatedWorkflow : w
          )
        }));
        
        toast.success('Workflow updated successfully');
        return updatedWorkflow;
      }
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast.error(`Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
  
  deleteWorkflow: async (id: string) => {
    try {
      // Delete workflow from Supabase
      await deleteWorkflowApi(id);
      
      // Update local state
      set(state => ({
        workflows: state.workflows.filter(w => w.id !== id)
      }));
      
      toast.success('Workflow deleted successfully');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error(`Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
}))
