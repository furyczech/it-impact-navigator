import { useEffect, useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { ComponentsManagement } from "@/components/components/ComponentsManagement";
import { DependenciesVisualization } from "@/components/dependencies/DependenciesVisualization";
import { WorkflowsManagement } from "@/components/workflows/WorkflowsManagement";
import { ImpactAnalysisEngine } from "@/components/analysis/ImpactAnalysisEngine";
import { DataManagement } from "@/components/data/DataManagement";
import { SettingsPage } from "@/components/settings/SettingsPage";



const Index = () => {
  const [currentPage, setCurrentPage] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('defaultPage') || 'dashboard') : 'dashboard'
  );
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    try { localStorage.setItem('defaultPage', pageId); } catch {}
  };

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const ce = e as CustomEvent<{ page?: string }>;
      if (ce.detail?.page) handleNavigation(ce.detail.page);
    };
    window.addEventListener('navigate', onNavigate as EventListener);
    // Apply compact tables preference on initial load
    try {
      const compactPref = localStorage.getItem('compactTables') === 'true';
      const root = document.documentElement;
      if (compactPref) root.classList.add('compact-tables');
      else root.classList.remove('compact-tables');
    } catch {}
    return () => window.removeEventListener('navigate', onNavigate as EventListener);
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <EnhancedDashboard onQuickNav={handleNavigation} />;
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
        return <DataManagement />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={handleNavigation}>
      <div className="h-full min-h-0 flex flex-col gap-4 px-4 md:px-6 py-4 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;