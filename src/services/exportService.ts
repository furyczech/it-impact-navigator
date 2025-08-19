import { ITComponent, ComponentDependency, BusinessWorkflow, ImpactAnalysis } from "@/types/itiac";

export class ExportService {
  
  static exportToCSV(data: any[], filename: string, headers?: string[]) {
    if (data.length === 0) return;

    const csvHeaders = headers || Object.keys(data[0]);
    const csvContent = [
      csvHeaders.join(','),
      ...data.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Handle dates, arrays, and complex objects
          if (value instanceof Date) {
            return `"${value.toISOString()}"`;
          } else if (Array.isArray(value)) {
            return `"${value.join('; ')}"`;
          } else if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          } else {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
        }).join(',')
      )
    ].join('\n');

    this.downloadFile(csvContent, filename, 'text/csv');
  }

  static exportComponentsToCSV(components: ITComponent[]) {
    const headers = ['ID', 'Name', 'Type', 'Status', 'Criticality', 'Description', 'Location', 'Owner', 'Vendor', 'Last Updated'];
    const data = components.map(comp => ({
      'ID': comp.id,
      'Name': comp.name,
      'Type': comp.type,
      'Status': comp.status,
      'Criticality': comp.criticality,
      'Description': comp.description || '',
      'Location': comp.location || '',
      'Owner': comp.owner || '',
      'Vendor': comp.vendor || '',
      'Last Updated': comp.lastUpdated.toISOString()
    }));

    this.exportToCSV(data, 'itiac-it-assets.csv', headers);
  }

  static exportDependenciesToCSV(dependencies: ComponentDependency[], components: ITComponent[]) {
    const getComponentName = (id: string) => components.find(c => c.id === id)?.name || id;
    
    const headers = ['ID', 'Source IT Asset', 'Target IT Asset', 'Dependency Type', 'Criticality', 'Description'];
    const data = dependencies.map(dep => ({
      'ID': dep.id,
      'Source IT Asset': getComponentName(dep.sourceId),
      'Target IT Asset': getComponentName(dep.targetId),
      'Dependency Type': dep.type,
      'Criticality': dep.criticality,
      'Description': dep.description || ''
    }));

    this.exportToCSV(data, 'itiac-it-asset-dependencies.csv', headers);
  }

  static exportWorkflowsToCSV(workflows: BusinessWorkflow[], components: ITComponent[]) {
    const getComponentName = (id?: string) => id ? components.find(c => c.id === id)?.name || id : '';
    
    const headers = ['ID', 'Name', 'Description', 'Business Process', 'Criticality', 'Owner', 'Steps Count', 'Step Details', 'Last Updated'];
    const data = workflows.map(workflow => ({
      'ID': workflow.id,
      'Name': workflow.name,
      'Description': workflow.description || '',
      'Business Process': workflow.businessProcess,
      'Criticality': workflow.criticality,
      'Owner': workflow.owner || '',
      'Steps Count': workflow.steps.length,
      'Step Details': workflow.steps.map(step => 
        `${step.order}. ${step.name} (${getComponentName(step.primaryComponentId)})`
      ).join('; '),
      'Last Updated': workflow.lastUpdated.toISOString()
    }));

    this.exportToCSV(data, 'itiac-workflows.csv', headers);
  }

  static exportToJSON(data: any, filename: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  static exportFullBackup(
    components: ITComponent[],
    dependencies: ComponentDependency[],
    workflows: BusinessWorkflow[]
  ) {
    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        components,
        dependencies,
        workflows
      },
      metadata: {
        componentsCount: components.length,
        dependenciesCount: dependencies.length,
        workflowsCount: workflows.length
      }
    };

    this.exportToJSON(backup, `itiac-backup-${new Date().toISOString().split('T')[0]}.json`);
  }

  static exportImpactAnalysisResults(results: any[]) {
    const headers = [
      'IT Asset ID', 'IT Asset Name', 'Business Impact Score', 'Risk Level',
      'Direct Impacts Count', 'Direct Impacts', 'Indirect Impacts Count', 'Indirect Impacts',
      'Affected Workflows Count', 'Affected Workflows', 'Analysis Date'
    ];
    
    const data = results.map(result => ({
      'IT Asset ID': result.componentId,
      'IT Asset Name': result.componentName,
      'Business Impact Score': result.businessImpactScore,
      'Risk Level': result.riskLevel,
      'Direct Impacts Count': result.directImpacts.length,
      'Direct Impacts': result.directImpacts.join('; '),
      'Indirect Impacts Count': result.indirectImpacts.length,
      'Indirect Impacts': result.indirectImpacts.join('; '),
      'Affected Workflows Count': result.affectedWorkflows.length,
      'Affected Workflows': result.affectedWorkflows.join('; '),
      'Analysis Date': new Date().toISOString()
    }));

    this.exportToCSV(data, `impact-analysis-${new Date().toISOString().split('T')[0]}.csv`, headers);
  }

  static async generatePDFReport(
    components: ITComponent[],
    dependencies: ComponentDependency[],
    workflows: BusinessWorkflow[],
    analysisResults?: any[]
  ) {
    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();

    // Title
    pdf.setFontSize(20);
    pdf.text('ITIAC Analysis Report', 20, 30);
    
    // Generation date
    pdf.setFontSize(12);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);

    let yPosition = 60;

    // Summary section
    pdf.setFontSize(16);
    pdf.text('Summary', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(12);
    pdf.text(`Total IT Assets: ${components.length}`, 25, yPosition);
    yPosition += 10;
    pdf.text(`Total Dependencies: ${dependencies.length}`, 25, yPosition);
    yPosition += 10;
    pdf.text(`Total Workflows: ${workflows.length}`, 25, yPosition);
    yPosition += 10;
    
    const criticalComponents = components.filter(c => c.criticality === 'critical').length;
    pdf.text(`Critical IT Assets: ${criticalComponents}`, 25, yPosition);
    yPosition += 20;

    // Components by type
    pdf.setFontSize(16);
    pdf.text('IT Assets by Type', 20, yPosition);
    yPosition += 15;
    
    const componentsByType = components.reduce((acc, comp) => {
      acc[comp.type] = (acc[comp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    pdf.setFontSize(12);
    Object.entries(componentsByType).forEach(([type, count]) => {
      pdf.text(`${type}: ${count}`, 25, yPosition);
      yPosition += 10;
    });

    // Impact Analysis Results (if provided)
    if (analysisResults && analysisResults.length > 0) {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 30;
      }
      
      pdf.setFontSize(16);
      pdf.text('Impact Analysis Results', 20, yPosition);
      yPosition += 15;

      // Top 5 highest impact components
      const topImpacts = analysisResults
        .sort((a, b) => b.businessImpactScore - a.businessImpactScore)
        .slice(0, 5);

      pdf.setFontSize(12);
      pdf.text('Top 5 Highest Impact IT Assets:', 25, yPosition);
      yPosition += 10;

      topImpacts.forEach((result, index) => {
        pdf.text(
          `${index + 1}. ${result.componentName} (Score: ${result.businessImpactScore}, Risk: ${result.riskLevel})`,
          30, yPosition
        );
        yPosition += 10;
      });
    }

    // Save the PDF
    pdf.save(`itiac-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  static importFromJSON(jsonContent: string): {
    components: ITComponent[];
    dependencies: ComponentDependency[];
    workflows: BusinessWorkflow[];
  } | null {
    try {
      const data = JSON.parse(jsonContent);
      
      // Validate structure
      if (!data.data || !data.data.components || !data.data.dependencies || !data.data.workflows) {
        throw new Error('Invalid backup file structure');
      }

      // Convert date strings back to Date objects
      const components = data.data.components.map((comp: any) => ({
        ...comp,
        lastUpdated: new Date(comp.lastUpdated)
      }));

      const workflows = data.data.workflows.map((workflow: any) => ({
        ...workflow,
        lastUpdated: new Date(workflow.lastUpdated)
      }));

      return {
        components,
        dependencies: data.data.dependencies,
        workflows
      };
    } catch (error) {
      console.error('Failed to import JSON:', error);
      return null;
    }
  }

  static parseCSVComponents(csvContent: string): ITComponent[] {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map((line, index) => {
        const values = this.parseCSVLine(line);
        // Support both old and new header layouts (without/with Vendor)
        const vendorIndex = headers.includes('Vendor') ? headers.indexOf('Vendor') : -1;
        const lastUpdatedIndex = headers.indexOf('Last Updated');
        const component: ITComponent = {
          id: values[0] || `imported-${Date.now()}-${index}`,
          name: values[1] || `Component ${index + 1}`,
          type: values[2] as ITComponent['type'] || 'service',
          status: values[3] as ITComponent['status'] || 'online',
          criticality: values[4] as ITComponent['criticality'] || 'medium',
          description: values[5] || '',
          location: values[6] || '',
          owner: values[7] || '',
          vendor: vendorIndex >= 0 ? (values[vendorIndex] || '') : undefined,
          lastUpdated: lastUpdatedIndex >= 0 && values[lastUpdatedIndex] ? new Date(values[lastUpdatedIndex]) : new Date()
        };
        return component;
      });
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}