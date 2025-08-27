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

const mainNavigationItems = [
  { icon: BarChart3, label: "Dashboard", id: "dashboard" },
  { icon: Server, label: "IT Assets", id: "components" },
  { icon: Network, label: "Dependencies", id: "dependencies" },
  { icon: GitBranch, label: "Business Processes", id: "workflows" },
  { icon: Shield, label: "Impact Analysis", id: "analysis" },
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
      <div className="relative p-4 border-b border-border h-28">
        {/* Collapse toggle */}
        <Button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 absolute right-2 top-2 rounded-full"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>

        {!isCollapsed ? (
          <a href="/" className="flex flex-col items-center gap-2">
            <img
              src="/42FS.jpg"
              alt="42FS"
              className="h-10 w-auto rounded-md shadow-sm"
              loading="eager"
              decoding="async"
            />
            <div className="text-center leading-tight">
              <div className="text-base font-semibold text-foreground tracking-tight">IT Impact Navigator</div>
            </div>
          </a>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {mainNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-10 px-3 rounded-lg transition-colors",
                isCollapsed && "px-2 justify-center",
                isActive
                  ? "bg-accent text-accent-foreground shadow-glow-primary"
                  : "hover:bg-accent/30 hover:text-foreground",
              )}
              onClick={() => onNavigate?.(item.id)}
            >
              <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <span className="text-sm font-medium tracking-tight">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Admin section at bottom */}
      <div className="p-2 pt-0">
        <div className="border-t border-border my-2" />
        <Button
          variant={currentPage === "settings" ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start h-10 px-3 rounded-lg transition-colors",
            isCollapsed && "px-2 justify-center",
            currentPage === "settings"
              ? "bg-accent text-accent-foreground shadow-glow-primary"
              : "hover:bg-accent/30 hover:text-foreground",
          )}
          onClick={() => onNavigate?.("settings")}
        >
          <Settings className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span className="text-sm font-semibold tracking-tight">Admin settings</span>}
        </Button>

        {/* Nested sub-item: Import/Export */}
        {!isCollapsed && (
          <div className="mt-1 pl-8">
            <Button
              variant={currentPage === "data" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-9 px-3 rounded-md text-muted-foreground hover:text-foreground",
                currentPage === "data" && "bg-accent text-accent-foreground shadow-sm"
              )}
              onClick={() => onNavigate?.("data")}
            >
              <Database className="w-4 h-4 mr-2" />
              <span className="text-xs font-medium">Import/Export</span>
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">IT Impact Navigator v1.0.0</div>
        </div>
      )}
    </div>
  );
};