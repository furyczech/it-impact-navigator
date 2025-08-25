import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export const MainLayout = ({ children, currentPage, onNavigate }: MainLayoutProps) => {
  return (
    <div className="h-screen bg-background flex overflow-hidden overscroll-none">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col min-h-0 overscroll-none">
        <main className="flex-1 h-full overflow-auto min-h-0 p-0 overscroll-none">
          {children}
        </main>
      </div>
    </div>
  );
};