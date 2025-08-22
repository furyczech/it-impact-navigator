import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, computeImpactedFromOfflines, buildForwardMap, traverseDownstream } from "@/lib/utils";
import { ITComponent, ComponentDependency } from "@/types/itiac";
import { 
  Network, 
  Server, 
  Database, 
  Globe, 
  Zap,
  Crosshair
} from "lucide-react";

export interface NetworkTopologyProps {
  components: ITComponent[];
  dependencies: ComponentDependency[];
  onNodeClick?: (component: ITComponent) => void;
  onConnectionClick?: (dependency: ComponentDependency) => void;
  filters?: {
    status?: string[];
    criticality?: string[];
    type?: string[];
  };
  onFiltersChange?: (filters: any) => void;
  className?: string;
  rightExtra?: React.ReactNode;
  compact?: boolean; // force compact visuals (smaller nodes/labels)
}

interface Node {
  id: string;
  component: ITComponent;
  x: number;
  y: number;
  connections: string[];
}

interface Connection {
  id: string;
  dependency: ComponentDependency;
  from: Node;
  to: Node;
}

const NetworkTopology = React.forwardRef<HTMLDivElement, NetworkTopologyProps>(
  ({ 
    components = [],
    dependencies = [],
    onNodeClick,
    onConnectionClick,
    filters,
    onFiltersChange,
    className,
    rightExtra,
    compact,
    ...props 
  }, ref) => {
    const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
    const [hoverHighlight, setHoverHighlight] = React.useState<Set<string>>(new Set());
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const isPanningRef = React.useRef(false);
    const panStartRef = React.useRef<{x: number; y: number}>({ x: 0, y: 0 });
    const pointerStartRef = React.useRef<{x: number; y: number}>({ x: 0, y: 0 });
    // filters UI removed for simplified layout

    const svgRef = React.useRef<SVGSVGElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = React.useState<{width: number; height: number}>({ width: 600, height: 400 });
    // Refs to keep latest values inside native event listeners
    const zoomRef = React.useRef(1);
    const panRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const viewportRef = React.useRef<{ width: number; height: number }>({ width: 600, height: 400 });

    // Observe container size to keep SVG responsive
    React.useEffect(() => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          setViewport({ width: Math.max(400, cr.width), height: Math.max(300, cr.height) });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Filter components based on active filters
    const filteredComponents = React.useMemo(() => {
      if (!filters) return components;
      
      return components.filter(component => {
        if (filters.status && filters.status.length > 0 && !filters.status.includes(component.status)) {
          return false;
        }
        if (filters.criticality && filters.criticality.length > 0 && !filters.criticality.includes(component.criticality)) {
          return false;
        }
        if (filters.type && filters.type.length > 0 && !filters.type.includes(component.type)) {
          return false;
        }
        return true;
      });
    }, [components, filters]);

    // Create nodes and connections with a top-down hierarchical layout
    const { nodes, connections, levelCount } = React.useMemo(() => {
      const nodeMap = new Map<string, Node>();
      const width = viewport.width;
      const height = viewport.height;
      const paddingX = 48;
      const paddingY = 48;

      // Consider only visible components
      const visibleIds = new Set(filteredComponents.map(c => c.id));

      // Build forward adjacency among visible nodes
      const fwd = buildForwardMap(dependencies, visibleIds);

      // Compute indegrees among visible nodes to find roots
      const indeg = new Map<string, number>();
      filteredComponents.forEach(c => indeg.set(c.id, 0));
      dependencies.forEach(dep => {
        if (visibleIds.has(dep.sourceId) && visibleIds.has(dep.targetId)) {
          indeg.set(dep.targetId, (indeg.get(dep.targetId) || 0) + 1);
        }
      });

      const roots = filteredComponents.filter(c => (indeg.get(c.id) || 0) === 0).map(c => c.id);
      // Fallback: if cycle makes no roots, pick all nodes as level 0
      const init = roots.length > 0 ? roots : filteredComponents.map(c => c.id);

      // Assign levels via BFS downstream
      const level = new Map<string, number>();
      const q: string[] = [];
      init.forEach(id => { level.set(id, 0); q.push(id); });
      const visited = new Set<string>(init);
      while (q.length) {
        const cur = q.shift()!;
        const nexts = fwd.get(cur) || [];
        nexts.forEach(nid => {
          if (!visibleIds.has(nid)) return;
          const nextLevel = (level.get(cur) || 0) + 1;
          if (!level.has(nid) || nextLevel > (level.get(nid) || 0)) {
            level.set(nid, nextLevel);
          }
          if (!visited.has(nid)) { visited.add(nid); q.push(nid); }
        });
      }

      // Group by levels
      const maxLevel = Math.max(0, ...Array.from(level.values())) || 0;
      const levels: string[][] = [];
      for (let i = 0; i <= maxLevel; i++) levels.push([]);
      filteredComponents.forEach(c => {
        const lv = level.has(c.id) ? level.get(c.id)! : 0;
        if (!levels[lv]) levels[lv] = [];
        levels[lv].push(c.id);
      });

      // Create nodes positioned by level rows from top to bottom with vertical centering
      const availableH = Math.max(0, height - paddingY * 2);
      const rows = Math.max(1, levels.length);
      const baseMinGap = 90;
      const compactMinGap = 70;
      const maxGap = 140;
      // provisional gap without knowing compact flag
      let rowGap = rows > 1 ? Math.min(maxGap, Math.max(baseMinGap, availableH / (rows - 1))) : availableH;
      // used height by rows
      let usedH = rows > 1 ? (rows - 1) * rowGap : 0;
      let startY = paddingY + Math.max(0, (availableH - usedH) / 2);
      levels.forEach((ids, li) => {
        const perRow = Math.max(1, ids.length);
        ids.forEach((id, idx) => {
          const component = filteredComponents.find(c => c.id === id)!;
          const x = paddingX + (idx + 1) * ((width - paddingX * 2) / (perRow + 1));
          const y = startY + li * rowGap;
          nodeMap.set(component.id, {
            id: component.id,
            component,
            x,
            y,
            connections: []
          });
        });
      });

      // Create connections (directed)
      const connectionList: Connection[] = [];
      dependencies.forEach(dep => {
        const fromNode = nodeMap.get(dep.sourceId);
        const toNode = nodeMap.get(dep.targetId);
        if (fromNode && toNode) {
          fromNode.connections.push(toNode.id);
          toNode.connections.push(fromNode.id);
          connectionList.push({ id: dep.id, dependency: dep, from: fromNode, to: toNode });
        }
      });

      return { nodes: Array.from(nodeMap.values()), connections: connectionList, levelCount: levels.length };
    }, [filteredComponents, dependencies, viewport]);

    // Fit all nodes into view (expand map) when nodes/layout/viewport change
    const fitToNodes = React.useCallback(() => {
      if (nodes.length === 0) return;
      const pad = 80;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      });
      const widthNeeded = Math.max(50, (maxX - minX) + pad * 2);
      const heightNeeded = Math.max(50, (maxY - minY) + pad * 2);
      const z = Math.min(viewport.width / widthNeeded, viewport.height / heightNeeded);
      const clamped = Math.max(0.3, Math.min(3, z));
      setZoom(clamped);
      // Center the viewBox on the nodes bounds
      const viewW = viewport.width / clamped;
      const viewH = viewport.height / clamped;
      const targetX = minX - pad - (viewW - (maxX - minX + pad * 2)) / 2;
      const targetY = minY - pad - (viewH - (maxY - minY + pad * 2)) / 2;
      setPan({ x: targetX, y: targetY });
    }, [nodes, viewport.width, viewport.height]);

    React.useEffect(() => {
      fitToNodes();
    }, [fitToNodes]);

    // Keep refs in sync with state for native listeners
    React.useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    React.useEffect(() => { panRef.current = pan; }, [pan]);
    React.useEffect(() => { viewportRef.current = viewport; }, [viewport]);

    // Decide compact mode: explicit prop wins; otherwise based on node and level counts
    const compactMode = React.useMemo(() => {
      if (typeof compact === 'boolean') return compact;
      const manyNodes = nodes.length > 40;
      const manyLevels = (levelCount || 0) > 6;
      return manyNodes || manyLevels;
    }, [compact, nodes.length, levelCount]);

    // Build impacted set via shared downstream-only utility
    const impactedIds = React.useMemo(() => {
      const visibleIds = new Set(filteredComponents.map(c => c.id));
      return computeImpactedFromOfflines(filteredComponents, dependencies, visibleIds);
    }, [filteredComponents, dependencies]);

    // Compute downstream highlight set on hover
    React.useEffect(() => {
      if (!hoveredNode) { setHoverHighlight(new Set()); return; }
      const visibleIds = new Set(filteredComponents.map(c => c.id));
      const fwd = buildForwardMap(dependencies, visibleIds);
      setHoverHighlight(traverseDownstream([hoveredNode], fwd, new Set([hoveredNode])));
    }, [hoveredNode, filteredComponents, dependencies]);

    const getNodeIcon = (type: string) => {
      switch (type) {
        case "server":
          return Server;
        case "database":
          return Database;
        case "app":
        case "application":
        case "service":
          return Globe;
        case "api":
        case "endpoint":
          return Globe;
        case "network":
        case "load-balancer":
          return Zap;
        case "storage":
        case "bucket":
          return Database;
        default:
          return Server;
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case "online":
          return "hsl(var(--success))";
        case "warning":
          return "hsl(var(--warning))";
        case "offline":
          return "hsl(var(--destructive))";
        case "maintenance":
          return "hsl(var(--secondary))";
        case "impacted":
          // Distinct color for dependency-propagated outage
          return "hsl(var(--primary))";
        default:
          return "hsl(var(--muted))";
      }
    };

    const getCriticalityStrokeWidth = (criticality: string) => {
      switch (criticality) {
        case "critical":
          return 3;
        case "high":
          return 2;
        case "medium":
          return 1.5;
        default:
          return 1;
      }
    };

    const handleNodeClick = (node: Node) => {
      setSelectedNode(selectedNode === node.id ? null : node.id);
      onNodeClick?.(node.component);
    };

    // Pointer-based panning
    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
      // Only start panning on primary button
      if (e.button !== 0) return;
      e.preventDefault();
      isPanningRef.current = true;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isPanningRef.current) return;
      const dx = (e.clientX - pointerStartRef.current.x) / zoom;
      const dy = (e.clientY - pointerStartRef.current.y) / zoom;
      // ViewBox minX/minY: dragging right should move content right => decrease minX
      setPan({ x: panStartRef.current.x - dx, y: panStartRef.current.y - dy });
    };

    const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
      isPanningRef.current = false;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    };

    // Wheel-based zoom towards cursor using non-passive native listener
    React.useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;

      const onWheelNative = (e: WheelEvent) => {
        // Prevent page scroll during zoom
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;
        const currentViewport = viewportRef.current;

        const scaleFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newZoom = Math.max(0.3, Math.min(3, currentZoom * scaleFactor));
        if (newZoom === currentZoom) return;

        // World coords under cursor before zoom
        const viewW = currentViewport.width / currentZoom;
        const viewH = currentViewport.height / currentZoom;
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const worldX = currentPan.x + (cursorX / rect.width) * viewW;
        const worldY = currentPan.y + (cursorY / rect.height) * viewH;

        // After zoom, adjust pan so the cursor points to the same world coords
        const newViewW = currentViewport.width / newZoom;
        const newViewH = currentViewport.height / newZoom;
        const newPanX = worldX - (cursorX / rect.width) * newViewW;
        const newPanY = worldY - (cursorY / rect.height) * newViewH;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      };

      svg.addEventListener('wheel', onWheelNative, { passive: false });
      return () => {
        svg.removeEventListener('wheel', onWheelNative as EventListener);
      };
    }, []);

    const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
      // Quick zoom-in on double click
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleFactor = 1.2;
      const newZoom = Math.max(0.3, Math.min(3, zoom * scaleFactor));
      const viewW = viewport.width / zoom;
      const viewH = viewport.height / zoom;
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const worldX = pan.x + (cursorX / rect.width) * viewW;
      const worldY = pan.y + (cursorY / rect.height) * viewH;
      const newViewW = viewport.width / newZoom;
      const newViewH = viewport.height / newZoom;
      const newPanX = worldX - (cursorX / rect.width) * newViewW;
      const newPanY = worldY - (cursorY / rect.height) * newViewH;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    return (
      <Card ref={ref} className={cn("bg-card border-border shadow-depth flex flex-col h-full", className)} {...props}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="section-title flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <span>Dependency Map</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Fit to view"
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => fitToNodes()}
            >
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>
          {/* Legend under title */}
          <div className="mt-2 text-[11px] leading-tight">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
                <span className="text-foreground">Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                <span className="text-foreground">Impacted</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="64" height="10" viewBox="0 0 64 10" className="shrink-0">
                  <line x1="1" y1="5" x2="63" y2="5" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="5,5" />
                </svg>
                <span className="text-foreground">Impacted path</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 flex-1 min-h-0 flex flex-col">
          <div 
            ref={containerRef}
            className="relative w-full flex-1 min-h-0 bg-background/50 rounded-lg border border-border overflow-hidden"
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${pan.x} ${pan.y} ${Math.max(300, viewport.width) / zoom} ${Math.max(200, viewport.height) / zoom}`}
              className="cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onDoubleClick={onDoubleClick}
            >
              {/* Grid background */}
              <defs>
                <pattern id="topology-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path 
                    d="M 20 0 L 0 0 0 20" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="0.5" 
                    opacity="0.1"
                  />
                </pattern>
                {/* Arrowheads for directed dependencies */}
                <marker id="arrow-muted" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="hsl(var(--muted-foreground))" />
                </marker>
                <marker id="arrow-impact" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="hsl(var(--primary))" />
                </marker>
                <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="hsl(var(--destructive))" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#topology-grid)" />
              
              {/* Connections */}
              {connections.map(connection => {
                const fromOffline = connection.from.component.status === 'offline';
                const fromImpacted = impactedIds.has(connection.from.id);
                const toImpacted = impactedIds.has(connection.to.id);
                const isImpactPath = (fromOffline || fromImpacted) && toImpacted;
                const isCritical = connection.dependency.criticality === "critical";

                // Style priority: Impact path > Critical > Regular
                let strokeColor: string;
                let markerId: string;
                let strokeWidth: number;
                let strokeDasharray: string | undefined;

                if (isImpactPath) {
                  strokeColor = "hsl(var(--destructive))"; // red
                  markerId = 'arrow-critical';
                  strokeWidth = 2;
                  strokeDasharray = "5,5"; // dashed red for impacted path
                } else if (isCritical) {
                  strokeColor = "hsl(var(--destructive))"; // red solid
                  markerId = 'arrow-critical';
                  strokeWidth = 2;
                  strokeDasharray = undefined;
                } else {
                  strokeColor = "hsl(var(--muted-foreground))";
                  markerId = 'arrow-muted';
                  strokeWidth = 1;
                  strokeDasharray = "5,5"; // regular stays dashed gray
                }

                // Shorten line to node edges so arrowhead isn't under the target circle
                const manyNodes = compactMode;
                const radiusFor = (nodeId: string) => {
                  const isSel = selectedNode === nodeId;
                  const isHov = hoveredNode === nodeId;
                  if (isSel || isHov) return manyNodes ? 18 : 25;
                  return manyNodes ? 14 : 20;
                };
                const rFrom = radiusFor(connection.from.id);
                const rTo = radiusFor(connection.to.id);
                const pad = 3; // small padding so arrow sits just off the circle edge
                const x1c = connection.from.x;
                const y1c = connection.from.y;
                const x2c = connection.to.x;
                const y2c = connection.to.y;
                const dx = x2c - x1c;
                const dy = y2c - y1c;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const x1 = x1c + ux * (rFrom + pad);
                const y1 = y1c + uy * (rFrom + pad);
                const x2 = x2c - ux * (rTo + pad + 6); // a bit extra so arrowhead clears the circle
                const y2 = y2c - uy * (rTo + pad + 6);

                return (
                  <line
                    key={connection.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    markerEnd={`url(#${markerId})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    opacity={selectedNode && 
                      selectedNode !== connection.from.id && 
                      selectedNode !== connection.to.id ? 0.3 : 0.7}
                    className="cursor-pointer hover:stroke-primary transition-colors"
                    onClick={() => onConnectionClick?.(connection.dependency)}
                  />
                );
              })}
              
              {/* Nodes */}
              {nodes.map(node => {
                const Icon = getNodeIcon(node.component.type);
                const isSelected = selectedNode === node.id;
                const isHovered = hoveredNode === node.id;
                const isConnected = selectedNode && node.connections.includes(selectedNode);
                const manyNodes = compactMode;
                const displayStatus = node.component.status === 'offline'
                  ? 'offline'
                  : (impactedIds.has(node.id) ? 'impacted' : node.component.status);
                
                const isHoverHighlighted = hoverHighlight.has(node.id);
                const glowClass = isHoverHighlighted ? 'filter drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]' : '';
                return (
                  <g key={node.id}>
                    {/* Node background circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected || isHovered ? (manyNodes ? 18 : 25) : (manyNodes ? 14 : 20)}
                      fill={getStatusColor(displayStatus)}
                      stroke="hsl(var(--background))"
                      strokeWidth={getCriticalityStrokeWidth(node.component.criticality)}
                      opacity={selectedNode && !isSelected && !isConnected ? 0.3 : 1}
                      className={cn("cursor-pointer transition-all duration-200", glowClass)}
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                    
                    {/* Node icon */}
                    <foreignObject
                      x={node.x - (manyNodes ? 6 : 8)}
                      y={node.y - (manyNodes ? 6 : 8)}
                      width={manyNodes ? 12 : 16}
                      height={manyNodes ? 12 : 16}
                      className="pointer-events-none"
                    >
                      <Icon className={manyNodes ? "w-3 h-3 text-background" : "w-4 h-4 text-background"} />
                    </foreignObject>
                    
                    {/* Node label (always visible) */}
                    <text
                      x={node.x}
                      y={node.y + (manyNodes ? 22 : 35)}
                      textAnchor="middle"
                      className={manyNodes ? "text-[9px] fill-foreground font-medium pointer-events-none" : "text-[10px] md:text-xs fill-foreground font-medium pointer-events-none"}
                      opacity={selectedNode && !isSelected && !isConnected ? 0.5 : 1}
                    >
                      {node.component.name.length > (manyNodes ? 9 : 12)
                        ? `${node.component.name.substring(0, manyNodes ? 9 : 12)}...`
                        : node.component.name}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Selected node details */}
            {selectedNode && (
              <div className="absolute top-4 right-4 bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                {(() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {node.component.type.replace('-', ' ')}
                        </Badge>
                        <Badge 
                          variant={
                            (node.component.status === "offline") ? "destructive" :
                            (impactedIds.has(node.id)) ? "warning" :
                            node.component.status === "online" ? "success" :
                            node.component.status === "warning" ? "warning" :
                            "secondary"
                          }
                        >
                          {node.component.status === 'offline' ? 'offline' : (impactedIds.has(node.id) ? 'impacted' : node.component.status)}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-foreground">{node.component.name}</h4>
                      <p className="text-xs text-muted-foreground">{node.component.description}</p>
                      <div className="text-xs text-muted-foreground">
                        <p>Connections: {node.connections.length}</p>
                        <p>Criticality: {node.component.criticality}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

NetworkTopology.displayName = "NetworkTopology";

export { NetworkTopology };
