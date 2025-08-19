import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Network, 
  GitBranch, 
  Settings, 
  BarChart3, 
  Database,
  Shield,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", id: "dashboard" },
  { icon: Server, label: "IT Assets", id: "components" },
  { icon: Network, label: "Dependencies", id: "dependencies" },
  { icon: GitBranch, label: "Business Processes", id: "workflows" },
  { icon: Shield, label: "Impact Analysis", id: "analysis" },
  { icon: Database, label: "Import/Export", id: "data" },
  { icon: Settings, label: "Settings", id: "settings" },
];

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export const Sidebar = ({ currentPage = "dashboard", onNavigate }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "bg-card border-r border-border transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <a href="/" className="flex items-center space-x-2">
            <img
              src="/42FS.jpg"
              alt="42FS"
              className="h-8 w-auto rounded-sm shadow-sm"
              loading="eager"
              decoding="async"
            />
            <span className="text-lg font-semibold text-foreground">IT Impact Navigator</span>
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-10 px-3",
                isCollapsed && "px-2 justify-center",
                isActive && "bg-accent text-accent-foreground shadow-glow-primary"
              )}
              onClick={() => onNavigate?.(item.id)}
            >
              <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            IT Impact Analysis Component
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            v1.0.0
          </div>
        </div>
      )}
    </div>
  );
};