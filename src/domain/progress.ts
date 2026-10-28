export type Progress = { caught: boolean; wasOnTeam: boolean };
export type ProgressMap = Record<number, Progress>;
export const EMPTY: Progress = { caught: false, wasOnTeam: false };
export function normalizeProgress(value: unknown): ProgressMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: ProgressMap = {};
  for (const [key, raw] of Object.entries(value)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || !raw || typeof raw !== "object") continue;
    const item = raw as Partial<Progress>;
    const caught = item.caught === true || item.wasOnTeam === true;
    result[id] = { caught, wasOnTeam: caught && item.wasOnTeam === true };
  }
  return result;
}
export function updateProgress(map: ProgressMap, id: number, patch: Partial<Progress>): ProgressMap {
  const before = map[id] ?? EMPTY;
  const caught = patch.caught ?? (patch.wasOnTeam ? true : before.caught);
  const wasOnTeam = caught && (patch.wasOnTeam ?? before.wasOnTeam);
  return { ...map, [id]: { caught, wasOnTeam } };
}
export function mergeProgress(local: ProgressMap, cloud: ProgressMap): ProgressMap {
  const merged: ProgressMap = {};
  for (const id of new Set([...Object.keys(local), ...Object.keys(cloud)].map(Number))) {
    const a = local[id] ?? EMPTY, b = cloud[id] ?? EMPTY;
    const caught = a.caught || b.caught || a.wasOnTeam || b.wasOnTeam;
    merged[id] = { caught, wasOnTeam: caught && (a.wasOnTeam || b.wasOnTeam) };
  }
  return merged;
}
export function filterByGeneration<T extends {generation:number}>(catalog:T[], generation:number) {
  return generation === 0 ? catalog : catalog.filter(p => p.generation === generation);
}
