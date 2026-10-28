import { describe, expect, it, vi } from "vitest";
import { migrateLocalProgressToCloud } from "./migration";
import type { ProgressPersistence } from "./repository";

describe("local progress migration", () => {
  it("loads the account before merging and saves the union without dropping either side", async () => {
    const cloud: Pick<ProgressPersistence, "loadCloud" | "saveCloud"> = {
      loadCloud: vi.fn().mockResolvedValue({ 2: { caught: true, wasOnTeam: false } }),
      saveCloud: vi.fn().mockResolvedValue(undefined),
    };
    const result = await migrateLocalProgressToCloud("user-1", {
      1: { caught: true, wasOnTeam: false },
      2: { caught: false, wasOnTeam: false },
    }, cloud);

    expect(cloud.loadCloud).toHaveBeenCalledWith("user-1");
    expect(cloud.saveCloud).toHaveBeenCalledWith("user-1", {
      1: { caught: true, wasOnTeam: false },
      2: { caught: true, wasOnTeam: false },
    });
    expect(result[1].caught).toBe(true);
    expect(result[2].caught).toBe(true);
  });

  it("does not write defaults before reading an empty account", async () => {
    const calls: string[] = [];
    const cloud: Pick<ProgressPersistence, "loadCloud" | "saveCloud"> = {
      loadCloud: vi.fn(async () => { calls.push("load"); return {}; }),
      saveCloud: vi.fn(async () => { calls.push("save"); }),
    };
    await migrateLocalProgressToCloud("user-2", {}, cloud);
    expect(calls).toEqual(["load", "save"]);
    expect(cloud.saveCloud).toHaveBeenCalledWith("user-2", {});
  });

  it("keeps migration unconfirmed if cloud persistence fails", async () => {
    const cloud: Pick<ProgressPersistence, "loadCloud" | "saveCloud"> = {
      loadCloud: vi.fn().mockResolvedValue({}),
      saveCloud: vi.fn().mockRejectedValue(new Error("offline")),
    };
    await expect(migrateLocalProgressToCloud("user-3", { 4: { caught: true, wasOnTeam: false } }, cloud))
      .rejects.toThrow("offline");
  });

  it("preserves explicit local edits made after a failed cloud initialization", async () => {
    const cloud: Pick<ProgressPersistence, "loadCloud" | "saveCloud"> = {
      loadCloud: vi.fn().mockResolvedValue({ 4: { caught: true, wasOnTeam: true } }),
      saveCloud: vi.fn().mockResolvedValue(undefined),
    };
    const result = await migrateLocalProgressToCloud("user-4", {
      4: { caught: true, wasOnTeam: true },
    }, cloud, {
      4: { caught: false, wasOnTeam: false },
    });
    expect(result[4]).toEqual({ caught: false, wasOnTeam: false });
    expect(cloud.saveCloud).toHaveBeenCalledWith("user-4", result);
  });
});
