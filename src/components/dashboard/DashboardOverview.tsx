import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItiacStore } from "@/store/useItiacStore";
import { AuditService } from "@/services/auditService";

import { 
  Server, 
  Network, 
  AlertTriangle, 
  Users
} from "lucide-react";

type DashboardOverviewProps = {
  onQuickNav?: (pageId: string) => void;
};

export const DashboardOverview = ({ onQuickNav }: DashboardOverviewProps) => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);

  const totalComponents = components.length;
  const onlineCount = components.filter(c => c.status === 'online').length;
  const warningCount = components.filter(c => c.status === 'warning').length;
  const offlineCount = components.filter(c => c.status === 'offline').length;

  const totalDependencies = dependencies.length;
  const criticalPaths = dependencies.filter(d => d.criticality === 'critical').length;
  const totalWorkflows = workflows.length;
  const uniqueBusinessProcesses = Array.from(new Set(workflows.map(w => w.businessProcess))).length;

  const networkHealth = totalComponents > 0 ? ((onlineCount / totalComponents) * 100) : 0;
  const issuesCount = warningCount + offlineCount;
  const riskLabel = issuesCount === 0 && criticalPaths === 0 ? 'Low' : (issuesCount > 3 || criticalPaths > 0 ? 'Elevated' : 'Moderate');

  const stats = [
    {
      title: 'Total IT Assets',
      value: String(totalComponents),
      icon: Server,
      change: `${onlineCount}/${totalComponents} online`,
      trend: onlineCount === totalComponents ? 'up' : (offlineCount > 0 ? 'warning' : 'stable'),
      to: 'components'
    },
    {
      title: 'Active Dependencies',
      value: String(totalDependencies),
      icon: Network,
      change: `Network health: ${networkHealth.toFixed(1)}%`,
      trend: networkHealth > 95 ? 'up' : (networkHealth < 80 ? 'warning' : 'stable'),
      to: 'dependencies'
    },
    {
      title: 'Critical Paths',
      value: String(criticalPaths),
      icon: AlertTriangle,
      change: `${criticalPaths} critical`,
      trend: criticalPaths > 0 ? 'warning' : 'stable',
      to: 'dependencies'
    },
    {
      title: 'Business Processes',
      value: String(uniqueBusinessProcesses),
      icon: Users,
      change: `${totalWorkflows} workflows`,
      trend: 'stable',
      to: 'workflows'
    }
  ];

  const timeAgo = (value: Date | string) => {
    const dt = value instanceof Date ? value : new Date(value);
    const diff = Date.now() - dt.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const workflowsUsingComponent = (componentId: string) =>
    workflows.filter(w => w.steps.some(s =>
      (s.primaryComponentIds && s.primaryComponentIds.includes(componentId)) ||
      s.primaryComponentId === componentId ||
      s.alternativeComponentIds?.includes(componentId)
    )).length;

  const recentAnalyses = components
    .slice()
    .sort((a, b) => new Date(b.lastUpdated as any).getTime() - new Date(a.lastUpdated as any).getTime())
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      component: c.name,
      impact: c.status === 'offline' ? 'High' : c.status === 'warning' || c.status === 'maintenance' ? 'Medium' : 'Low',
      processes: workflowsUsingComponent(c.id),
      timestamp: timeAgo(c.lastUpdated as any),
      status: c.status === 'offline' ? 'critical' : (c.status === 'warning' || c.status === 'maintenance') ? 'warning' : 'success'
    }));

  // Incident history from audit logs (status changes)
  const incidentLogs = AuditService.getLogs(200, 'COMPONENT', 'UPDATE')
    .filter(l => l.changes && l.changes.before && l.changes.after && l.changes.before.status !== l.changes.after.status)
    .map(l => ({
      id: l.id,
      component: l.entityName || l.entityId || 'Unknown',
      from: l.changes!.before.status,
      to: l.changes!.after.status,
      at: l.timestamp
    }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`bg-card border-border shadow-depth ${onQuickNav ? 'cursor-pointer hover:bg-accent/40 transition-colors' : ''}`}
              onClick={() => onQuickNav && stat.to && onQuickNav(stat.to)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-2">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    stat.trend === 'up' ? 'bg-success/10' :
                    stat.trend === 'warning' ? 'bg-warning/10' :
                    'bg-primary/10'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      stat.trend === 'up' ? 'text-success' :
                      stat.trend === 'warning' ? 'text-warning' :
                      'text-primary'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {/* Incident History */}
      <Card className="bg-card border-border shadow-depth">
        <CardHeader>
          <CardTitle className="section-title flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span>Incident History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent incidents.</p>
          ) : (
            <div className="space-y-2">
              {incidentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{log.from} → {log.to}</Badge>
                    <span className="font-medium text-foreground">{log.component}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{timeAgo(log.at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};