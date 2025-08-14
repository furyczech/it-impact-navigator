import { useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ComponentsManagement } from "@/components/components/ComponentsManagement";
import { DependenciesVisualization } from "@/components/dependencies/DependenciesVisualization";
import { WorkflowsManagement } from "@/components/workflows/WorkflowsManagement";
import { ImpactAnalysisEngine } from "@/components/analysis/ImpactAnalysisEngine";



const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardOverview onQuickNav={handleNavigation} />;
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
              components={components}
              dependencies={dependencies}
              workflows={workflows}
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