// Unit 19b: testimonial + partner validation and consent rules, image paths and logo types,
// the subscribers CSV (reusing the enquiry inbox's formula guard), and every action rejecting a
// non-admin. Auth, cache, DB writes and storage are mocked for the action tests.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSubscriberFilters, subscribersCsv, subscribersCsvFileName } from "@/lib/subscribers";
import {
  isLogoContentType,
  isTrustImageUrl,
  trustImagePathname,
  trustTargetFromPathname,
} from "@/lib/trust-images";
import {
  CONSENT_PARTNER,
  CONSENT_TESTIMONIAL,
  EMPTY_PARTNER,
  EMPTY_TESTIMONIAL,
  partnerPublishSchema,
  partnerSchema,
  testimonialPublishSchema,
  testimonialSchema,
  websiteIssue,
} from "@/lib/validation/trust";

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
vi.mock("@/lib/db/queries/trust", () => ({
  TESTIMONIALS_TAG: "testimonials",
  PARTNERS_TAG: "partners",
}));

const ID = "tst123456789";
const state = (over: Record<string, unknown> = {}) => ({
  id: ID,
  name: "Ada",
  status: "PUBLISHED" as const,
  consentConfirmed: true,
  avatarUrl: null,
  logoUrl: null,
  ...over,
});
const m = {
  findTestimonialState: vi.fn(async () => state()),
  insertTestimonial: vi.fn(async () => ({ id: ID })),
  saveTestimonial: vi.fn(async (_id: string, d: { consentConfirmed: boolean }, s: string) => ({
    id: ID,
    status: d.consentConfirmed ? s : "DRAFT",
  })),
  setTestimonialStatus: vi.fn(async () => ({ id: ID })),
  deleteTestimonialRow: vi.fn(async () => ({ name: "Ada", avatarUrl: null })),
  reorderTestimonialRows: vi.fn(async () => true),
  findPartnerState: vi.fn(async () => state()),
  insertPartner: vi.fn(async () => ({ id: ID })),
  savePartner: vi.fn(async (_id: string, d: { consentConfirmed: boolean }, s: string) => ({
    id: ID,
    status: d.consentConfirmed ? s : "DRAFT",
  })),
  setPartnerStatus: vi.fn(async () => ({ id: ID })),
  deletePartnerRow: vi.fn(async () => ({
    name: "AY Homes",
    logoUrl: "https://abc.public.blob.vercel-storage.com/partners/tst123456789/logo-Ab.png",
  })),
  reorderPartnerRows: vi.fn(async () => true),
  deleteSubscriberRow: vi.fn(async () => ({ email: "a@b.co" })),
};
vi.mock("@/lib/db/mutations/trust", () => m);
const remove = vi.fn(async (u: readonly string[]) => ({ removed: u.length }));
const listFolder = vi.fn(async (): Promise<string[]> => []);
vi.mock("@/lib/storage", () => ({
  remove,
  listFolder,
  blobPathPrefix: () => "",
  isBlobUrl: (u: string) => u.includes(".blob.vercel-storage.com/"),
}));

const testimonials = await import("@/lib/actions/testimonial");
const partners = await import("@/lib/actions/partner");
const subscribers = await import("@/lib/actions/subscriber-admin");

const validT = { ...EMPTY_TESTIMONIAL, name: "Ada", serviceUsed: "Home buyer", quote: "Great." };
const validP = { ...EMPTY_PARTNER, name: "AY Homes", website: "https://ayhomes.example" };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
});

describe("testimonial validation", () => {
  it("quote: required, at most 400 characters", () => {
    expect(testimonialSchema.safeParse({ ...validT, quote: "x".repeat(400) }).success).toBe(true);
    const long = testimonialSchema.safeParse({ ...validT, quote: "x".repeat(401) });
    expect(long.success).toBe(false);
    expect(long.error?.issues[0]?.message).toBe("Keep the quote under 400 characters");
    expect(testimonialSchema.safeParse({ ...validT, quote: " " }).success).toBe(false);
  });

  it("rating is optional, 1–5 only", () => {
    expect(testimonialSchema.parse({ ...validT, rating: "" }).rating).toBeNull();
    expect(testimonialSchema.parse({ ...validT, rating: "4" }).rating).toBe(4);
    for (const bad of ["0", "6", "4.5", "five"])
      expect(testimonialSchema.safeParse({ ...validT, rating: bad }).success, bad).toBe(false);
  });

  it("consent is required to publish (publish schema on the saved row)", () => {
    const no = testimonialPublishSchema.safeParse({ consentConfirmed: false });
    expect(no.success).toBe(false);
    expect(no.error?.issues[0]?.message).toBe(CONSENT_TESTIMONIAL);
    expect(testimonialPublishSchema.safeParse({ consentConfirmed: true }).success).toBe(true);
  });
});

