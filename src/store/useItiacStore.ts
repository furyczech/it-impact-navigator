import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ITComponent, ComponentDependency, BusinessWorkflow } from '@/types/itiac';

interface ItiacState {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  workflows: BusinessWorkflow[];
  // actions
  addComponent: (component: ITComponent) => void;
  updateComponent: (id: string, patch: Partial<ITComponent>) => void;
  addDependency: (dependency: ComponentDependency) => void;
  addWorkflow: (workflow: BusinessWorkflow) => void;
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

      addComponent: (component) => set((state) => ({
        components: [...state.components, component],
      })),

      updateComponent: (id, patch) => set((state) => ({
        components: state.components.map((c) => (c.id === id ? { ...c, ...patch, lastUpdated: new Date() } : c)),
      })),

      addDependency: (dependency) => set((state) => ({
        dependencies: [...state.dependencies, dependency],
      })),

      addWorkflow: (workflow) => set((state) => ({
        workflows: [...state.workflows, workflow],
      })),
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
