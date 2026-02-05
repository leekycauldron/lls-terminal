import type { StageRegistryEntry, StageComponentProps } from './types';

const registry: StageRegistryEntry[] = [];

export function registerStage(entry: StageRegistryEntry) {
  const existing = registry.findIndex((r) => r.id === entry.id);
  if (existing >= 0) {
    registry[existing] = entry;
  } else {
    registry.push(entry);
    registry.sort((a, b) => a.order - b.order);
  }
}

export function getStages(): StageRegistryEntry[] {
  return [...registry];
}

export function getStageComponent(
  stageId: string
): React.ComponentType<StageComponentProps> | null {
  const entry = registry.find((r) => r.id === stageId);
  return entry?.component ?? null;
}
