import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ITComponent, ComponentDependency, BusinessWorkflow } from '@/types/itiac';
import { AuditService } from '@/services/auditService';

interface ItiacState {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  workflows: BusinessWorkflow[];
  // actions
  addComponent: (component: ITComponent) => void;
  updateComponent: (id: string, patch: Partial<ITComponent>) => void;
  deleteComponent: (id: string) => void;
  addDependency: (dependency: ComponentDependency) => void;
  updateDependency: (id: string, patch: Partial<ComponentDependency>) => void;
  deleteDependency: (id: string) => void;
  addWorkflow: (workflow: BusinessWorkflow) => void;
  updateWorkflow: (id: string, patch: Partial<BusinessWorkflow>) => void;
  deleteWorkflow: (id: string) => void;
  // bulk operations
  importData: (data: { components?: ITComponent[]; dependencies?: ComponentDependency[]; workflows?: BusinessWorkflow[] }) => void;
  resetAllData: () => void;
}

const initialComponents: ITComponent[] = [
  { id: '1', name: 'Database Cluster', type: 'database', status: 'online', criticality: 'critical', lastUpdated: new Date() },
  { id: '2', name: 'API Gateway', type: 'api', status: 'online', criticality: 'high', lastUpdated: new Date() },
  { id: '3', name: 'Load Balancer', type: 'load-balancer', status: 'warning', criticality: 'high', lastUpdated: new Date() },
  { id: '4', name: 'Web Server 1', type: 'server', status: 'online', criticality: 'medium', lastUpdated: new Date() },
  { id: '5', name: 'Web Server 2', type: 'server', status: 'online', criticality: 'medium', lastUpdated: new Date() },
  { id: '6', name: 'Cache Layer', type: 'service', status: 'online', criticality: 'high', lastUpdated: new Date() },
  { id: '7', name: 'Payment Service', type: 'service', status: 'online', criticality: 'critical', lastUpdated: new Date() },
];

const initialDependencies: ComponentDependency[] = [
  { id: 'd1', sourceId: '2', targetId: '1', type: 'requires', criticality: 'critical' },
  { id: 'd2', sourceId: '3', targetId: '4', type: 'feeds', criticality: 'high' },
  { id: 'd3', sourceId: '3', targetId: '5', type: 'feeds', criticality: 'high' },
  { id: 'd4', sourceId: '4', targetId: '2', type: 'uses', criticality: 'high' },
  { id: 'd5', sourceId: '5', targetId: '2', type: 'uses', criticality: 'high' },
  { id: 'd6', sourceId: '2', targetId: '6', type: 'uses', criticality: 'medium' },
];

const initialWorkflows: BusinessWorkflow[] = [
  {
    id: 'w1',
    name: 'Customer Order Processing',
    description: 'End-to-end customer order processing workflow',
    businessProcess: 'Sales',
    criticality: 'critical',
    owner: 'Sales Team',
    lastUpdated: new Date(),
    steps: [
      { id: 's1', name: 'Order Validation', description: 'Validate order', primaryComponentId: '2', alternativeComponentIds: [], order: 1 },
      { id: 's2', name: 'Payment Processing', description: 'Process payment', primaryComponentId: '7', alternativeComponentIds: [], order: 2 },
      { id: 's3', name: 'Order Storage', description: 'Store order in DB', primaryComponentId: '1', alternativeComponentIds: [], order: 3 },
    ],
  },
  {
    id: 'w2',
    name: 'User Registration',
    description: 'New user registration process',
    businessProcess: 'Customer Management',
    criticality: 'high',
    owner: 'Customer Success Team',
    lastUpdated: new Date(),
    steps: [
      { id: 's4', name: 'Data Validation', description: 'Validate registration data', primaryComponentId: '2', alternativeComponentIds: [], order: 1 },
      { id: 's5', name: 'Account Creation', description: 'Create user account', primaryComponentId: '1', alternativeComponentIds: [], order: 2 },
    ],
  },
];

