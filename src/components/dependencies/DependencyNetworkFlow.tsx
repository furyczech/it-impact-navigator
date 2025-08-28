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
import { computeImpactedFromOfflines } from '@/lib/utils';
import { 
  Server, 
  Database, 
  Globe, 
  Zap 
} from 'lucide-react';

interface DependencyNetworkFlowProps {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  onAddDependency: (sourceId: string, targetId: string) => void;
  onDeleteDependency?: (dependencyId: string) => void;
  filters?: {
    nodeTypes?: string[]; 
    nodeCriticalities?: Array<'low'|'medium'|'high'|'critical'>;
    edgeTypes?: string[]; 
    edgeCriticalities?: Array<'low'|'medium'|'high'|'critical'>;
  };
  groupBy?: 'none' | 'type' | 'criticality';
  layoutTrigger?: number; 
  fitViewTrigger?: number; 
  fullscreen?: boolean; 
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

const getNeutralNodeBg = () => 'hsl(var(--card))';

const getCriticalityStrokeWidth = (criticality: string) => {
  switch (criticality) {
    case 'critical': return 3;
    case 'high': return 2;
    case 'medium': return 1.5;
    default: return 1;
  }
};

const getNodeIcon = (type: string) => {
  switch (String(type)) {
    case 'server':
      return Server;
    case 'database':
    case 'storage':
    case 'bucket':
      return Database;
    case 'app':
    case 'application':
    case 'service':
    case 'api':
    case 'endpoint':
      return Globe;
    case 'network':
    case 'load-balancer':
      return Zap;
    default:
      return Server;
  }
};

export const DependencyNetworkFlow = ({ components, dependencies, onAddDependency, onDeleteDependency, filters, groupBy = 'none', layoutTrigger = 0, fitViewTrigger = 0, fullscreen = false, layoutEngine = 'internal', direction = 'TB' }: DependencyNetworkFlowProps) => {
  const rfRef = useRef<ReactFlowInstance | null>(null);

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
    const visibleIds = new Set(filteredComponents.map(c => c.id));
    ds = ds.filter(d => visibleIds.has(d.sourceId) && visibleIds.has(d.targetId));
    return ds;
  }, [dependencies, filters, filteredComponents]);

  const impactedIds = useMemo(() => {
    const visible = new Set(filteredComponents.map(c => c.id));
    return computeImpactedFromOfflines(filteredComponents, filteredDependencies, visible);
  }, [filteredComponents, filteredDependencies]);

  const GAP_X = 300;
  const GAP_Y = 240;
  const computePosition = (index: number, col: number, row: number) => ({
    x: col * GAP_X + 100,
    y: row * GAP_Y + 50,
  });

  const groupedNodes: Node[] = useMemo(() => {
    const createNode = (component: ITComponent, colIdx: number, rowIdx: number, orientation: 'LR'|'TB'): Node => {
      const Icon = getNodeIcon(component.type);
      return ({
        id: component.id,
        type: 'default',
        position: orientation === 'LR' 
          ? computePosition(0, colIdx, rowIdx) 
          : { x: rowIdx * GAP_X + 100, y: colIdx * GAP_Y + 50 },
        sourcePosition: orientation === 'LR' ? Position.Right : Position.Bottom,
        targetPosition: orientation === 'LR' ? Position.Left : Position.Top,
        data: {
          label: (
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-foreground/80" />
              <div className="text-left">
                <div className="font-medium text-foreground text-sm leading-tight">{component.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{String(component.type).replace('-', ' ')}</div>
              </div>
            </div>
          )
        },
        style: {
          backgroundColor: getNeutralNodeBg(),
          color: 'hsl(var(--foreground))',
          borderColor: 'hsl(var(--border))',
          borderStyle: 'solid',
          borderWidth: getCriticalityStrokeWidth(component.criticality),
          borderRadius: '12px',
          padding: '12px 14px',
          minWidth: '220px',
          fontSize: '13px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
        },
      });
    };

    if (groupBy === 'none') {
      if (layoutEngine === 'dagre' || layoutEngine === 'elk') {
        console.warn(`[DependencyNetworkFlow] ${layoutEngine} not installed. Falling back to internal layout.`);
      }

      const compIds = new Set(filteredComponents.map(c => c.id));
      const edges = filteredDependencies.filter(e => compIds.has(e.sourceId) && compIds.has(e.targetId));
      const undirectedAdj = new Map<string, Set<string>>();
      const ensure = (id: string) => { if (!undirectedAdj.has(id)) undirectedAdj.set(id, new Set()); return undirectedAdj.get(id)!; };
      filteredComponents.forEach(c => ensure(c.id));
      edges.forEach(e => { ensure(e.sourceId).add(e.targetId); ensure(e.targetId).add(e.sourceId); });

      const visited = new Set<string>();
      const componentsCC: string[][] = [];
      for (const id of compIds) {
        if (visited.has(id)) continue;
        const queue: string[] = [id];
        visited.add(id);
        const cc: string[] = [];
        while (queue.length) {
          const cur = queue.shift()!;
          cc.push(cur);
          for (const nb of (undirectedAdj.get(cur) || [])) {
            if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
          }
        }
        componentsCC.push(cc);
      }
      componentsCC.sort((a, b) => b.length - a.length);

      const critOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 } as any;

      const nodes: Node[] = [];
      let colBase = 0; 
      const CLUSTER_PAD_COLS = 1; 

      for (const cc of componentsCC) {
        const ccSet = new Set(cc);
        const eCC = edges.filter(e => ccSet.has(e.sourceId) && ccSet.has(e.targetId));

        const depth: Record<string, number> = {};
        cc.forEach(id => { depth[id] = 0; });
        const N = cc.length;
        for (let k = 0; k < Math.max(1, Math.min(N, 50)); k++) {
          let changed = false;
          for (const e of eCC) {
            const nd = Math.max(depth[e.targetId] ?? 0, (depth[e.sourceId] ?? 0) + 1);
            if (nd !== (depth[e.targetId] ?? 0)) { depth[e.targetId] = nd; changed = true; }
          }
          if (!changed) break;
        }

        const maxDepth = cc.reduce((m, id) => Math.max(m, depth[id] ?? 0), 0);
        const layers: ITComponent[][] = Array.from({ length: maxDepth + 1 }, () => []);
        cc.forEach(id => {
          const comp = filteredComponents.find(c => c.id === id)!;
          const d = Math.max(0, Math.min(maxDepth, depth[id] ?? 0));
          layers[d].push(comp);
        });

        const idToIndexInLayer: Record<string, number> = {};
        layers.forEach((layer) => {
          layer.sort((a, b) => a.name.localeCompare(b.name));
          layer.forEach((c, i) => { idToIndexInLayer[c.id] = i; });
        });

        const predecessors = (id: string) => eCC
          .filter(e => e.targetId === id)
          .map(e => e.sourceId)
          .filter(src => (depth[src] ?? 0) === (depth[id] ?? 0) - 1);

        const successors = (id: string) => eCC
          .filter(e => e.sourceId === id)
          .map(e => e.targetId)
          .filter(tgt => (depth[tgt] ?? 0) === (depth[id] ?? 0) + 1);

        const averageIndex = (ids: string[]) => {
          if (!ids.length) return Number.POSITIVE_INFINITY;
          const s = ids.reduce((acc, nid) => acc + (idToIndexInLayer[nid] ?? 0), 0);
          return s / ids.length;
        };

        for (let d = 1; d <= maxDepth; d++) {
          const layer = layers[d];
          layer.sort((a, b) => {
            const av = averageIndex(predecessors(a.id));
            const bv = averageIndex(predecessors(b.id));
            if (av !== bv) return av - bv;
            const ca = critOrder[a.criticality] ?? 9;
            const cb = critOrder[b.criticality] ?? 9;
            if (ca !== cb) return ca - cb;
            return a.name.localeCompare(b.name);
          });
          layer.forEach((c, i) => { idToIndexInLayer[c.id] = i; });
        }

        for (let d = maxDepth - 1; d >= 0; d--) {
          const layer = layers[d];
          layer.sort((a, b) => {
            const av = averageIndex(successors(a.id));
            const bv = averageIndex(successors(b.id));
            if (av !== bv) return av - bv;
            const ca = critOrder[a.criticality] ?? 9;
            const cb = critOrder[b.criticality] ?? 9;
            if (ca !== cb) return ca - cb;
            return a.name.localeCompare(b.name);
          });
          layer.forEach((c, i) => { idToIndexInLayer[c.id] = i; });
        }

        for (let col = 0; col <= maxDepth; col++) {
          const layer = layers[col];
          layer.forEach((component, rowIdx) => {
            nodes.push(createNode(component, colBase + col, rowIdx, direction));
          });
        }

        colBase += (maxDepth + 1) + CLUSTER_PAD_COLS;
      }
      return nodes;
    }

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
        nodes.push(createNode(component, colIdx, rowIdx, 'LR'));
      });
    });
    return nodes;
  }, [filteredComponents, filteredDependencies, groupBy, layoutEngine, direction]);

  const initialNodes: Node[] = groupedNodes;

  const initialEdges: Edge[] = useMemo(() => 
    filteredDependencies.map((dep) => ({
      id: dep.id,
      source: dep.sourceId,
      target: dep.targetId,
      type: 'step',
      animated: false,
      style: { 
        strokeWidth: 2,
        stroke: '#6b7280', 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7280',
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
      
      if (params.source && params.target) {
        onAddDependency(params.source, params.target);
      }
    },
    [setEdges, onAddDependency],
  );

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    if (onDeleteDependency) {
      onDeleteDependency(edge.id);
    }
  }, [onDeleteDependency]);

  useEffect(() => {
    setNodes(initialNodes);
    const id = setTimeout(() => {
      try { rfRef.current?.fitView({ padding: 0.2 }); } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, [layoutTrigger, groupBy, filteredComponents.length, initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  useEffect(() => {
    try { rfRef.current?.fitView({ padding: 0.2 }); } catch {}
  }, [fitViewTrigger]);

  useEffect(() => {
    if (groupBy !== 'none') return; 
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
          filteredComponents.forEach(c => {
            g.setNode(c.id, { label: c.name, width: NODE_W, height: NODE_H });
          });
          filteredDependencies.forEach(e => {
            g.setEdge(e.sourceId, e.targetId);
          });
          dagre.layout(g);
          const nodesFromDagre: Node[] = filteredComponents.map((c) => {
            const pos = g.node(c.id);
            const n = {
              id: c.id,
              type: 'default',
              position: { x: Math.round(pos.x - NODE_W / 2), y: Math.round(pos.y - NODE_H / 2) },
              sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
              targetPosition: direction === 'LR' ? Position.Left : Position.Top,
              data: {
                label: (
                  <div className="flex items-center gap-2">
                    {(() => { const I = getNodeIcon(c.type); return <I className="w-4 h-4 text-foreground/80" />; })()}
                    <div className="text-left">
                      <div className="font-medium text-foreground text-sm leading-tight">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{String(c.type).replace('-', ' ')}</div>
                    </div>
                  </div>
                )
              },
              style: {
                backgroundColor: getNeutralNodeBg(),
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--border))',
                borderStyle: 'solid',
                borderWidth: getCriticalityStrokeWidth(c.criticality),
                borderRadius: '12px',
                padding: '12px 14px',
                minWidth: '220px',
                fontSize: '13px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
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
                  <div className="flex items-center gap-2">
                    {(() => { const I = getNodeIcon(c.type); return <I className="w-4 h-4 text-foreground/80" />; })()}
                    <div className="text-left">
                      <div className="font-medium text-foreground text-sm leading-tight">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{String(c.type).replace('-', ' ')}</div>
                    </div>
                  </div>
                )
              },
              style: {
                backgroundColor: getNeutralNodeBg(),
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--border))',
                borderStyle: 'solid',
                borderWidth: getCriticalityStrokeWidth(c.criticality),
                borderRadius: '12px',
                padding: '12px 14px',
                minWidth: '220px',
                fontSize: '13px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
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
  }, [layoutEngine, direction, filteredComponents, filteredDependencies, groupBy, layoutTrigger, impactedIds, setNodes]);

  return (
    <div className={`bg-background rounded-lg border border-border ${fullscreen ? 'h-[90vh]' : 'h-[72vh] md:h-[80vh]'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => { rfRef.current = instance; }}
        onEdgeClick={onEdgeClick}
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
          nodeColor={() => '#9ca3af'}
          pannable 
          zoomable 
        />
      </ReactFlow>
    </div>
  );
};