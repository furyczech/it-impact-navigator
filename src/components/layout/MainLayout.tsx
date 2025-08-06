import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export const MainLayout = ({ children, currentPage, onNavigate }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};