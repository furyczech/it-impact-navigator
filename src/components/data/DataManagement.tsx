import { useMemo, useState } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { ExportService } from "@/services/exportService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileJson, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { computeAnalysisResults } from "@/lib/analysis";

export const DataManagement = () => {
  const components = useItiacStore((s) => s.components);
  const dependencies = useItiacStore((s) => s.dependencies);
  const workflows = useItiacStore((s) => s.workflows);
  const importData = useItiacStore((s) => s.importData);

  const [importing, setImporting] = useState(false);

  const analysisResultsAll = useMemo(() => {
    return computeAnalysisResults(components, dependencies, workflows, 'all-components');
  }, [components, dependencies, workflows]);

  const handleExportBackup = () => {
    ExportService.exportFullBackup(components, dependencies, workflows);
  };

  const handleExportCSV = (type: 'components' | 'dependencies' | 'workflows') => {
    if (type === 'components') ExportService.exportComponentsToCSV(components);
    if (type === 'dependencies') ExportService.exportDependenciesToCSV(dependencies, components);
    if (type === 'workflows') ExportService.exportWorkflowsToCSV(workflows, components);
  };

  const handleExportAnalysisCSV = () => {
    ExportService.exportImpactAnalysisResults(analysisResultsAll);
  };

  const handleExportPDF = async () => {
    await ExportService.generatePDFReport(components, dependencies, workflows, analysisResultsAll);
  };

  const pickFile = async (accept: string) => {
    return new Promise<File | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
      input.click();
    });
  };

  const handleImportBackupJSON = async () => {
    const file = await pickFile('.json');
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = ExportService.importFromJSON(text);
      if (!parsed) return;
      await importData({ components: parsed.components, dependencies: parsed.dependencies, workflows: parsed.workflows });
    } finally {
      setImporting(false);
    }
  };

  const handleImportComponentsCSV = async () => {
    const file = await pickFile('.csv');
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const componentsParsed = ExportService.parseCSVComponents(text);
      await importData({ components: componentsParsed });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Import / Export</h1>
          <p className="page-subtitle">Manage backups, CSV imports, and reports</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="section-title flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" /> JSON Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button onClick={handleExportBackup} className="inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Full Backup (JSON)
          </Button>
          <Button variant="secondary" disabled={importing} onClick={handleImportBackupJSON} className="inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import Backup (JSON)
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="section-title flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" /> CSV Exports / Imports
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => handleExportCSV('components')} className="inline-flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export IT Assets (CSV)
          </Button>
          <Button onClick={() => handleExportCSV('dependencies')} className="inline-flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export Dependencies (CSV)
          </Button>
          <Button onClick={() => handleExportCSV('workflows')} className="inline-flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export Workflows (CSV)
          </Button>
          <div className="w-px bg-border mx-2" />
          <Button variant="secondary" disabled={importing} onClick={handleImportComponentsCSV} className="inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import IT Assets (CSV)
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="section-title flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Impact Analysis Exports
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleExportAnalysisCSV} className="inline-flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export Analysis (CSV)
          </Button>
          <Button variant="secondary" onClick={handleExportPDF} className="inline-flex items-center gap-2">
            <FileText className="w-4 h-4" /> Generate PDF Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
