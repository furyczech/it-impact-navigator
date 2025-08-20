import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  LucideIcon 
} from "lucide-react";

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info" | "success";
  timestamp: Date;
  component?: string;
  criticality?: string;
  acknowledged?: boolean;
  actionUrl?: string;
}

export interface AlertPanelProps {
  alerts: Alert[];
  maxVisible?: number;
  autoRefresh?: boolean;
  onAlertClick?: (alert: Alert) => void;
  onAlertDismiss?: (alertId: string) => void;
  onAlertAcknowledge?: (alertId: string) => void;
  className?: string;
}

const AlertPanel = React.forwardRef<HTMLDivElement, AlertPanelProps>(
  ({ 
    alerts = [],
    maxVisible = 5,
    autoRefresh = false,
    onAlertClick,
    onAlertDismiss,
    onAlertAcknowledge,
    className,
    ...props 
  }, ref) => {
    const [lastUpdate, setLastUpdate] = React.useState(new Date());
    
    // Auto refresh every 30 seconds if enabled
    React.useEffect(() => {
      if (!autoRefresh) return;
      
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, 30000);
      
      return () => clearInterval(interval);
    }, [autoRefresh]);

    const getSeverityIcon = (severity: Alert["severity"]): LucideIcon => {
      switch (severity) {
        case "critical":
          return AlertCircle;
        case "warning":
          return AlertTriangle;
        case "success":
          return CheckCircle;
        default:
          return AlertTriangle;
      }
    };

    const getSeverityColor = (severity: Alert["severity"]) => {
      switch (severity) {
        case "critical":
          return "text-destructive";
        case "warning":
          return "text-warning";
        case "success":
          return "text-success";
        default:
          return "text-primary";
      }
    };

    const getSeverityBadgeVariant = (severity: Alert["severity"]) => {
      switch (severity) {
        case "critical":
          return "destructive";
        case "warning":
          return "warning";
        case "success":
          return "success";
        default:
          return "secondary";
      }
    };

    const formatTimeAgo = (timestamp: Date) => {
      const diff = Date.now() - timestamp.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return "just now";
      if (minutes < 60) return `${minutes}m ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };

    const visibleAlerts = alerts.slice(0, maxVisible);
    const criticalCount = alerts.filter(a => a.severity === "critical").length;
    const warningCount = alerts.filter(a => a.severity === "warning").length;

    return (
      <Card ref={ref} className={cn("bg-card border-border shadow-depth", className)} {...props}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span>Active Alerts</span>
              {alerts.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
            
            {autoRefresh && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Updated {formatTimeAgo(lastUpdate)}</span>
              </div>
            )}
          </div>
          
          {(criticalCount > 0 || warningCount > 0) && (
            <div className="flex items-center space-x-4 text-sm">
              {criticalCount > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-destructive rounded-full" />
                  <span className="text-muted-foreground">{criticalCount} Critical</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span className="text-muted-foreground">{warningCount} Warning</span>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          {visibleAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
              <p>All systems operational</p>
              <p className="text-xs mt-1">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-200",
                      alert.acknowledged 
                        ? "bg-muted/30 border-muted" 
                        : "bg-background border-border hover:bg-accent/10",
                      onAlertClick && "cursor-pointer"
                    )}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <SeverityIcon className={cn("w-4 h-4 mt-0.5", getSeverityColor(alert.severity))} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-foreground text-sm truncate">
                              {alert.title}
                            </p>
                            <Badge 
                              variant={getSeverityBadgeVariant(alert.severity)}
                              className="text-xs px-1.5 py-0.5"
                            >
                              {alert.severity}
                            </Badge>
                            {alert.criticality && alert.criticality.toLowerCase() !== alert.severity.toLowerCase() && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1.5 py-0.5 capitalize"
                              >
                                {alert.criticality}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              {alert.component && (
                                <span className="font-medium">{alert.component}</span>
                              )}
                              <span>•</span>
                              <span>{formatTimeAgo(alert.timestamp)}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {alert.actionUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(alert.actionUrl, '_blank');
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {alerts.length > maxVisible && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View {alerts.length - maxVisible} more alerts
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

AlertPanel.displayName = "AlertPanel";

export { AlertPanel, type Alert as AlertType };