describe("partner validation", () => {
  it("website: empty or a full https address", () => {
    expect(websiteIssue("")).toBeNull();
    expect(websiteIssue("https://ayhomes.example/about")).toBeNull();
    expect(websiteIssue("http://ayhomes.example")).toMatch(/https/);
    expect(websiteIssue("ayhomes.example")).toMatch(/full website address/);
    expect(websiteIssue("https://localhost")).toMatch(/full website address/);
    expect(websiteIssue("javascript:alert(1)")).not.toBeNull();
    expect(partnerSchema.safeParse({ ...validP, website: "ftp://x.example" }).success).toBe(false);
    expect(partnerSchema.parse({ ...validP, website: "" }).website).toBeNull();
  });

  it("consent is required to publish", () => {
    const no = partnerPublishSchema.safeParse({ consentConfirmed: false });
    expect(no.error?.issues[0]?.message).toBe(CONSENT_PARTNER);
  });

  it("logos: PNG, JPEG or WebP only", () => {
    for (const ok of ["image/png", "image/jpeg", "image/webp"])
      expect(isLogoContentType(ok)).toBe(true);
    for (const bad of ["image/svg+xml", "image/gif", "image/heic", ""])
      expect(isLogoContentType(bad), bad).toBe(false);
  });
});

describe("image paths", () => {
  it("avatars go in testimonials/<id>/, logos in partners/<id>/", () => {
    expect(trustImagePathname("e2e/", "partners", ID, "AY Logo.PNG", "image/png")).toBe(
      `e2e/partners/${ID}/ay-logo.png`,
    );
    expect(trustTargetFromPathname("", `testimonials/${ID}/ada-Xy.webp`)).toEqual({
      kind: "testimonials",
      id: ID,
    });
    expect(trustTargetFromPathname("", `partners/${ID}/deep/x.png`)).toBeNull();
    expect(trustTargetFromPathname("", `e2e/partners/${ID}/x.png`)).toBeNull();
    const url = `https://abc.public.blob.vercel-storage.com/partners/${ID}/l-Ab.png`;
    expect(isTrustImageUrl("", "partners", ID, url)).toBe(true);
    expect(isTrustImageUrl("", "testimonials", ID, url)).toBe(false);
  });
});

describe("subscribers CSV (reuses the enquiry CSV cell)", () => {
  it("BOM, CRLF, Lagos time, formula guard", () => {
    const csv = subscribersCsv([
      { email: "=HYPERLINK(1)@x.co", createdAt: new Date("2026-11-15T08:05:00Z") },
      { email: "ada@example.com", createdAt: new Date("2026-11-14T23:30:00Z") },
    ]);
    expect(csv.startsWith("﻿Joined (Lagos),Email\r\n")).toBe(true);
    expect(csv).toContain("2026-11-15 09:05,'=HYPERLINK(1)@x.co\r\n");
    expect(csv).toContain("2026-11-15 00:30,ada@example.com\r\n");
    expect(subscribersCsvFileName(new Date("2026-11-15T08:00:00Z"))).toBe(
      "subscribers-2026-11-15.csv",
    );
  });

  it("URL params never throw", () => {
    expect(parseSubscriberFilters({ q: " gmail ", page: "2" })).toEqual({ q: "gmail", page: 2 });
    expect(parseSubscriberFilters({ page: "abc" })).toEqual({ q: "", page: 1 });
  });
});

