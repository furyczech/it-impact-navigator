import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ITComponent, ComponentDependency } from "@/types/itiac"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Graph utilities to ensure single-source of truth for downstream impact logic

/**
 * Build a forward adjacency map (sourceId -> targetIds[]) from dependencies.
 * Optionally restrict to a set of allowed node ids (e.g., visible nodes).
 */
export function buildForwardMap(
  dependencies: ComponentDependency[],
  allowedIds?: Set<string>
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (allowedIds) {
      if (!allowedIds.has(dep.sourceId) || !allowedIds.has(dep.targetId)) continue;
    }
    if (!adj.has(dep.sourceId)) adj.set(dep.sourceId, []);
    adj.get(dep.sourceId)!.push(dep.targetId);
  }
  return adj;
}

/**
 * Traverse downstream from roots using forward adjacency. Returns all reached ids,
 * excluding any ids in stopSet (e.g., true offline roots) and excluding the roots themselves.
 */
export function traverseDownstream(
  roots: Iterable<string>,
  forwardMap: Map<string, string[]>,
  stopSet?: Set<string>
): Set<string> {
  const visited = new Set<string>();
  const impacted = new Set<string>();
  const queue: string[] = [];
  for (const r of roots) queue.push(r);

  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const nbrs = forwardMap.get(cur) || [];
    for (const nb of nbrs) {
      if (stopSet && stopSet.has(nb)) {
        // do not overwrite/duplicate offline roots
        continue;
      }
      if (!visited.has(nb)) {
        impacted.add(nb);
        queue.push(nb);
      }
    }
  }
  return impacted;
}

/**
 * Compute impacted set given components and dependencies, propagating downstream
 * from offline components. Optionally restrict to visible ids.
 */
export function computeImpactedFromOfflines(
  components: ITComponent[],
  dependencies: ComponentDependency[],
  visibleIds?: Set<string>
): Set<string> {
  const offlineIds = new Set(
    components.filter(c => c.status === 'offline').map(c => c.id)
  );
  if (offlineIds.size === 0) return new Set<string>();
  const allowed = visibleIds ?? undefined;
  const fwd = buildForwardMap(dependencies, allowed);
  return traverseDownstream(offlineIds, fwd, offlineIds);
}
