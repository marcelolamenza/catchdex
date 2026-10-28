import { normalizeProgress, type ProgressMap } from "../../domain/progress";

const STORAGE_KEY = "catchdex-progress-v1";

export const localProgressStore = {
  load(): ProgressMap {
    try {
      return normalizeProgress(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return {};
    }
  },
  save(progress: ProgressMap) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
      return true;
    } catch {
      return false;
    }
  },
};
