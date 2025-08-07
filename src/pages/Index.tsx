import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ComponentsManagement } from "@/components/components/ComponentsManagement";
import { DependenciesVisualization } from "@/components/dependencies/DependenciesVisualization";
import { WorkflowsManagement } from "@/components/workflows/WorkflowsManagement";
import { ImpactAnalysisEngine } from "@/components/analysis/ImpactAnalysisEngine";
import { ITComponent, ComponentDependency, BusinessWorkflow } from "@/types/itiac";

// Mock data for impact analysis
const mockComponents: ITComponent[] = [
  { id: "1", name: "Database Cluster", type: "database", status: "online", criticality: "critical", lastUpdated: new Date() },
  { id: "2", name: "API Gateway", type: "api", status: "online", criticality: "high", lastUpdated: new Date() },
  { id: "3", name: "Load Balancer", type: "load-balancer", status: "warning", criticality: "high", lastUpdated: new Date() },
];

const mockDependencies: ComponentDependency[] = [
  { id: "d1", sourceId: "2", targetId: "1", type: "requires", criticality: "critical" },
  { id: "d2", sourceId: "3", targetId: "2", type: "feeds", criticality: "high" },
];

const mockWorkflows: BusinessWorkflow[] = [
  {
    id: "1",
    name: "Customer Order Processing",
    description: "End-to-end customer order processing",
    businessProcess: "Sales",
    criticality: "critical",
    owner: "Sales Team",
    lastUpdated: new Date(),
    steps: [
      { id: "s1", name: "Order Validation", description: "Validate order", primaryComponentId: "2", alternativeComponentIds: [], order: 1 },
      { id: "s2", name: "Payment Processing", description: "Process payment", primaryComponentId: "1", alternativeComponentIds: [], order: 2 }
    ]
  }
];

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardOverview />;
      case "components":
        return <ComponentsManagement />;
      case "dependencies":
        return <DependenciesVisualization />;
      case "workflows":
        return <WorkflowsManagement />;
      case "analysis":
        return (
          <div>
            <ImpactAnalysisEngine 
              components={mockComponents}
              dependencies={mockDependencies}
              workflows={mockWorkflows}
            />
          </div>
        );
      case "data":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Import/Export</h2>
            <p className="text-muted-foreground">Data import and export functionality coming soon...</p>
          </div>
        );
      case "reports":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Reports</h2>
            <p className="text-muted-foreground">Advanced reporting dashboard coming soon...</p>
          </div>
        );
      case "settings":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Settings</h2>
            <p className="text-muted-foreground">System configuration settings coming soon...</p>
          </div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={handleNavigation}>
      <div className="space-y-6">
        {renderContent()}
      </div>
    </MainLayout>
  );
};

export default Index;