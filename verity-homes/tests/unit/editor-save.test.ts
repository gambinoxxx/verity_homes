// Unit 20b (Q57): editors reset in place after a save instead of remounting.
import { describe, expect, it, vi } from "vitest";
import { changedSince, latestVersion, resetToSaved } from "@/lib/editor-save";

type V = { title: string; showExactLocation: boolean; plots: { id?: string; label: string }[] };

function fakeForm(initial: V) {
  let values = structuredClone(initial);
  const dirty = new Set<string>();
  return {
    getValues: () => structuredClone(values),
    reset: vi.fn((v: V) => {
      values = structuredClone(v);
      dirty.clear();
    }),
    setValue: vi.fn((k: never, v: never) => {
      values = { ...values, [k]: v };
      dirty.add(k);
    }),
    dirty,
  };
}

const submitted: V = { title: "Duplex", showExactLocation: false, plots: [{ label: "A" }] };
// The server gave the new plot an id.
const saved: V = { ...submitted, plots: [{ id: "plot1", label: "A" }] };

describe("resetToSaved", () => {
  it("nothing changed in flight: the form is exactly what the server saved, nothing dirty", () => {
    const form = fakeForm(submitted);
    resetToSaved(form, submitted, saved);
    expect(form.getValues()).toEqual(saved);
    expect(form.dirty.size).toBe(0);
  });

  it("a switch flipped while the save was in flight is kept and stays unsaved", () => {
    const form = fakeForm({ ...submitted, showExactLocation: true });
    resetToSaved(form, submitted, saved);
    expect(form.getValues()).toEqual({ ...saved, showExactLocation: true });
    expect([...form.dirty]).toEqual(["showExactLocation"]);
  });
});

describe("changedSince", () => {
  it("compares top-level fields by value", () => {
    expect(changedSince(submitted, structuredClone(submitted))).toEqual([]);
    expect(changedSince(submitted, { ...submitted, title: "Villa" })).toEqual(["title"]);
  });
});

describe("latestVersion", () => {
  it("picks the newer updatedAt; either may be missing", () => {
    const a = "2026-11-24T10:00:00.000Z";
    const b = "2026-11-24T10:00:01.000Z";
    expect(latestVersion(a, b)).toBe(b);
    expect(latestVersion(b, a)).toBe(b);
    expect(latestVersion(undefined, a)).toBe(a);
    expect(latestVersion(a, undefined)).toBe(a);
  });
});
