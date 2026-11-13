// lib/actions/property.ts (Unit 14): Zod → requireAdmin() → write → updateTag. The auth helper,
// the database writes and Blob storage are mocked, so nothing here touches real data.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_PROPERTY } from "@/lib/validation/property";

class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));

const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath,
  cacheTag: () => {},
  cacheLife: () => {},
}));

const m = {
  isPropertySlugTaken: vi.fn<(slug: string, exceptId?: string) => Promise<boolean>>(
    async () => false,
  ),
  insertProperty: vi.fn(async (...[, slug]: [unknown, string, string]) => ({
    id: "p1",
    slug,
    status: "DRAFT",
  })),
  findPropertyState: vi.fn(async (id: string) => ({
    id,
    slug: "old-slug",
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
    title: "T",
    area: "Lekki",
    priceKobo: 100n as bigint | null,
    priceOnRequest: false,
    publishedAt: null as Date | null,
  })),
  savePropertyEdits: vi.fn(async (id: string, _d: unknown, slug: string) => ({
    id,
    slug,
    status: "DRAFT",
  })),
  setPropertyStatus: vi.fn(async (...[id, status]: [string, string, Date?]) => ({
    id,
    slug: "old-slug",
    status,
  })),
  deletePropertyRow: vi.fn<
    (id: string) => Promise<{ slug: string; title: string; imageUrls: string[] }>
  >(async () => ({
    slug: "old-slug",
    title: "T",
    imageUrls: ["/samples/a.jpg", "https://x.public.blob.vercel-storage.com/p/a.jpg"],
  })),
};
vi.mock("@/lib/db/mutations/properties", () => m);
// Stop the real cached-queries module (and its Prisma client) from loading.
vi.mock("@/lib/db/queries/properties", () => ({ PROPERTIES_TAG: "properties" }));

const remove = vi.fn<(urls: readonly string[]) => Promise<{ removed: number }>>(async () => ({
  removed: 1,
}));
vi.mock("@/lib/storage", () => ({ remove }));

const actions = await import("@/lib/actions/property");
const valid = { ...EMPTY_PROPERTY, title: "[SAMPLE] Test", area: "Lekki", price: "1,000,000" };

const calls = () =>
  Object.values(m).reduce((n, fn) => n + fn.mock.calls.length, 0) + remove.mock.calls.length;

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
});

describe("every action rejects a non-admin without writing", () => {
  const cases: [string, () => Promise<{ ok: boolean }>][] = [
    ["createProperty", () => actions.createProperty(valid)],
    ["updateProperty", () => actions.updateProperty("p1", valid)],
    ["publishProperty", () => actions.publishProperty("p1")],
    ["unpublishProperty", () => actions.unpublishProperty("p1")],
    ["deleteProperty", () => actions.deleteProperty("p1")],
  ];
  for (const [name, run] of cases) {
    it(name, async () => {
      requireAdmin.mockRejectedValue(new ForbiddenError("no"));
      const res = await run();
      expect(res).toEqual({ ok: false, error: "You don't have permission to do that." });
      expect(requireAdmin).toHaveBeenCalledTimes(1);
      expect(calls()).toBe(0);
      expect(updateTag).not.toHaveBeenCalled();
    });
  }

  it("signed out: the sign-in redirect is not swallowed", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValue(redirect);
    await expect(actions.createProperty(valid)).rejects.toBe(redirect);
    expect(calls()).toBe(0);
  });
});

describe("Zod runs before the admin check", () => {
  it("invalid input → field errors, no auth call, no write", async () => {
    const res = await actions.createProperty({ ...valid, title: "", slug: "Bad Slug" });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.fieldErrors).toMatchObject({
      title: "Add a title",
      slug: expect.stringMatching(/lowercase/),
    });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(calls()).toBe(0);
  });

  it("a bad id is rejected before anything else", async () => {
    expect((await actions.deleteProperty("")).ok).toBe(false);
    expect(requireAdmin).not.toHaveBeenCalled();
  });
});

describe("admin writes, then updates the 'properties' tag", () => {
  it("create: slug from the title, saved as a draft", async () => {
    const res = await actions.createProperty(valid);
    expect(res).toMatchObject({ ok: true, data: { id: "p1", slug: "sample-test" } });
    expect(m.insertProperty).toHaveBeenCalledWith(
      expect.objectContaining({ title: "[SAMPLE] Test", priceKobo: 100_000_000n }),
      "sample-test",
      "user_admin",
    );
    expect(updateTag).toHaveBeenCalledWith("properties");
    expect(revalidatePath).toHaveBeenCalledWith("/properties");
  });

  it("create: a slug already in use is a field error", async () => {
    m.isPropertySlugTaken.mockResolvedValueOnce(true);
    const res = await actions.createProperty({ ...valid, slug: "taken" });
    expect(!res.ok && res.fieldErrors?.slug).toMatch(/already uses/);
    expect(m.insertProperty).not.toHaveBeenCalled();
  });

  it("update passes the previous slug/status so a published rename gets a redirect", async () => {
    await actions.updateProperty("p1", { ...valid, slug: "new-slug" });
    expect(m.savePropertyEdits).toHaveBeenCalledWith(
      "p1",
      expect.anything(),
      "new-slug",
      expect.objectContaining({ slug: "old-slug", status: "DRAFT" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/properties/old-slug");
    expect(revalidatePath).toHaveBeenCalledWith("/properties/new-slug");
  });

  it("a published property can't be saved without what publishing needs", async () => {
    m.findPropertyState.mockResolvedValueOnce({
      ...(await m.findPropertyState("p1")),
      status: "PUBLISHED",
    });
    const res = await actions.updateProperty("p1", { ...valid, area: "" });
    expect(!res.ok && res.fieldErrors).toHaveProperty("area");
    expect(m.savePropertyEdits).not.toHaveBeenCalled();
  });

  it("publish: checks requirements, sets publishedAt only the first time", async () => {
    expect((await actions.publishProperty("p1")).ok).toBe(true);
    expect(m.setPropertyStatus).toHaveBeenLastCalledWith("p1", "PUBLISHED", expect.any(Date));

    m.findPropertyState.mockResolvedValueOnce({
      ...(await m.findPropertyState("p1")),
      publishedAt: new Date("2026-01-01"),
    });
    await actions.publishProperty("p1");
    expect(m.setPropertyStatus).toHaveBeenLastCalledWith("p1", "PUBLISHED", undefined);

    m.findPropertyState.mockResolvedValueOnce({
      ...(await m.findPropertyState("p1")),
      area: "",
      priceKobo: null,
    });
    const res = await actions.publishProperty("p1");
    expect(!res.ok && Object.keys(res.fieldErrors ?? {})).toEqual(["area", "price"]);
  });

  it("delete: removes the row, then Blob files (the helper skips /samples/)", async () => {
    const res = await actions.deleteProperty("p1");
    expect(res).toMatchObject({ ok: true, data: { title: "T" } });
    expect(remove).toHaveBeenCalledWith([
      "/samples/a.jpg",
      "https://x.public.blob.vercel-storage.com/p/a.jpg",
    ]);
    expect(updateTag).toHaveBeenCalledWith("properties");
  });

  it("delete still succeeds if Blob clean-up fails", async () => {
    remove.mockRejectedValueOnce(new Error("blob down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await actions.deleteProperty("p1")).ok).toBe(true);
  });
});