const cases: [string, () => Promise<{ ok: boolean }>][] = [
  ["createTestimonial", () => testimonials.createTestimonial(validT)],
  ["updateTestimonial", () => testimonials.updateTestimonial(ID, validT)],
  ["publishTestimonial", () => testimonials.publishTestimonial(ID)],
  ["unpublishTestimonial", () => testimonials.unpublishTestimonial(ID)],
  ["deleteTestimonial", () => testimonials.deleteTestimonial(ID)],
  ["reorderTestimonials", () => testimonials.reorderTestimonials([ID, "tst987654321"])],
  ["createPartner", () => partners.createPartner(validP)],
  ["updatePartner", () => partners.updatePartner(ID, validP)],
  ["publishPartner", () => partners.publishPartner(ID)],
  ["unpublishPartner", () => partners.unpublishPartner(ID)],
  ["deletePartner", () => partners.deletePartner(ID)],
  ["reorderPartners", () => partners.reorderPartners([ID, "tst987654321"])],
  ["deleteSubscriber", () => subscribers.deleteSubscriber(ID)],
];

describe("every action rejects a non-admin without writing", () => {
  for (const [name, run] of cases) {
    it(name, async () => {
      requireAdmin.mockRejectedValue(new ForbiddenError());
      expect(await run()).toEqual({ ok: false, error: "You don't have permission to do that." });
      const writes = Object.entries(m)
        .filter(([k]) => !k.startsWith("find"))
        .reduce((n, [, f]) => n + f.mock.calls.length, 0);
      expect(writes).toBe(0);
      expect(remove).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    });
  }
});

describe("consent rules in the actions", () => {
  it("publishing without consent is blocked with the clear message", async () => {
    m.findTestimonialState.mockResolvedValueOnce(
      state({ status: "DRAFT", consentConfirmed: false }),
    );
    expect(await testimonials.publishTestimonial(ID)).toEqual({
      ok: false,
      error: CONSENT_TESTIMONIAL,
      fieldErrors: { consentConfirmed: CONSENT_TESTIMONIAL },
    });
    m.findPartnerState.mockResolvedValueOnce(state({ status: "DRAFT", consentConfirmed: false }));
    expect(await partners.publishPartner(ID)).toMatchObject({ ok: false, error: CONSENT_PARTNER });
    expect(m.setTestimonialStatus).not.toHaveBeenCalled();
    expect(m.setPartnerStatus).not.toHaveBeenCalled();
  });

  it("with consent, publish writes and updates the tag", async () => {
    m.findTestimonialState.mockResolvedValueOnce(state({ status: "DRAFT" }));
    expect(await testimonials.publishTestimonial(ID)).toMatchObject({ ok: true });
    expect(m.setTestimonialStatus).toHaveBeenCalledWith(ID, "PUBLISHED");
    expect(updateTag).toHaveBeenCalledWith("testimonials");
  });

  it("unticking consent on a published testimonial unpublishes it on save", async () => {
    const r = await testimonials.updateTestimonial(ID, { ...validT, consentConfirmed: false });
    expect(r).toMatchObject({ ok: true, data: { status: "DRAFT" } });
    expect(r.ok && r.message).toMatch(/unpublished/);
  });

  it("a partner logo from another folder is refused", async () => {
    const r = await partners.updatePartner(ID, {
      ...validP,
      logoUrl: "https://abc.public.blob.vercel-storage.com/partners/other1234567/x.png",
    });
    expect(r).toMatchObject({ ok: false, fieldErrors: { logoUrl: expect.any(String) } });
    expect(m.savePartner).not.toHaveBeenCalled();
  });

  it("deleting a partner removes its logo and folder (never /samples/)", async () => {
    listFolder.mockResolvedValueOnce([
      "https://abc.public.blob.vercel-storage.com/partners/tst123456789/old-Cd.png",
    ]);
    expect(await partners.deletePartner(ID)).toMatchObject({ ok: true });
    expect(remove).toHaveBeenCalledWith([
      "https://abc.public.blob.vercel-storage.com/partners/tst123456789/logo-Ab.png",
      "https://abc.public.blob.vercel-storage.com/partners/tst123456789/old-Cd.png",
    ]);
    expect(updateTag).toHaveBeenCalledWith("partners");
  });
});
