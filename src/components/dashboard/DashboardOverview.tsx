import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Network, 
  AlertTriangle, 
  Shield, 
  TrendingUp,
  Users,
  Activity,
  Zap
} from "lucide-react";

const stats = [
  {
    title: "Total Components",
    value: "247",
    icon: Server,
    change: "+12 this month",
    trend: "up"
  },
  {
    title: "Active Dependencies",
    value: "1,423",
    icon: Network,
    change: "Network health: 98%",
    trend: "stable"
  },
  {
    title: "Critical Paths",
    value: "18",
    icon: AlertTriangle,
    change: "3 need attention",
    trend: "warning"
  },
  {
    title: "Business Processes",
    value: "67",
    icon: Users,
    change: "5 high-impact",
    trend: "stable"
  }
];

const recentAnalyses = [
  {
    id: 1,
    component: "Database Cluster A",
    impact: "High",
    processes: 23,
    timestamp: "2 hours ago",
    status: "critical"
  },
  {
    id: 2,
    component: "API Gateway",
    impact: "Medium",
    processes: 12,
    timestamp: "4 hours ago",
    status: "warning"
  },
  {
    id: 3,
    component: "Load Balancer",
    impact: "Low",
    processes: 5,
    timestamp: "6 hours ago",
    status: "success"
  }
];

export const DashboardOverview = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-card border-border shadow-depth">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Impact Analyses */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Recent Impact Analyses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-foreground">{analysis.component}</span>
                      <Badge 
                        variant={analysis.status === 'critical' ? 'destructive' : 
                                analysis.status === 'warning' ? 'secondary' : 'default'}
                        className={analysis.status === 'warning' ? 'bg-warning text-warning-foreground' : ''}
                      >
                        {analysis.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {analysis.processes} processes affected • {analysis.timestamp}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border shadow-depth">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start h-12 bg-gradient-primary hover:opacity-90">
                <Shield className="w-5 h-5 mr-3" />
                Run Impact Analysis
              </Button>
              <Button variant="secondary" className="w-full justify-start h-12">
                <Server className="w-5 h-5 mr-3" />
                Add Component
              </Button>
              <Button variant="secondary" className="w-full justify-start h-12">
                <Network className="w-5 h-5 mr-3" />
                View Network Map
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <TrendingUp className="w-5 h-5 mr-3" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview */}
      <Card className="bg-card border-border shadow-depth">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <span>System Health Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-network rounded-full flex items-center justify-center">
                <Network className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Network Health</h3>
              <p className="text-2xl font-bold text-success mt-1">98.7%</p>
              <p className="text-sm text-muted-foreground">All critical paths operational</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-primary rounded-full flex items-center justify-center">
                <Server className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Component Status</h3>
              <p className="text-2xl font-bold text-success mt-1">244/247</p>
              <p className="text-sm text-muted-foreground">Components online</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center border border-warning/20">
                <AlertTriangle className="w-10 h-10 text-warning" />
              </div>
              <h3 className="font-semibold text-foreground">Risk Assessment</h3>
              <p className="text-2xl font-bold text-warning mt-1">Low</p>
              <p className="text-sm text-muted-foreground">3 potential issues detected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};