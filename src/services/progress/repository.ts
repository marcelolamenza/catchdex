import type { Progress, ProgressMap } from "../../domain/progress";
import { cloudProgressStore } from "./cloud";
import { localProgressStore } from "./local";

/** UI-facing progress contract shared by browser storage and Firestore providers. */
export interface ProgressPersistence {
  loadLocal(): ProgressMap;
  saveLocal(progress: ProgressMap): boolean;
  loadCloud(uid: string): Promise<ProgressMap>;
  saveCloud(uid: string, progress: ProgressMap): Promise<void>;
  saveCloudEntry(uid: string, id: number, progress: Progress): Promise<void>;
}

export const progressPersistence: ProgressPersistence = {
  loadLocal: () => localProgressStore.load(),
  saveLocal: progress => localProgressStore.save(progress),
  loadCloud: uid => cloudProgressStore.load(uid),
  saveCloud: (uid, progress) => cloudProgressStore.save(uid, progress),
  saveCloudEntry: (uid, id, progress) => cloudProgressStore.saveEntry(uid, id, progress),
};
