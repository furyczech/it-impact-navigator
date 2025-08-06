import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, Activity, AlertTriangle } from "lucide-react";

export const Header = () => {
  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-foreground">
          IT Impact Analysis Dashboard
        </h1>
        <Badge variant="secondary" className="bg-success text-success-foreground">
          System Operational
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status Indicators */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Activity className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">247 Components</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm text-muted-foreground">3 Warnings</span>
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