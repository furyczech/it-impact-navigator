import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useItiacStore } from "@/store/useItiacStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "components", label: "IT Assets" },
  { id: "dependencies", label: "Dependencies" },
  { id: "workflows", label: "Business Processes" },
  { id: "analysis", label: "Impact Analysis" },
  { id: "data", label: "Import/Export" },
  { id: "settings", label: "Settings" },
];

export const SettingsPage = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const resetAllData = useItiacStore((s) => s.resetAllData);

  const [defaultPage, setDefaultPage] = useState<string>(() => localStorage.getItem("defaultPage") || "dashboard");
  const [analysisScopeDefault, setAnalysisScopeDefault] = useState<string>(() => localStorage.getItem("analysisScopeDefault") || "non-online");
  const [compactTables, setCompactTables] = useState<boolean>(() => localStorage.getItem("compactTables") === "true");

  useEffect(() => {
    localStorage.setItem("defaultPage", defaultPage);
  }, [defaultPage]);

  useEffect(() => {
    localStorage.setItem("analysisScopeDefault", analysisScopeDefault);
  }, [analysisScopeDefault]);

  useEffect(() => {
    localStorage.setItem("compactTables", compactTables ? "true" : "false");
    try {
      const root = document.documentElement;
      if (compactTables) root.classList.add("compact-tables");
      else root.classList.remove("compact-tables");
    } catch {}
  }, [compactTables]);

  const onResetAll = async () => {
    const confirmMsg = "This will delete ALL components, dependencies, and workflows. Are you sure?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await resetAllData();
      toast.success("All data reset");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset data");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <Label className="md:col-span-1">Theme</Label>
            <div className="flex gap-2 md:col-span-2">
              <Button variant={resolvedTheme === "light" ? "secondary" : "ghost"} onClick={() => setTheme("light")}>Light</Button>
              <Button variant={resolvedTheme === "dark" ? "secondary" : "ghost"} onClick={() => setTheme("dark")}>Dark</Button>
              <Button variant={!theme || theme === "system" ? "secondary" : "ghost"} onClick={() => setTheme("system")}>System</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <Label htmlFor="compactTables" className="md:col-span-1">Compact tables</Label>
            <div className="md:col-span-2 flex items-center gap-3">
              <Switch id="compactTables" checked={!!compactTables} onCheckedChange={(v) => setCompactTables(!!v)} />
              <span className="text-sm text-muted-foreground">Reduces row padding in tables</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <Label className="md:col-span-1">Default start page</Label>
            <div className="md:col-span-2">
              <Select value={defaultPage} onValueChange={setDefaultPage}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  {PAGES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <Label className="md:col-span-1">Default analysis scope</Label>
            <div className="md:col-span-2">
              <Select value={analysisScopeDefault} onValueChange={setAnalysisScopeDefault}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non-online">Non-online only</SelectItem>
                  <SelectItem value="all-components">All components</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Reset all data</div>
              <div className="text-sm text-muted-foreground">Deletes all components, dependencies, and workflows</div>
            </div>
            <Button variant="destructive" onClick={onResetAll}>Reset</Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Need exports or imports? Go to the <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "data" } })); }} className="underline">Import/Export</a> page.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
