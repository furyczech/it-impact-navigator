import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

export interface TrendCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string;
  trend?: "up" | "down" | "stable";
  change?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  interactive?: boolean;
  onDrillDown?: () => void;
  tooltip?: string;
}

const TrendCard = React.forwardRef<HTMLDivElement, TrendCardProps>(
  ({ 
    className, 
    title, 
    value, 
    trend = "stable", 
    change, 
    icon: Icon, 
    variant = "default",
    interactive = false,
    onDrillDown,
    tooltip,
    ...props 
  }, ref) => {
    const getTrendIcon = () => {
      switch (trend) {
        case "up":
          return <TrendingUp className="w-4 h-4" />;
        case "down":
          return <TrendingDown className="w-4 h-4" />;
        default:
          return <Minus className="w-4 h-4" />;
      }
    };

    const getTrendColor = () => {
      switch (trend) {
        case "up":
          return variant === "warning" || variant === "destructive" ? "text-destructive" : "text-success";
        case "down":
          return variant === "success" ? "text-destructive" : "text-success";
        default:
          return "text-muted-foreground";
      }
    };

    const getVariantStyles = () => {
      switch (variant) {
        case "success":
          return "border-success/20 bg-success/5";
        case "warning":
          return "border-warning/20 bg-warning/5";
        case "destructive":
          return "border-destructive/20 bg-destructive/5";
        default:
          return "border-border bg-card";
      }
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "shadow-depth transition-all duration-200",
          getVariantStyles(),
          interactive && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
          className
        )}
        onClick={interactive ? onDrillDown : undefined}
        title={tooltip}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                {change && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs px-2 py-1", getTrendColor())}
                  >
                    <span className="flex items-center space-x-1">
                      {getTrendIcon()}
                      <span>{change}</span>
                    </span>
                  </Badge>
                )}
              </div>
            </div>
            {Icon && (
              <div className={cn(
                "p-3 rounded-lg",
                variant === "success" ? "bg-success/10" :
                variant === "warning" ? "bg-warning/10" :
                variant === "destructive" ? "bg-destructive/10" :
                "bg-primary/10"
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  variant === "success" ? "text-success" :
                  variant === "warning" ? "text-warning" :
                  variant === "destructive" ? "text-destructive" :
                  "text-primary"
                )} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

TrendCard.displayName = "TrendCard";

export { TrendCard };
