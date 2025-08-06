import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

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
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Component Management</h2>
            <p className="text-muted-foreground">Component management interface coming soon...</p>
          </div>
        );
      case "dependencies":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Dependency Visualization</h2>
            <p className="text-muted-foreground">Interactive network dependency map coming soon...</p>
          </div>
        );
      case "workflows":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Workflow Management</h2>
            <p className="text-muted-foreground">Business process workflow builder coming soon...</p>
          </div>
        );
      case "analysis":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Impact Analysis</h2>
            <p className="text-muted-foreground">Advanced impact analysis engine coming soon...</p>
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