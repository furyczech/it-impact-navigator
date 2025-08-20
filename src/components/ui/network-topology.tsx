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
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2
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
    ...props 
  }, ref) => {
    const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
    const [hoverHighlight, setHoverHighlight] = React.useState<Set<string>>(new Set());
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [showFilters, setShowFilters] = React.useState(false);

    const svgRef = React.useRef<SVGSVGElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = React.useState<{width: number; height: number}>({ width: 600, height: 400 });

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

    // Create nodes and connections
    const { nodes, connections } = React.useMemo(() => {
      const nodeMap = new Map<string, Node>();
      const width = viewport.width;
      const height = viewport.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Build undirected adjacency to understand connectivity
      const adj = new Map<string, Set<string>>();
      filteredComponents.forEach(c => adj.set(c.id, new Set<string>()));
      dependencies.forEach(dep => {
        if (adj.has(dep.sourceId) && adj.has(dep.targetId)) {
          adj.get(dep.sourceId)!.add(dep.targetId);
          adj.get(dep.targetId)!.add(dep.sourceId);
        }
      });

      // Order components so connected nodes appear near each other
      const visited = new Set<string>();
      const orderedComponents: ITComponent[] = [];
      const byId = new Map(filteredComponents.map(c => [c.id, c] as const));
      // Helper to pick next seed: highest degree unvisited
      const pickSeed = () => {
        let best: string | null = null;
        let bestDeg = -1;
        for (const c of filteredComponents) {
          if (visited.has(c.id)) continue;
          const deg = adj.get(c.id)?.size ?? 0;
          if (deg > bestDeg) { bestDeg = deg; best = c.id; }
        }
        return best;
      };
      // BFS from seed to cluster connected nodes
      while (visited.size < filteredComponents.length) {
        const seed = pickSeed();
        if (!seed) break;
        const q: string[] = [seed];
        visited.add(seed);
        while (q.length) {
          const cur = q.shift()!;
          const comp = byId.get(cur);
          if (comp) orderedComponents.push(comp);
          const nbrs = Array.from(adj.get(cur) ?? []);
          // Sort neighbors by degree desc to place hubs earlier
          nbrs.sort((a, b) => (adj.get(b)?.size ?? 0) - (adj.get(a)?.size ?? 0));
          for (const nb of nbrs) {
            if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
          }
        }
      }
      // Include any isolated nodes that might have been missed
      if (orderedComponents.length < filteredComponents.length) {
        const seen = new Set(orderedComponents.map(c => c.id));
        filteredComponents.forEach(c => { if (!seen.has(c.id)) orderedComponents.push(c); });
      }

      // Multi-ring radial layout; fill rings in BFS order
      const n = orderedComponents.length;
      const ringCount = n <= 12 ? 1 : n <= 36 ? 2 : n <= 80 ? 3 : 4;
      const perRingBase = Math.ceil(n / ringCount);
      const rings: ITComponent[][] = [];
      for (let r = 0; r < ringCount; r++) rings.push([]);
      orderedComponents.forEach((component, idx) => {
        // Distribute in order to keep related nodes contiguous
        const r = Math.floor(idx / perRingBase);
        const ringIndex = Math.min(r, ringCount - 1);
        rings[ringIndex].push(component);
      });

      const minDim = Math.min(width, height);
      const innerRadius = Math.max(60, minDim * 0.18);
      const outerRadius = Math.max(innerRadius + 40, minDim * 0.42);
      const ringRadius = (ri: number) => innerRadius + (ri * (outerRadius - innerRadius)) / Math.max(1, ringCount - 1);

      rings.forEach((ring, ri) => {
        const R = ringRadius(ri);
        const perRing = Math.max(1, ring.length);
        ring.forEach((component, i) => {
          const angle = (i / perRing) * 2 * Math.PI;
          const x = centerX + Math.cos(angle) * R;
          const y = centerY + Math.sin(angle) * R;
          nodeMap.set(component.id, {
            id: component.id,
            component,
            x,
            y,
            connections: []
          });
        });
      });

      // Create connections
      const connectionList: Connection[] = [];
      dependencies.forEach(dep => {
        const fromNode = nodeMap.get(dep.sourceId);
        const toNode = nodeMap.get(dep.targetId);
        
        if (fromNode && toNode) {
          fromNode.connections.push(toNode.id);
          toNode.connections.push(fromNode.id);
          
          connectionList.push({
            id: dep.id,
            dependency: dep,
            from: fromNode,
            to: toNode
          });
        }
      });

      return {
        nodes: Array.from(nodeMap.values()),
        connections: connectionList
      };
    }, [filteredComponents, dependencies, viewport]);

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

    const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
    const handleResetView = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };

    return (
      <Card ref={ref} className={cn("bg-card border-border shadow-depth", className)} {...props}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <span>Network Topology</span>
              <Badge variant="outline" className="ml-2">
                {filteredComponents.length} nodes
              </Badge>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8"
              >
                <Filter className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResetView} className="h-8 w-8 p-0">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {showFilters && (
            <div className="pt-3 border-t border-border">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  All Status
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  Online Only
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  Critical Only
                </Badge>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--success))'}} /> Online</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--warning))'}} /> Warning</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--primary))'}} /> Impacted</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--destructive))'}} /> Offline</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: 'hsl(var(--secondary))'}} /> Maintenance</div>
          </div>
          <div 
            ref={containerRef}
            className="relative w-full h-[60vh] bg-background/50 rounded-lg border border-border overflow-hidden"
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${-pan.x} ${-pan.y} ${Math.max(300, viewport.width) / zoom} ${Math.max(200, viewport.height) / zoom}`}
              className="cursor-grab active:cursor-grabbing"
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
                const toImpacted = impactedIds.has(connection.to.id);
                const isImpactPath = fromOffline && toImpacted;
                const isCritical = connection.dependency.criticality === "critical";
                const strokeColor = isImpactPath ? "hsl(var(--primary))" : (isCritical ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))");
                const markerId = isImpactPath ? 'arrow-impact' : (isCritical ? 'arrow-critical' : 'arrow-muted');

                // Shorten line to node edges so arrowhead isn't under the target circle
                const manyNodes = nodes.length > 40;
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
                    strokeWidth={isCritical ? 2 : 1}
                    strokeDasharray={isCritical ? "none" : "5,5"}
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
                const manyNodes = nodes.length > 40;
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
                      y={node.y + (manyNodes ? 26 : 35)}
                      textAnchor="middle"
                      className="text-[10px] md:text-xs fill-foreground font-medium pointer-events-none"
                      opacity={selectedNode && !isSelected && !isConnected ? 0.5 : 1}
                    >
                      {node.component.name.length > (manyNodes ? 10 : 12)
                        ? `${node.component.name.substring(0, manyNodes ? 10 : 12)}...`
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
