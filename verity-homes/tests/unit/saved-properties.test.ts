import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSavedSnapshot, isSaved, toggleSaved } from "@/lib/saved-properties";

// Minimal window + localStorage for the node test environment.
function installWindow(storage: Partial<Storage>) {
  const target = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });
}

function memoryStorage(): Partial<Storage> {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("saved properties", () => {
  beforeEach(() => installWindow(memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("toggles a slug on and off", () => {
    expect(toggleSaved("duplex")).toBe(true);
    expect(isSaved(getSavedSnapshot(), "duplex")).toBe(true);
    expect(toggleSaved("duplex")).toBe(false);
    expect(isSaved(getSavedSnapshot(), "duplex")).toBe(false);
  });

  it("survives storage that throws or holds junk", () => {
    installWindow({
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    expect(getSavedSnapshot()).toBe("[]");
    expect(toggleSaved("duplex")).toBeNull();
    expect(isSaved("not json", "duplex")).toBe(false);
  });
});
