import { collection, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { normalizeProgress, type Progress, type ProgressMap } from "../../domain/progress";
import { db } from "../firebase";

const MAX_POKEMON_ID = 1025;
// Keep headroom for per-document field transforms in Firestore's batch write limits.
const BATCH_SIZE = 200;

function progressRef(uid: string, id: number) {
  if (!db) throw new Error("Firebase is not configured.");
  if (!Number.isInteger(id) || id < 1 || id > MAX_POKEMON_ID) throw new Error("Invalid Pokédex number.");
  return doc(db, "users", uid, "progress", String(id));
}

export const cloudProgressStore = {
  async load(uid: string): Promise<ProgressMap> {
    if (!db) throw new Error("Firebase is not configured.");
    const snapshot = await getDocs(collection(db, "users", uid, "progress"));
    const raw: Record<string, unknown> = {};
    snapshot.forEach(item => {
      const id = Number(item.id);
      if (Number.isInteger(id) && id >= 1 && id <= MAX_POKEMON_ID) raw[String(id)] = item.data();
    });
    return normalizeProgress(raw);
  },

  async save(uid: string, progress: ProgressMap): Promise<void> {
    const entries = Object.entries(normalizeProgress(progress)).filter(([id]) => Number(id) <= MAX_POKEMON_ID);
    for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
      if (!db) throw new Error("Firebase is not configured.");
      const batch = writeBatch(db);
      for (const [id, value] of entries.slice(offset, offset + BATCH_SIZE)) {
        batch.set(progressRef(uid, Number(id)), { ...value, updatedAt: serverTimestamp() });
      }
      await batch.commit();
    }
  },

  async saveEntry(uid: string, id: number, progress: Progress): Promise<void> {
    await setDoc(progressRef(uid, id), { ...progress, updatedAt: serverTimestamp() });
  },
};
