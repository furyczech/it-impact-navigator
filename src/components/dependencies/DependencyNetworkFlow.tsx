import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  ReactFlowInstance,
  MarkerType,
} from '@xyflow/react';
import { ITComponent, ComponentDependency } from '@/types/itiac';

interface DependencyNetworkFlowProps {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  onAddDependency: (sourceId: string, targetId: string) => void;
  // New: controls
  filters?: {
    nodeTypes?: string[]; // ITComponent['type'][]
    nodeCriticalities?: Array<'low'|'medium'|'high'|'critical'>;
    edgeTypes?: string[]; // ComponentDependency['type'][]
    edgeCriticalities?: Array<'low'|'medium'|'high'|'critical'>;
  };
  groupBy?: 'none' | 'type' | 'criticality';
  layoutTrigger?: number; // increment to re-layout
  fitViewTrigger?: number; // increment to fit view
  fullscreen?: boolean; // adjust height if needed
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

export const DependencyNetworkFlow = ({ components, dependencies, onAddDependency, filters, groupBy = 'none', layoutTrigger = 0, fitViewTrigger = 0, fullscreen = false }: DependencyNetworkFlowProps) => {
  const rfRef = useRef<ReactFlowInstance | null>(null);

  // Apply filters
  const filteredComponents = useMemo(() => {
    let cs = components;
    if (filters?.nodeTypes && filters.nodeTypes.length) {
      cs = cs.filter(c => filters.nodeTypes!.includes(c.type as any));
    }
    if (filters?.nodeCriticalities && filters.nodeCriticalities.length) {
      cs = cs.filter(c => filters.nodeCriticalities!.includes(c.criticality));
    }
    return cs;
  }, [components, filters]);

  const filteredDependencies = useMemo(() => {
    let ds = dependencies;
    if (filters?.edgeTypes && filters.edgeTypes.length) {
      ds = ds.filter(d => filters.edgeTypes!.includes(d.type as any));
    }
    if (filters?.edgeCriticalities && filters.edgeCriticalities.length) {
      ds = ds.filter(d => filters.edgeCriticalities!.includes(d.criticality));
    }
    // also only keep edges connecting visible nodes
    const visibleIds = new Set(filteredComponents.map(c => c.id));
    ds = ds.filter(d => visibleIds.has(d.sourceId) && visibleIds.has(d.targetId));
    return ds;
  }, [dependencies, filters, filteredComponents]);

  // Compute positions
  const computePosition = (index: number, col: number, row: number) => ({
    x: col * 280 + 100,
    y: row * 170 + 50,
  });

  // Build nodes: hierarchical when no grouping, grouped otherwise
  const groupedNodes: Node[] = useMemo(() => {
    // Helper to create a node with consistent styling
    const createNode = (component: ITComponent, colIdx: number, rowIdx: number): Node => ({
      id: component.id,
      type: 'default',
      position: computePosition(0, colIdx, rowIdx),
      data: {
        label: (
          <div className="text-center">
            <div className="font-medium">{component.name}</div>
            <div className="text-xs text-gray-200/90">{component.type}</div>
          </div>
        )
      },
      style: {
        backgroundColor: getComponentColor(component.criticality),
        color: 'white',
        border: `2px solid ${getStatusColor(component.status)}`,
        borderRadius: '10px',
        padding: '12px',
        minWidth: '190px',
        fontSize: '13px',
      },
    });

    if (groupBy === 'none') {
      // Hierarchical layout by dependency depth (source -> target)
      const compIds = new Set(filteredComponents.map(c => c.id));
      const edges = filteredDependencies.filter(e => compIds.has(e.sourceId) && compIds.has(e.targetId));

      // Longest-path depth approximation (bounded iterations to handle cycles)
      const depth: Record<string, number> = {};
      filteredComponents.forEach(c => { depth[c.id] = 0; });
      const N = filteredComponents.length;
      for (let k = 0; k < Math.max(1, Math.min(N, 50)); k++) {
        let changed = false;
        for (const e of edges) {
          const nd = Math.max(depth[e.targetId] ?? 0, (depth[e.sourceId] ?? 0) + 1);
          if (nd !== (depth[e.targetId] ?? 0)) { depth[e.targetId] = nd; changed = true; }
        }
        if (!changed) break;
      }

      // Normalize depths starting at 0
      const maxDepth = Object.values(depth).reduce((a, b) => Math.max(a, b), 0);
      const layerMap: Record<number, ITComponent[]> = {};
      filteredComponents.forEach(c => {
        const d = Math.max(0, Math.min(maxDepth, depth[c.id] ?? 0));
        (layerMap[d] ||= []).push(c);
      });

      // Optional: stabilize ordering within each layer by criticality then name
      const critOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 } as any;
      const nodes: Node[] = [];
      for (let col = 0; col <= maxDepth; col++) {
        const list = (layerMap[col] || []).slice().sort((a, b) => {
          const ca = critOrder[a.criticality] ?? 9;
          const cb = critOrder[b.criticality] ?? 9;
          if (ca !== cb) return ca - cb;
          return a.name.localeCompare(b.name);
        });
        list.forEach((component, rowIdx) => {
          nodes.push(createNode(component, col, rowIdx));
        });
      }
      return nodes;
    }

    // Grouped grid (by type or criticality)
    const groups: Record<string, ITComponent[]> = {};
    if (groupBy === 'type') {
      filteredComponents.forEach(c => {
        const k = String(c.type);
        (groups[k] ||= []).push(c);
      });
    } else if (groupBy === 'criticality') {
      filteredComponents.forEach(c => {
        const k = c.criticality;
        (groups[k] ||= []).push(c);
      });
    }

    const groupKeys = Object.keys(groups);
    const nodes: Node[] = [];
    groupKeys.forEach((gk, colIdx) => {
      const list = groups[gk];
      list.forEach((component, rowIdx) => {
        nodes.push(createNode(component, colIdx, rowIdx));
      });
    });
    return nodes;
  }, [filteredComponents, filteredDependencies, groupBy]);

  const initialNodes: Node[] = groupedNodes;

  // Convert dependencies to edges
  const initialEdges: Edge[] = useMemo(() => 
    filteredDependencies.map((dep) => ({
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
        fontSize: '13px',
        fontWeight: '600',
        background: 'rgba(255,255,255,0.6)',
        padding: 2,
        borderRadius: 4,
      },
    })), [filteredDependencies]);

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

  // Re-layout when trigger or grouping/filters change
  useEffect(() => {
    setNodes(initialNodes);
    const id = setTimeout(() => {
      try { rfRef.current?.fitView({ padding: 0.2 }); } catch {}
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutTrigger, groupBy, filteredComponents.length]);

  // Update edges when filters change
  useEffect(() => {
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDependencies.length]);

  // Fit view on demand
  useEffect(() => {
    try { rfRef.current?.fitView({ padding: 0.2 }); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitViewTrigger]);

  return (
    <div className={`bg-background rounded-lg border border-border ${fullscreen ? 'h-[90vh]' : 'h-[72vh] md:h-[80vh]'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => { rfRef.current = instance; }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        attributionPosition="bottom-left"
        snapToGrid
        snapGrid={[15, 15]}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#aaa" gap={16} />
        <Controls position="bottom-right" showInteractive={true} />
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