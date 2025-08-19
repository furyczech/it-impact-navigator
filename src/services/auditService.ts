export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'ANALYSIS';
  entityType: 'COMPONENT' | 'DEPENDENCY' | 'WORKFLOW' | 'SYSTEM';
  entityId?: string;
  entityName?: string;
  details: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
}

export class AuditService {
  private static readonly STORAGE_KEY = 'itiac-audit-logs';
  private static readonly MAX_LOGS = 1000; // Keep last 1000 logs

  static log(
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    details: Record<string, any>,
    entityId?: string,
    entityName?: string,
    changes?: AuditLog['changes']
  ): void {
    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: 'system-user', // TODO: Replace with actual user ID when auth is implemented
      action,
      entityType,
      entityId,
      entityName,
      details,
      changes
    };

    this.addLog(auditLog);
  }

  static logComponentAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    component: any,
    beforeComponent?: any
  ): void {
    this.log(
      action,
      'COMPONENT',
      {
        componentType: component.type,
        criticality: component.criticality,
        status: component.status
      },
      component.id,
      component.name,
      beforeComponent ? { before: beforeComponent, after: component } : undefined
    );
  }

  static logDependencyAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    dependency: any,
    sourceComponentName?: string,
    targetComponentName?: string,
    beforeDependency?: any
  ): void {
    this.log(
      action,
      'DEPENDENCY',
      {
        dependencyType: dependency.type,
        criticality: dependency.criticality,
        sourceComponent: sourceComponentName,
        targetComponent: targetComponentName
      },
      dependency.id,
      `${sourceComponentName} → ${targetComponentName}`,
      beforeDependency ? { before: beforeDependency, after: dependency } : undefined
    );
  }

  static logWorkflowAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    workflow: any,
    beforeWorkflow?: any
  ): void {
    this.log(
      action,
      'WORKFLOW',
      {
        businessProcess: workflow.businessProcess,
        criticality: workflow.criticality,
        stepsCount: workflow.steps?.length || 0
      },
      workflow.id,
      workflow.name,
      beforeWorkflow ? { before: beforeWorkflow, after: workflow } : undefined
    );
  }

  static logAnalysisRun(
    analysisType: string,
    componentCount: number,
    resultsCount: number,
    targetComponent?: string
  ): void {
    this.log(
      'ANALYSIS',
      'SYSTEM',
      {
        analysisType,
        componentCount,
        resultsCount,
        targetComponent: targetComponent || 'all'
      }
    );
  }

  static logExport(
    exportType: string,
    filename: string,
    recordCount: number
  ): void {
    this.log(
      'EXPORT',
      'SYSTEM',
      {
        exportType,
        filename,
        recordCount
      }
    );
  }

  static logImport(
    importType: string,
    filename: string,
    recordCount: number,
    errors?: string[]
  ): void {
    this.log(
      'IMPORT',
      'SYSTEM',
      {
        importType,
        filename,
        recordCount,
        errors: errors || [],
        hasErrors: (errors && errors.length > 0) || false
      }
    );
  }

  static getLogs(
    limit?: number,
    entityType?: AuditLog['entityType'],
    action?: AuditLog['action'],
    fromDate?: Date,
    toDate?: Date
  ): AuditLog[] {
    const logs = this.getAllLogs();
    
    let filteredLogs = logs;

    // Filter by entity type
    if (entityType) {
      filteredLogs = filteredLogs.filter(log => log.entityType === entityType);
    }

    // Filter by action
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    // Filter by date range
    if (fromDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= fromDate);
    }
    if (toDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= toDate);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return filteredLogs;
  }

  static getActivitySummary(days: number = 7): {
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsPerDay: Record<string, number>;
    topEntities: Array<{ name: string; actions: number }>;
  } {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    
    const logs = this.getLogs(undefined, undefined, undefined, fromDate);
    
    const actionsByType: Record<string, number> = {};
    const actionsPerDay: Record<string, number> = {};
    const entityActions: Record<string, number> = {};

    logs.forEach(log => {
      // Count by action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      
      // Count by day
      const day = log.timestamp.toISOString().split('T')[0];
      actionsPerDay[day] = (actionsPerDay[day] || 0) + 1;
      
      // Count by entity
      if (log.entityName) {
        entityActions[log.entityName] = (entityActions[log.entityName] || 0) + 1;
      }
    });

    // Get top entities
    const topEntities = Object.entries(entityActions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, actions]) => ({ name, actions }));

    return {
      totalActions: logs.length,
      actionsByType,
      actionsPerDay,
      topEntities
    };
  }

  static exportAuditLogs(fromDate?: Date, toDate?: Date): void {
    const logs = this.getLogs(undefined, undefined, undefined, fromDate, toDate);
    
    const csvContent = [
      'Timestamp,User,Action,Entity Type,Entity Name,Details',
      ...logs.map(log => 
        `"${log.timestamp.toISOString()}","${log.userId || 'N/A'}","${log.action}","${log.entityType}","${log.entityName || 'N/A'}","${JSON.stringify(log.details).replace(/"/g, '""')}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const allLogs = this.getAllLogs();
    const logsToKeep = allLogs.filter(log => log.timestamp >= cutoffDate);
    const removedCount = allLogs.length - logsToKeep.length;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logsToKeep));
    
    return removedCount;
  }

  private static addLog(log: AuditLog): void {
    const existingLogs = this.getAllLogs();
    const updatedLogs = [log, ...existingLogs];
    
    // Keep only the most recent logs
    if (updatedLogs.length > this.MAX_LOGS) {
      updatedLogs.splice(this.MAX_LOGS);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLogs));
  }

  private static getAllLogs(): AuditLog[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const logs = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      return [];
    }
  }
}
