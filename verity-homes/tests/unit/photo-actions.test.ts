// lib/actions/property-photos.ts (Unit 15): addPropertyPhoto saves an uploaded photo's row —
// Zod (URL/pathname must be a Blob file in that property's folder) → requireAdmin() → insert.
// geocodeArea: admin only, needs an area. Auth, DB and Nominatim are mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";

class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));
const updateTag = vi.fn();
vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock("@/lib/db/queries/properties", () => ({ PROPERTIES_TAG: "properties" }));
const insertPropertyPhoto = vi.fn(async () => ({
  photo: { id: "img1", url: "u", alt: "", width: 2400, height: 1600 },
  slug: "home",
}));
vi.mock("@/lib/db/mutations/properties", () => ({ insertPropertyPhoto }));
vi.mock("@/lib/storage", () => ({
  blobPathPrefix: () => "e2e/",
  isBlobUrl: (u: string) => u.startsWith("https://abc.public.blob.vercel-storage.com/"),
}));
const geocode = vi.fn(async (q: string) => ({
  ok: true as const,
  data: { lat: 6.4, lng: 3.4, label: q },
}));
vi.mock("@/lib/geocode", () => ({ geocode }));

const { addPropertyPhoto, geocodeArea } = await import("@/lib/actions/property-photos");

const ID = "cmwdewcs90000vo5m5qhcppl7";
const pathname = `e2e/properties/${ID}/front-view-Xy12AbC9.webp`;
const valid = {
  propertyId: ID,
  url: `https://abc.public.blob.vercel-storage.com/${pathname}`,
  pathname,
  width: 2400,
  height: 1600,
  alt: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
});

describe("addPropertyPhoto", () => {
  it("saves a valid upload and refreshes the property pages", async () => {
    const res = await addPropertyPhoto(valid);
    expect(res).toMatchObject({ ok: true, data: { id: "img1" } });
    expect(insertPropertyPhoto).toHaveBeenCalledWith(
      ID,
      { url: valid.url, pathname, width: 2400, height: 1600, alt: "" },
      20,
    );
    expect(updateTag).toHaveBeenCalledWith("properties");
  });

  it("rejects a non-admin without writing", async () => {
    requireAdmin.mockRejectedValueOnce(new ForbiddenError());
    expect(await addPropertyPhoto(valid)).toEqual({
      ok: false,
      error: "You don't have permission to do that.",
    });
    expect(insertPropertyPhoto).not.toHaveBeenCalled();
  });

  it.each([
    ["not a Blob URL", { url: `https://evil.example/${pathname}` }],
    ["another property's folder", { pathname: `e2e/properties/other1234567/x.webp` }],
    ["URL and pathname disagree", { url: "https://abc.public.blob.vercel-storage.com/e2e/x.webp" }],
    ["outside the e2e/ prefix", { pathname: `properties/${ID}/a.webp` }],
    ["bad id", { propertyId: "../etc" }],
    ["zero width", { width: 0 }],
    ["alt too long", { alt: "x".repeat(201) }],
  ])("rejects bad input before the admin check: %s", async (_label, patch) => {
    const res = await addPropertyPhoto({ ...valid, ...patch });
    expect(res.ok).toBe(false);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(insertPropertyPhoto).not.toHaveBeenCalled();
  });

  it("full or missing property → friendly error", async () => {
    insertPropertyPhoto.mockResolvedValueOnce(null as never);
    const res = await addPropertyPhoto(valid);
    expect(!res.ok && res.error).toMatch(/20 photos/);
  });
});

describe("geocodeArea", () => {
  it("needs an area; admin only; asks for area, city, Nigeria", async () => {
    expect((await geocodeArea({ area: " ", city: "Lagos" })).ok).toBe(false);
    expect(geocode).not.toHaveBeenCalled();
    requireAdmin.mockRejectedValueOnce(new ForbiddenError());
    expect((await geocodeArea({ area: "Lekki", city: "Lagos" })).ok).toBe(false);
    expect(geocode).not.toHaveBeenCalled();
    await geocodeArea({ area: "Lekki", city: "" });
    expect(geocode).toHaveBeenCalledWith("Lekki, Lagos, Nigeria");
  });
});
