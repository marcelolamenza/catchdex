import { mergeProgress, type ProgressMap } from "../../domain/progress";
import type { ProgressPersistence } from "./repository";

/** Load cloud data first, merge positive local flags, then await verified cloud writes. */
export async function migrateLocalProgressToCloud(
  uid: string,
  local: ProgressMap,
  cloud: Pick<ProgressPersistence, "loadCloud" | "saveCloud">,
  pendingOverrides: ProgressMap = {},
): Promise<ProgressMap> {
  const existingCloud = await cloud.loadCloud(uid);
  const merged = mergeProgress(local, existingCloud);
  for (const [id, value] of Object.entries(pendingOverrides)) merged[Number(id)] = value;
  await cloud.saveCloud(uid, merged);
  return merged;
}
