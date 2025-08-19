import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [showFilters, setShowFilters] = React.useState(false);

    const svgRef = React.useRef<SVGSVGElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

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
      const width = 600;
      const height = 400;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Create nodes with circular layout
      filteredComponents.forEach((component, index) => {
        const angle = (index / filteredComponents.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.3;
        
        const node: Node = {
          id: component.id,
          component,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          connections: []
        };
        
        nodeMap.set(component.id, node);
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
    }, [filteredComponents, dependencies]);

    // Build impacted set: any node that depends (directly or transitively) on an offline node
    const impactedIds = React.useMemo(() => {
      const offlineIds = new Set(filteredComponents.filter(c => c.status === 'offline').map(c => c.id));
      if (offlineIds.size === 0) return new Set<string>();
      // adjacency from source -> targets (dependency direction)
      const adj = new Map<string, string[]>();
      dependencies.forEach(dep => {
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
          if (!offlineIds.has(nb)) { // don't override true offline
            impacted.add(nb);
            queue.push(nb);
          }
        }
      }
      return impacted;
    }, [filteredComponents, dependencies]);

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
    const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
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
            className="relative w-full h-96 bg-background/50 rounded-lg border border-border overflow-hidden"
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${-pan.x} ${-pan.y} ${600 / zoom} ${400 / zoom}`}
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
              </defs>
              <rect width="100%" height="100%" fill="url(#topology-grid)" />
              
              {/* Connections */}
              {connections.map(connection => {
                const fromOffline = connection.from.component.status === 'offline';
                const toImpacted = impactedIds.has(connection.to.id);
                const isImpactPath = fromOffline && toImpacted;
                return (
                  <line
                    key={connection.id}
                    x1={connection.from.x}
                    y1={connection.from.y}
                    x2={connection.to.x}
                    y2={connection.to.y}
                    stroke={isImpactPath ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={connection.dependency.criticality === "critical" ? 2 : 1}
                    strokeDasharray={connection.dependency.criticality === "critical" ? "none" : "5,5"}
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
                const displayStatus = node.component.status === 'offline'
                  ? 'offline'
                  : (impactedIds.has(node.id) ? 'impacted' : node.component.status);
                
                return (
                  <g key={node.id}>
                    {/* Node background circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected || isHovered ? 25 : 20}
                      fill={getStatusColor(displayStatus)}
                      stroke="hsl(var(--background))"
                      strokeWidth={getCriticalityStrokeWidth(node.component.criticality)}
                      opacity={selectedNode && !isSelected && !isConnected ? 0.3 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                    
                    {/* Node icon */}
                    <foreignObject
                      x={node.x - 8}
                      y={node.y - 8}
                      width="16"
                      height="16"
                      className="pointer-events-none"
                    >
                      <Icon className="w-4 h-4 text-background" />
                    </foreignObject>
                    
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + 35}
                      textAnchor="middle"
                      className="text-xs fill-foreground font-medium pointer-events-none"
                      opacity={selectedNode && !isSelected && !isConnected ? 0.5 : 1}
                    >
                      {node.component.name.length > 12 
                        ? `${node.component.name.substring(0, 12)}...` 
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