export const useItiacStore = create<ItiacState>()(
  persist(
    (set, get) => ({
      components: initialComponents,
      dependencies: initialDependencies,
      workflows: initialWorkflows,

      addComponent: (component) => {
        AuditService.logComponentAction('CREATE', component);
        set((state) => ({
          components: [...state.components, component],
        }));
      },

      updateComponent: (id, patch) => {
        const state = get();
        const beforeComponent = state.components.find(c => c.id === id);
        const updatedComponent = { ...beforeComponent, ...patch, lastUpdated: new Date() };
        
        if (beforeComponent) {
          AuditService.logComponentAction('UPDATE', updatedComponent, beforeComponent);
        }
        
        set((state) => ({
          components: state.components.map((c) => (c.id === id ? updatedComponent : c)),
        }));
      },

      deleteComponent: (id) => {
        const state = get();
        const component = state.components.find(c => c.id === id);
        
        if (component) {
          AuditService.logComponentAction('DELETE', component);
          
          // Also remove related dependencies
          const relatedDependencies = state.dependencies.filter(d => d.sourceId === id || d.targetId === id);
          relatedDependencies.forEach(dep => {
            const sourceComponent = state.components.find(c => c.id === dep.sourceId);
            const targetComponent = state.components.find(c => c.id === dep.targetId);
            AuditService.logDependencyAction('DELETE', dep, sourceComponent?.name, targetComponent?.name);
          });
          
          set((state) => ({
            components: state.components.filter(c => c.id !== id),
            dependencies: state.dependencies.filter(d => d.sourceId !== id && d.targetId !== id),
          }));
        }
      },

      addDependency: (dependency) => {
        const state = get();
        const sourceComponent = state.components.find(c => c.id === dependency.sourceId);
        const targetComponent = state.components.find(c => c.id === dependency.targetId);
        
        AuditService.logDependencyAction('CREATE', dependency, sourceComponent?.name, targetComponent?.name);
        
        set((state) => ({
          dependencies: [...state.dependencies, dependency],
        }));
      },

      updateDependency: (id, patch) => {
        const state = get();
        const beforeDependency = state.dependencies.find(d => d.id === id);
        const updatedDependency = { ...beforeDependency, ...patch };
        
        if (beforeDependency) {
          const sourceComponent = state.components.find(c => c.id === updatedDependency.sourceId);
          const targetComponent = state.components.find(c => c.id === updatedDependency.targetId);
          AuditService.logDependencyAction('UPDATE', updatedDependency, sourceComponent?.name, targetComponent?.name, beforeDependency);
        }
        
        set((state) => ({
          dependencies: state.dependencies.map((d) => (d.id === id ? updatedDependency : d)),
        }));
      },

      deleteDependency: (id) => {
        const state = get();
        const dependency = state.dependencies.find(d => d.id === id);
        
        if (dependency) {
          const sourceComponent = state.components.find(c => c.id === dependency.sourceId);
          const targetComponent = state.components.find(c => c.id === dependency.targetId);
          AuditService.logDependencyAction('DELETE', dependency, sourceComponent?.name, targetComponent?.name);
          
          set((state) => ({
            dependencies: state.dependencies.filter(d => d.id !== id),
          }));
        }
      },

      addWorkflow: (workflow) => {
        AuditService.logWorkflowAction('CREATE', workflow);
        set((state) => ({
          workflows: [...state.workflows, workflow],
        }));
      },

      updateWorkflow: (id, patch) => {
        const state = get();
        const beforeWorkflow = state.workflows.find(w => w.id === id);
        const updatedWorkflow = { ...beforeWorkflow, ...patch, lastUpdated: new Date() };
        
        if (beforeWorkflow) {
          AuditService.logWorkflowAction('UPDATE', updatedWorkflow, beforeWorkflow);
        }
        
        set((state) => ({
          workflows: state.workflows.map((w) => (w.id === id ? updatedWorkflow : w)),
        }));
      },

      deleteWorkflow: (id) => {
        const state = get();
        const workflow = state.workflows.find(w => w.id === id);
        
        if (workflow) {
          AuditService.logWorkflowAction('DELETE', workflow);
          
          set((state) => ({
            workflows: state.workflows.filter(w => w.id !== id),
          }));
        }
      },

      importData: (data) => {
        if (data.components) {
          AuditService.logImport('components', 'bulk-import', data.components.length);
        }
        if (data.dependencies) {
          AuditService.logImport('dependencies', 'bulk-import', data.dependencies.length);
        }
        if (data.workflows) {
          AuditService.logImport('workflows', 'bulk-import', data.workflows.length);
        }
        
        set((state) => ({
          components: data.components || state.components,
          dependencies: data.dependencies || state.dependencies,
          workflows: data.workflows || state.workflows,
        }));
      },

      resetAllData: () => {
        AuditService.log('DELETE', 'SYSTEM', { action: 'reset_all_data' });
        set(() => ({
          components: initialComponents,
          dependencies: initialDependencies,
          workflows: initialWorkflows,
        }));
      },
    }),
    {
      name: 'itiac-store',
      storage: createJSONStorage(() => localStorage),
      // simple revive for dates on load
      partialize: (state) => state,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // revive date objects
        state.components = state.components.map((c) => ({ ...c, lastUpdated: new Date(c.lastUpdated as any) }));
        state.workflows = state.workflows.map((w) => ({ ...w, lastUpdated: new Date(w.lastUpdated as any) }));
      },
    }
  )
);
