import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(), signOut: vi.fn(), observe: vi.fn(),
  migrate: vi.fn(), localLoad: vi.fn(), localSave: vi.fn(), cloudLoad: vi.fn(), cloudSave: vi.fn(), cloudSaveEntry: vi.fn(),
}));

vi.mock("./data/pokemon.json", () => ({ default: [{
  id: 4, name: "Charmander", generation: 1, types: ["fire"], sprite: "",
  baseStats: { hp: 39, attack: 52, defense: 43, specialAttack: 60, specialDefense: 50, speed: 65 },
}] }));
vi.mock("./services/firebase", () => ({
  firebaseReady: true, firebaseMissingConfig: [],
  observeAuth: mocks.observe, signInWithGoogle: mocks.signIn, signOutCurrentUser: mocks.signOut,
}));
vi.mock("./services/progress/repository", () => ({ progressPersistence: {
  loadLocal: mocks.localLoad, saveLocal: mocks.localSave, loadCloud: mocks.cloudLoad,
  saveCloud: mocks.cloudSave, saveCloudEntry: mocks.cloudSaveEntry,
} }));
vi.mock("./services/progress/migration", () => ({ migrateLocalProgressToCloud: mocks.migrate }));

import App from "./App";

describe("Google sign-in UI", () => {
  afterEach(() => { cleanup();vi.clearAllMocks(); });

  it("shows an in-progress state while Google sign-in is pending", async () => {
    let finishSignIn: (() => void) | undefined;
    mocks.observe.mockImplementation((onUser: (user: null) => void) => { onUser(null);return vi.fn(); });
    mocks.localLoad.mockReturnValue({});mocks.localSave.mockReturnValue(true);
    mocks.signIn.mockImplementation(() => new Promise<void>(resolve => { finishSignIn=resolve; }));
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(screen.getByRole("button", { name: "Connecting…" })).toBeDisabled();
    finishSignIn?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeEnabled());
  });

  it("shows an actionable message when Google sign-in fails", async () => {
    mocks.observe.mockImplementation((onUser: (user: null) => void) => { onUser(null);return vi.fn(); });
    mocks.localLoad.mockReturnValue({});mocks.localSave.mockReturnValue(true);
    mocks.signIn.mockRejectedValue(new Error("popup blocked"));
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(await screen.findByText(/Google sign-in failed.*authorized domain/i)).toBeInTheDocument();
  });
});
