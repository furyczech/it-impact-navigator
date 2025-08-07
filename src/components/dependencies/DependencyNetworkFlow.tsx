import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import { ITComponent, ComponentDependency } from '@/types/itiac';

interface DependencyNetworkFlowProps {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  onAddDependency: (sourceId: string, targetId: string) => void;
}

const getComponentColor = (criticality: string) => {
  switch (criticality) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#3b82f6';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return '#10b981';
    case 'offline': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'maintenance': return '#6b7280';
    default: return '#6b7280';
  }
};

export const DependencyNetworkFlow = ({ components, dependencies, onAddDependency }: DependencyNetworkFlowProps) => {
  // Convert components to nodes
  const initialNodes: Node[] = useMemo(() => 
    components.map((component, index) => ({
      id: component.id,
      type: 'default',
      position: { 
        x: (index % 3) * 250 + 100, 
        y: Math.floor(index / 3) * 150 + 50 
      },
      data: { 
        label: (
          <div className="text-center">
            <div className="font-medium">{component.name}</div>
            <div className="text-xs text-gray-500">{component.type}</div>
          </div>
        )
      },
      style: {
        backgroundColor: getComponentColor(component.criticality),
        color: 'white',
        border: `2px solid ${getStatusColor(component.status)}`,
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
      },
    })), [components]);

  // Convert dependencies to edges
  const initialEdges: Edge[] = useMemo(() => 
    dependencies.map((dep) => ({
      id: dep.id,
      source: dep.sourceId,
      target: dep.targetId,
      type: 'smoothstep',
      animated: dep.criticality === 'critical',
      style: { 
        strokeWidth: dep.criticality === 'critical' ? 3 : 2,
        stroke: getComponentColor(dep.criticality),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getComponentColor(dep.criticality),
      },
      label: dep.type,
      labelStyle: { 
        fontSize: '12px',
        fontWeight: 'bold',
      },
    })), [dependencies]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        style: { strokeWidth: 2, stroke: '#6b7280' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      
      // Call the callback to handle dependency creation
      if (params.source && params.target) {
        onAddDependency(params.source, params.target);
      }
    },
    [setEdges, onAddDependency],
  );

  return (
    <div className="h-96 bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const component = components.find(c => c.id === node.id);
            return component ? getComponentColor(component.criticality) : '#6b7280';
          }}
          pannable 
          zoomable 
        />
      </ReactFlow>
    </div>
  );
};