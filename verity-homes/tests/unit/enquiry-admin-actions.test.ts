// lib/actions/enquiry-admin.ts (Unit 16): Zod → requireAdmin() → write. Auth and the database
// writes are mocked, so nothing touches real data.
import { beforeEach, describe, expect, it, vi } from "vitest";

class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath,
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
const updateEnquiryStatus = vi.fn(async (id: string, status: string) => ({ id, status }));
const updateEnquiryNote = vi.fn(async (id: string, note: string | null) => ({ id, note }));
vi.mock("@/lib/db/mutations/enquiries", () => ({ updateEnquiryStatus, updateEnquiryNote }));

const { setEnquiryStatus, saveEnquiryNote } = await import("@/lib/actions/enquiry-admin");
const ID = "cmwabc1234567";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
});

describe("setEnquiryStatus", () => {
  it("admin: writes and refreshes the admin layout (badge + dashboard)", async () => {
    const res = await setEnquiryStatus(ID, "CONTACTED");
    expect(res).toEqual({
      ok: true,
      data: { status: "CONTACTED", message: "Marked as contacted." },
    });
    expect(updateEnquiryStatus).toHaveBeenCalledWith(ID, "CONTACTED");
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("rejects a non-admin without writing", async () => {
    requireAdmin.mockRejectedValueOnce(new ForbiddenError());
    expect(await setEnquiryStatus(ID, "CLOSED")).toEqual({
      ok: false,
      error: "You don't have permission to do that.",
    });
    expect(updateEnquiryStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["", "CLOSED"],
    ["../etc", "CLOSED"],
    [42, "CLOSED"],
    [ID, "DELETED"],
    [ID, null],
  ])("rejects bad input before the admin check: id=%s status=%s", async (id, status) => {
    expect((await setEnquiryStatus(id, status)).ok).toBe(false);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(updateEnquiryStatus).not.toHaveBeenCalled();
  });

  it("a missing enquiry is a friendly error", async () => {
    updateEnquiryStatus.mockResolvedValueOnce(null as never);
    expect(await setEnquiryStatus(ID, "CLOSED")).toEqual({
      ok: false,
      error: "That enquiry no longer exists.",
    });
  });

  it("signed out: the sign-in redirect is not swallowed", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValueOnce(redirect);
    await expect(setEnquiryStatus(ID, "CLOSED")).rejects.toBe(redirect);
  });
});

describe("saveEnquiryNote", () => {
  it("saves; blank becomes null", async () => {
    expect(await saveEnquiryNote(ID, "Called, booked Saturday")).toEqual({
      ok: true,
      data: { note: "Called, booked Saturday" },
    });
    await saveEnquiryNote(ID, "   ");
    expect(updateEnquiryNote).toHaveBeenLastCalledWith(ID, null);
  });

  it("rejects non-admins, bad ids and long notes without writing", async () => {
    requireAdmin.mockRejectedValueOnce(new ForbiddenError());
    expect((await saveEnquiryNote(ID, "x")).ok).toBe(false);
    expect((await saveEnquiryNote("bad id", "x")).ok).toBe(false);
    expect(await saveEnquiryNote(ID, "x".repeat(2001))).toEqual({
      ok: false,
      error: "Keep the note under 2000 characters.",
    });
    expect(updateEnquiryNote).not.toHaveBeenCalled();
  });
});
