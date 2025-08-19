import { ComponentDependency } from "@/types/itiac";

export class ValidationService {
  
  static validateDependency(
    newDependency: ComponentDependency, 
    existingDependencies: ComponentDependency[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for self-loop
    if (newDependency.sourceId === newDependency.targetId) {
      errors.push("An IT asset cannot depend on itself");
    }

    // Check for duplicate dependency
    const duplicate = existingDependencies.find(dep => 
      dep.sourceId === newDependency.sourceId && 
      dep.targetId === newDependency.targetId &&
      dep.id !== newDependency.id
    );
    if (duplicate) {
      errors.push("This dependency already exists");
    }

    // Check for circular dependencies
    if (this.wouldCreateCircularDependency(newDependency, existingDependencies)) {
      errors.push("This dependency would create a circular dependency");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static wouldCreateCircularDependency(
    newDependency: ComponentDependency,
    existingDependencies: ComponentDependency[]
  ): boolean {
    // Create a temporary dependency list including the new one
    const allDeps = [...existingDependencies, newDependency];
    
    // Check if adding this dependency creates a cycle
    return this.hasCyclicDependency(newDependency.targetId, newDependency.sourceId, allDeps, new Set());
  }

  private static hasCyclicDependency(
    currentNode: string,
    targetNode: string,
    dependencies: ComponentDependency[],
    visited: Set<string>
  ): boolean {
    if (currentNode === targetNode) {
      return true;
    }

    if (visited.has(currentNode)) {
      return false;
    }

    visited.add(currentNode);

    // Find all dependencies where current node is the source
    const outgoingDeps = dependencies.filter(dep => dep.sourceId === currentNode);
    
    for (const dep of outgoingDeps) {
      if (this.hasCyclicDependency(dep.targetId, targetNode, dependencies, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  static detectAllCycles(dependencies: ComponentDependency[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    // Get all unique component IDs
    const componentIds = new Set<string>();
    dependencies.forEach(dep => {
      componentIds.add(dep.sourceId);
      componentIds.add(dep.targetId);
    });

    for (const componentId of componentIds) {
      if (!visited.has(componentId)) {
        const currentPath: string[] = [];
        this.findCycles(componentId, dependencies, visited, recursionStack, currentPath, cycles);
      }
    }

    return cycles;
  }

  private static findCycles(
    node: string,
    dependencies: ComponentDependency[],
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
    cycles: string[][]
  ): void {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);

    const outgoingDeps = dependencies.filter(dep => dep.sourceId === node);
    
    for (const dep of outgoingDeps) {
      const targetNode = dep.targetId;
      
      if (!visited.has(targetNode)) {
        this.findCycles(targetNode, dependencies, visited, recursionStack, [...currentPath], cycles);
      } else if (recursionStack.has(targetNode)) {
        // Found a cycle
        const cycleStartIndex = currentPath.indexOf(targetNode);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex);
          cycle.push(targetNode); // Complete the cycle
          cycles.push(cycle);
        }
      }
    }

    recursionStack.delete(node);
  }

  static getSinglePointsOfFailure(
    dependencies: ComponentDependency[],
    threshold: number = 2
  ): string[] {
    const componentMetrics = new Map<string, { incoming: number; outgoing: number }>();

    // Initialize metrics
    dependencies.forEach(dep => {
      if (!componentMetrics.has(dep.sourceId)) {
        componentMetrics.set(dep.sourceId, { incoming: 0, outgoing: 0 });
      }
      if (!componentMetrics.has(dep.targetId)) {
        componentMetrics.set(dep.targetId, { incoming: 0, outgoing: 0 });
      }

      componentMetrics.get(dep.sourceId)!.outgoing++;
      componentMetrics.get(dep.targetId)!.incoming++;
    });

    // Find SPOFs: high outgoing dependencies with low incoming alternatives
    const spofs: string[] = [];
    
    componentMetrics.forEach((metrics, componentId) => {
      if (metrics.outgoing >= threshold && metrics.incoming <= 1) {
        spofs.push(componentId);
      }
    });

    return spofs;
  }

  static validateDependencyType(
    sourceType: string,
    targetType: string,
    dependencyType: string
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Define logical dependency rules
    const rules = {
      'load-balancer': {
        canFeedTo: ['server', 'application'],
        canRequire: ['network'],
        canUse: ['network']
      },
      'api': {
        canRequire: ['database', 'service'],
        canUse: ['database', 'service', 'network']
      },
      'application': {
        canRequire: ['api', 'database'],
        canUse: ['api', 'service', 'network']
      },
      'database': {
        canRequire: ['server', 'network'],
        canMonitor: ['server']
      }
    };

    // Check if the dependency makes logical sense
    const sourceRules = rules[sourceType as keyof typeof rules];
    if (sourceRules) {
      const allowedTargets = sourceRules[`can${dependencyType.charAt(0).toUpperCase() + dependencyType.slice(1)}` as keyof typeof sourceRules] as string[] | undefined;
      
      if (allowedTargets && !allowedTargets.includes(targetType)) {
        warnings.push(`${sourceType} typically doesn't ${dependencyType} ${targetType}`);
      }
    }

    return { isValid, warnings };
  }
}