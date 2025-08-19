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
import { Position } from '@xyflow/react';
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
  layoutEngine?: 'internal' | 'dagre' | 'elk';
  direction?: 'LR' | 'TB';
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

// Match NetworkTopology color scheme (CSS variables) and add 'impacted'
const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'hsl(var(--success))';
    case 'warning': return 'hsl(var(--warning))';
    case 'offline': return 'hsl(var(--destructive))';
    case 'maintenance': return 'hsl(var(--secondary))';
    case 'impacted': return 'hsl(var(--primary))';
    default: return 'hsl(var(--muted))';
  }
};

const getCriticalityStrokeWidth = (criticality: string) => {
  switch (criticality) {
    case 'critical': return 3;
    case 'high': return 2;
    case 'medium': return 1.5;
    default: return 1;
  }
};

export const DependencyNetworkFlow = ({ components, dependencies, onAddDependency, filters, groupBy = 'none', layoutTrigger = 0, fitViewTrigger = 0, fullscreen = false, layoutEngine = 'internal', direction = 'TB' }: DependencyNetworkFlowProps) => {
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

  // Compute impacted nodes (propagation from offline sources along source->target edges)
  const impactedIds = useMemo(() => {
    const offlineIds = new Set(filteredComponents.filter(c => c.status === 'offline').map(c => c.id));
    if (offlineIds.size === 0) return new Set<string>();
    const adj = new Map<string, string[]>();
    filteredDependencies.forEach(dep => {
      if (!adj.has(dep.sourceId)) adj.set(dep.sourceId, []);
      adj.get(dep.sourceId)!.push(dep.targetId);
    });
    const impacted = new Set<string>();
    const queue: string[] = Array.from(offlineIds);
    const visited = new Set<string>();
    while (queue.length) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const nbrs = adj.get(cur) || [];
      for (const nb of nbrs) {
        if (!offlineIds.has(nb)) {
          impacted.add(nb);
          queue.push(nb);
        }
      }
    }
    return impacted;
  }, [filteredComponents, filteredDependencies]);

  // Spacing constants (larger Y-gap to reduce overlaps)
  const GAP_X = 300;
  const GAP_Y = 240;
  // Compute positions
  const computePosition = (index: number, col: number, row: number) => ({
    x: col * GAP_X + 100,
    y: row * GAP_Y + 50,
  });

  // Build nodes: hierarchical when no grouping, grouped otherwise
  const groupedNodes: Node[] = useMemo(() => {
    // Helper to create a node with consistent styling
    const createNode = (component: ITComponent, colIdx: number, rowIdx: number, orientation: 'LR'|'TB'): Node => ({
      id: component.id,
      type: 'default',
      position: orientation === 'LR' 
        ? computePosition(0, colIdx, rowIdx) 
        : { x: rowIdx * GAP_X + 100, y: colIdx * GAP_Y + 50 },
      sourcePosition: orientation === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: orientation === 'LR' ? Position.Left : Position.Top,
      data: {
        label: (
          <div className="text-center">
            <div className="font-medium">{component.name}</div>
            <div className="text-xs text-gray-200/90">{component.type}</div>
          </div>
        )
      },
      style: {
        backgroundColor: getStatusColor(component.status === 'offline' ? 'offline' : (impactedIds.has(component.id) ? 'impacted' : component.status)),
        color: 'white',
        borderColor: 'hsl(var(--background))',
        borderStyle: 'solid',
        borderWidth: getCriticalityStrokeWidth(component.criticality),
        borderRadius: '10px',
        padding: '12px',
        minWidth: '190px',
        fontSize: '13px',
      },
    });

    if (groupBy === 'none') {
      // Optional external layout engines
      if (layoutEngine === 'dagre' || layoutEngine === 'elk') {
        // Fallback to internal if libs are not present
        console.warn(`[DependencyNetworkFlow] ${layoutEngine} not installed. Falling back to internal layout.`);
      }
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
      const layers: ITComponent[][] = Array.from({ length: maxDepth + 1 }, () => []);
      filteredComponents.forEach(c => {
        const d = Math.max(0, Math.min(maxDepth, depth[c.id] ?? 0));
        layers[d].push(c);
      });

      // Barycentric ordering to reduce crossings
      const idToIndexInLayer: Record<string, number> = {};
      layers.forEach((layer, d) => {
        layer.sort((a, b) => a.name.localeCompare(b.name));
        layer.forEach((c, i) => { idToIndexInLayer[c.id] = i; });
      });

      const predecessors = (id: string) => edges
        .filter(e => e.targetId === id)
        .map(e => e.sourceId)
        .filter(src => (depth[src] ?? 0) === (depth[id] ?? 0) - 1);

      const successors = (id: string) => edges
        .filter(e => e.sourceId === id)
        .map(e => e.targetId)
        .filter(tgt => (depth[tgt] ?? 0) === (depth[id] ?? 0) + 1);

      const averageIndex = (ids: string[]) => {
        if (!ids.length) return Number.POSITIVE_INFINITY;
        const s = ids.reduce((acc, nid) => acc + (idToIndexInLayer[nid] ?? 0), 0);
        return s / ids.length;
      };

      // Left-to-right sweep (by depth increasing): order by predecessors
      for (let d = 1; d <= maxDepth; d++) {
        const layer = layers[d];
        layer.sort((a, b) => {
          const av = averageIndex(predecessors(a.id));
          const bv = averageIndex(predecessors(b.id));
          if (av !== bv) return av - bv;
          // tie-break by criticality then name
          const critOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 } as any;
          const ca = critOrder[a.criticality] ?? 9;
          const cb = critOrder[b.criticality] ?? 9;
          if (ca !== cb) return ca - cb;
          return a.name.localeCompare(b.name);
        });
        layer.forEach((c, i) => { idToIndexInLayer[c.id] = i; });
      }

      // Right-to-left sweep: order by successors
      for (let d = maxDepth - 1; d >= 0; d--) {
        const layer = layers[d];
        layer.sort((a, b) => {
          const av = averageIndex(successors(a.id));
          const bv = averageIndex(successors(b.id));
          if (av !== bv) return av - bv;
          const critOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 } as any;
          const ca = critOrder[a.criticality] ?? 9;
          const cb = critOrder[b.criticality] ?? 9;
          if (ca !== cb) return ca - cb;
          return a.name.localeCompare(b.name);
        });
        layer.forEach((c, i) => { idToIndexInLayer[c.id] = i; });
      }

      // Build nodes using final ordering
      const nodes: Node[] = [];
      for (let col = 0; col <= maxDepth; col++) {
        const layer = layers[col];
        layer.forEach((component, rowIdx) => {
          nodes.push(createNode(component, col, rowIdx, direction));
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
        // Grouped layout remains left-to-right
        nodes.push(createNode(component, colIdx, rowIdx, 'LR'));
      });
    });
    return nodes;
  }, [filteredComponents, filteredDependencies, groupBy, layoutEngine, direction]);

  const initialNodes: Node[] = groupedNodes;

  // Convert dependencies to edges
  const initialEdges: Edge[] = useMemo(() => 
    filteredDependencies.map((dep) => ({
      id: dep.id,
      source: dep.sourceId,
      target: dep.targetId,
      type: 'step',
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
        type: 'step',
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

  // Optional external layout engines (Dagre/ELK) via dynamic import
  useEffect(() => {
    if (groupBy !== 'none') return; // external layout only for hierarchical mode
    if (layoutEngine === 'internal') return;
    let cancelled = false;
    const run = async () => {
      try {
        const NODE_W = 200;
        const NODE_H = 70;
        const safeImport = async (name: string): Promise<any | null> => {
          try {
            const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
            return await dynamicImport(name);
          } catch {
            return null;
          }
        };
        if (layoutEngine === 'dagre') {
          const mod: any = await safeImport('dagre');
          if (!mod) { console.warn('[DependencyNetworkFlow] dagre not installed. Using internal layout.'); return; }
          const dagre = mod.default ?? mod;
          const g = new dagre.graphlib.Graph();
          g.setGraph({ rankdir: direction === 'LR' ? 'LR' : 'TB', nodesep: 50, ranksep: 120, marginx: 20, marginy: 20 });
          g.setDefaultEdgeLabel(() => ({}));
          // nodes
          filteredComponents.forEach(c => {
            g.setNode(c.id, { label: c.name, width: NODE_W, height: NODE_H });
          });
          // edges
          filteredDependencies.forEach(e => {
            g.setEdge(e.sourceId, e.targetId);
          });
          dagre.layout(g);
          // Build nodes from dagre positions
          const nodesFromDagre: Node[] = filteredComponents.map((c) => {
            const pos = g.node(c.id);
            const colIdx = 0; const rowIdx = 0; // not used in position when overriding
            const n = {
              id: c.id,
              type: 'default',
              position: { x: Math.round(pos.x - NODE_W / 2), y: Math.round(pos.y - NODE_H / 2) },
              sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
              targetPosition: direction === 'LR' ? Position.Left : Position.Top,
              data: {
                label: (
                  <div className="text-center">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-200/90">{c.type}</div>
                  </div>
                )
              },
              style: {
                backgroundColor: getStatusColor(c.status === 'offline' ? 'offline' : (impactedIds.has(c.id) ? 'impacted' : c.status)),
                color: 'white',
                borderColor: 'hsl(var(--background))',
                borderStyle: 'solid',
                borderWidth: getCriticalityStrokeWidth(c.criticality),
                borderRadius: '10px',
                padding: '12px',
                minWidth: '190px',
                fontSize: '13px',
              },
            } as Node;
            return n;
          });
          if (!cancelled) {
            setNodes(nodesFromDagre);
            setTimeout(() => { try { rfRef.current?.fitView({ padding: 0.2 }); } catch {} }, 0);
          }
        } else if (layoutEngine === 'elk') {
          const mod: any = await safeImport('elkjs');
          if (!mod) { console.warn('[DependencyNetworkFlow] elkjs not installed. Using internal layout.'); return; }
          const Elk = mod.default ?? mod;
          const elk = new Elk();
          const elkGraph = {
            id: 'root',
            layoutOptions: {
              'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
              'elk.spacing.nodeNode': '50',
              'elk.layered.spacing.nodeNodeBetweenLayers': '120',
              'elk.edgeRouting': 'ORTHOGONAL',
            },
            children: filteredComponents.map(c => ({ id: c.id, width: NODE_W, height: NODE_H })),
            edges: filteredDependencies.map(e => ({ id: e.id, sources: [e.sourceId], targets: [e.targetId] })),
          } as any;
          const res = await elk.layout(elkGraph);
          const posMap: Record<string, {x:number;y:number}> = {};
          res.children?.forEach((n: any) => { posMap[n.id] = { x: n.x || 0, y: n.y || 0 }; });
          const nodesFromElk: Node[] = filteredComponents.map((c) => {
            const p = posMap[c.id] || { x: 0, y: 0 };
            return {
              id: c.id,
              type: 'default',
              position: { x: Math.round(p.x), y: Math.round(p.y) },
              sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
              targetPosition: direction === 'LR' ? Position.Left : Position.Top,
              data: {
                label: (
                  <div className="text-center">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-200/90">{c.type}</div>
                  </div>
                )
              },
              style: {
                backgroundColor: getStatusColor(c.status === 'offline' ? 'offline' : (impactedIds.has(c.id) ? 'impacted' : c.status)),
                color: 'white',
                borderColor: 'hsl(var(--background))',
                borderStyle: 'solid',
                borderWidth: getCriticalityStrokeWidth(c.criticality),
                borderRadius: '10px',
                padding: '12px',
                minWidth: '190px',
                fontSize: '13px',
              },
            } as Node;
          });
          if (!cancelled) {
            setNodes(nodesFromElk);
            setTimeout(() => { try { rfRef.current?.fitView({ padding: 0.2 }); } catch {} }, 0);
          }
        }
      } catch (e) {
        console.warn('[DependencyNetworkFlow] External layout failed, using internal.', e);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutEngine, direction, filteredComponents, filteredDependencies, groupBy, layoutTrigger, impactedIds]);

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
            if (!component) return '#6b7280';
            const status = component.status === 'offline' ? 'offline' : (impactedIds.has(component.id) ? 'impacted' : component.status);
            // MiniMap expects a color string; CSS vars may not render, fallback to approximate hex for minimap
            switch (status) {
              case 'online': return '#10b981';
              case 'warning': return '#f59e0b';
              case 'impacted': return '#3b82f6';
              case 'offline': return '#ef4444';
              case 'maintenance': return '#6b7280';
              default: return '#6b7280';
            }
          }}
          pannable 
          zoomable 
        />
      </ReactFlow>
    </div>
  );
};