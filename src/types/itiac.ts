export interface ITComponent {
  id: string;
  name: string;
  type: 'server' | 'database' | 'api' | 'load-balancer' | 'network' | 'application' | 'service';
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  location?: string;
  owner?: string;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

export interface ComponentDependency {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'requires' | 'uses' | 'feeds' | 'monitors';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  primaryComponentId?: string;
  alternativeComponentIds?: string[];
  fallbackWorkflowId?: string;
  order: number;
}

export interface BusinessWorkflow {
  id: string;
  name: string;
  description?: string;
  businessProcess: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  steps: WorkflowStep[];
  owner?: string;
  lastUpdated: Date;
}

export interface ImpactAnalysis {
  id: string;
  componentId: string;
  affectedComponents: string[];
  affectedWorkflows: string[];
  riskScore: number;
  businessImpactScore: number;
  recommendations: string[];
  timestamp: Date;
}