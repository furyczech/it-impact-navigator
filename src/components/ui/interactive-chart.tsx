import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, Activity, Zap } from "lucide-react";

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  status?: "success" | "warning" | "destructive";
}

export interface InteractiveChartProps {
  title: string;
  data: ChartDataPoint[];
  type?: "line" | "area" | "bar";
  timeRange?: "1h" | "24h" | "7d" | "30d";
  onTimeRangeChange?: (range: string) => void;
  onDataPointClick?: (point: ChartDataPoint) => void;
  icon?: LucideIcon;
  height?: number;
  showTrend?: boolean;
  realTime?: boolean;
  strokeColor?: string; // e.g., "hsl(var(--success))"
  fillColor?: string;   // e.g., "hsl(var(--success))"
  fillOpacity?: number; // 0..1
}

const InteractiveChart = React.forwardRef<HTMLDivElement, InteractiveChartProps>(
  ({ 
    title,
    data = [],
    type = "line",
    timeRange = "24h",
    onTimeRangeChange,
    onDataPointClick,
    icon: Icon = Activity,
    height = 200,
    showTrend = true,
    realTime = false,
    strokeColor = "hsl(var(--primary))",
    fillColor = "hsl(var(--primary))",
    fillOpacity = 0.22,
    ...props 
  }, ref) => {
    const [hoveredPoint, setHoveredPoint] = React.useState<ChartDataPoint | null>(null);
    
    // Calculate trend
    const trend = React.useMemo(() => {
      if (data.length < 2) return { direction: "stable", percentage: 0 };
      
      const recent = data.slice(-5).reduce((sum, point) => sum + point.value, 0) / Math.min(5, data.length);
      const previous = data.slice(-10, -5).reduce((sum, point) => sum + point.value, 0) / Math.min(5, data.length - 5);
      
      if (previous === 0) return { direction: "stable", percentage: 0 };
      
      const change = ((recent - previous) / previous) * 100;
      return {
        direction: change > 2 ? "up" : change < -2 ? "down" : "stable",
        percentage: Math.abs(change)
      };
    }, [data]);

    // Simple SVG chart implementation
    const renderChart = () => {
      if (data.length === 0) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data available
          </div>
        );
      }

      const maxValue = Math.max(...data.map(d => d.value));
      const minValue = Math.min(...data.map(d => d.value));
      const range = maxValue - minValue || 1;
      
      const width = 400;
      const chartHeight = height - 40;
      const padding = 20;
      
      const points = data.map((point, index) => ({
        x: padding + (index / (data.length - 1)) * (width - 2 * padding),
        y: padding + (1 - (point.value - minValue) / range) * (chartHeight - 2 * padding),
        data: point
      }));

      const pathData = points.map((point, index) => 
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      ).join(' ');

      return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Area fill for area chart */}
          {type === "area" && (
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`}
              fill={fillColor}
              fillOpacity={fillOpacity}
            />
          )}
          
          {/* Main line/path */}
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            className="drop-shadow-sm"
          />
          
          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4.5"
              fill={strokeColor}
              stroke="hsl(var(--background))"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all"
              onClick={() => onDataPointClick?.(point.data)}
              onMouseEnter={() => setHoveredPoint(point.data)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
          
          {/* Tooltip */}
          {hoveredPoint && (
            <g>
              <rect
                x="10"
                y="10"
                width="120"
                height="40"
                fill="hsl(var(--popover))"
                stroke="hsl(var(--border))"
                rx="4"
              />
              <text x="20" y="28" fill="hsl(var(--foreground))" fontSize="12">
                {hoveredPoint.label || hoveredPoint.timestamp}
              </text>
              <text x="20" y="42" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">
                {hoveredPoint.value}
              </text>
            </g>
          )}
        </svg>
      );
    };

    const timeRanges = [
      { key: "1h", label: "1H" },
      { key: "24h", label: "24H" },
      { key: "7d", label: "7D" },
      { key: "30d", label: "30D" }
    ];

    return (
      <Card ref={ref} className="bg-card border-border shadow-depth" {...props}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Icon className="w-5 h-5 text-primary" />
              <span>{title}</span>
              {realTime && (
                <Badge variant="outline" className="ml-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-1" />
                  Live
                </Badge>
              )}
            </CardTitle>
            
            {onTimeRangeChange && (
              <div className="flex space-x-1">
                {timeRanges.map((range) => (
                  <Button
                    key={range.key}
                    variant={timeRange === range.key ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onTimeRangeChange(range.key)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {showTrend && (
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className={cn(
                "w-4 h-4",
                trend.direction === "up" ? "text-success" :
                trend.direction === "down" ? "text-destructive" :
                "text-muted-foreground"
              )} />
              <span className="text-muted-foreground">
                {trend.direction === "stable" ? "Stable" : 
                 `${trend.direction === "up" ? "↗" : "↘"} ${trend.percentage.toFixed(1)}%`}
              </span>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="w-full" style={{ height: `${height}px` }}>
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    );
  }
);

InteractiveChart.displayName = "InteractiveChart";

export { InteractiveChart };
