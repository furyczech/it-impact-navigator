import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, Activity, AlertTriangle } from "lucide-react";
import { useItiacStore } from "@/store/useItiacStore";

export const Header = () => {
  const components = useItiacStore((s) => s.components);
  const totalComponents = components.length;
  const warningCount = components.filter(c => c.status === 'warning').length;
  const offlineCount = components.filter(c => c.status === 'offline').length;
  const maintenanceCount = components.filter(c => c.status === 'maintenance').length;
  const nonOnlineCount = warningCount + offlineCount + maintenanceCount;
  const isOperational = offlineCount === 0;

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-foreground">
        </h1>
        <Badge
          variant={isOperational ? "secondary" : "destructive"}
          className={isOperational ? "bg-success text-success-foreground" : ""}
        >
          {isOperational ? "System Operational" : "Degraded"}
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status Indicators */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Activity className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">{totalComponents} Components</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm text-muted-foreground">{nonOnlineCount} Issues</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">{warningCount} warn</span>
            <span className="text-xs text-muted-foreground">• {offlineCount} off</span>
            {maintenanceCount > 0 && (
              <span className="text-xs text-muted-foreground">• {maintenanceCount} maint</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};