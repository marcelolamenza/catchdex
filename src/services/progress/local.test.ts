import { beforeEach, describe, expect, it, vi } from "vitest";
import { localProgressStore } from "./local";

describe("local progress storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("loads valid progress and safely ignores malformed JSON", () => {
    window.localStorage.setItem("catchdex-progress-v1", JSON.stringify({ 4: { caught: true } }));
    expect(localProgressStore.load()[4]).toEqual({ caught: true, wasOnTeam: false });
    window.localStorage.setItem("catchdex-progress-v1", "not json");
    expect(localProgressStore.load()).toEqual({});
  });

  it("reports unavailable browser storage without throwing", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(localProgressStore.load()).toEqual({});
    expect(localProgressStore.save({ 4: { caught: true, wasOnTeam: false } })).toBe(false);
    get.mockRestore();set.mockRestore();
  });
});
