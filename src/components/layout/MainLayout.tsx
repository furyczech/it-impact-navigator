import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export const MainLayout = ({ children, currentPage, onNavigate }: MainLayoutProps) => {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 h-full overflow-hidden min-h-0 p-0">
          {children}
        </main>
      </div>
    </div>
  );
};