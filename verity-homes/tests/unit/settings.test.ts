// Unit 19a: the site settings schema (shared by /admin/settings and lib/actions/settings.ts) and
// the actions (auth, cache tags). Auth, cache and DB writes are mocked for the action tests.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  looksLikeStreetAddress,
  normaliseWhatsapp,
  settingsSchema,
  socialUrlIssue,
  type SettingsFormValues,
} from "@/lib/validation/settings";

class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));
const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ updateTag, revalidatePath, cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/lib/db/queries/posts", () => ({ POSTS_TAG: "posts" }));
vi.mock("@/lib/db/queries/settings", () => ({ SETTINGS_TAG: "settings" }));
const saveSettings = vi.fn(async () => ({ updatedAt: new Date() }));
const setPrivacyReviewedAt = vi.fn(async (at: Date | null) => ({ privacyReviewedAt: at }));
vi.mock("@/lib/db/mutations/settings", () => ({ saveSettings, setPrivacyReviewedAt }));

const actions = await import("@/lib/actions/settings");

const valid: SettingsFormValues = {
  phone: "0803 123 4567",
  whatsapp: "0803 123 4567",
  email: "Info@VerityHomes.ng",
  officeArea: "Onipanu, Lagos State",
  officeAddress: "",
  showFullAddress: false,
  mapQuery: "Onipanu, Lagos",
  companyName: "Verity Homes and Properties Ltd",
  rcNumber: "9971213",
  openingHours: "",
  instagram: "",
  facebook: "",
  x: "",
  linkedin: "",
  ceoBio: "",
  ceoPromise: "",
  companyStory: "",
};

const errorsOf = (input: Partial<SettingsFormValues>) => {
  const r = settingsSchema.safeParse({ ...valid, ...input });
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("WhatsApp normalisation (234… digits)", () => {
  it.each([
    ["0803 123 4567", "2348031234567"],
    ["08031234567", "2348031234567"],
    ["+234 803 123 4567", "2348031234567"],
    ["+234 (0)803… no", null],
    ["234-803-123-4567", "2348031234567"],
    ["2348031234567", "2348031234567"],
    ["2340000000000", "2340000000000"], // the e2e fixture
    ["803 123 4567", null],
    ["+44 7700 900123", null],
    ["0803 123 456", null],
    ["", null],
  ])("%s → %s", (input, out) => {
    expect(normaliseWhatsapp(input)).toBe(out);
  });

  it("the schema saves the normalised digits, and empty as null", () => {
    expect(settingsSchema.parse({ ...valid, whatsapp: "+234 803 123 4567" }).whatsapp).toBe(
      "2348031234567",
    );
    expect(settingsSchema.parse({ ...valid, whatsapp: "" }).whatsapp).toBeNull();
    expect(errorsOf({ whatsapp: "12345" })).toHaveProperty("whatsapp");
  });
});

describe("contact fields", () => {
  it("email: valid or empty; saved in lower case", () => {
    expect(settingsSchema.parse(valid).email).toBe("info@verityhomes.ng");
    expect(settingsSchema.parse({ ...valid, email: "" }).email).toBeNull();
    for (const bad of ["info@", "info verity.com", "@verityhomes.ng", "a@b"]) {
      expect(errorsOf({ email: bad }), bad).toHaveProperty("email");
    }
  });

  it("phone: digits with spaces, +, (), - and 7–15 digits", () => {
    expect(errorsOf({ phone: "+234 (803) 123-4567" })).toEqual({});
    expect(errorsOf({ phone: "" })).toEqual({});
    expect(errorsOf({ phone: "call me" })).toHaveProperty("phone");
    expect(errorsOf({ phone: "123" })).toHaveProperty("phone");
  });
});

describe("company + office", () => {
  it("RC number is digits only and required", () => {
    expect(errorsOf({ rcNumber: "9971213" })).toEqual({});
    for (const bad of ["RC9971213", "99 71213", "", "12345678901", "99-7"]) {
      expect(errorsOf({ rcNumber: bad }), bad).toHaveProperty("rcNumber");
    }
  });

  it("company name, office area and map search are required", () => {
    expect(errorsOf({ companyName: " ", officeArea: "", mapQuery: "" })).toMatchObject({
      companyName: expect.any(String),
      officeArea: expect.any(String),
      mapQuery: expect.any(String),
    });
  });

  it("showing the full address needs an address", () => {
    expect(errorsOf({ showFullAddress: true, officeAddress: "" })).toHaveProperty("officeAddress");
    const ok = settingsSchema.parse({
      ...valid,
      showFullAddress: true,
      officeAddress: "12 Office Road, Onipanu",
    });
    expect(ok).toMatchObject({ showFullAddress: true, officeAddress: "12 Office Road, Onipanu" });
  });
});

describe("map search street-address warning (Q37)", () => {
  it.each([
    "7 Hidden Close, Onipanu",
    "No. 12 Adeola Street, Lagos",
    "12b Allen Avenue, Ikeja",
    "Plot 5, Admiralty Way",
    "Ikorodu Road 23",
  ])("warns for %s", (q) => {
    expect(looksLikeStreetAddress(q)).toBe(true);
  });

  it.each(["Onipanu, Lagos", "Lekki Phase 1, Lagos", "Ikeja City Mall", "Yaba, Lagos State"])(
    "doesn't warn for %s",
    (q) => {
      expect(looksLikeStreetAddress(q)).toBe(false);
    },
  );

  it("is a warning only: the schema still accepts it", () => {
    expect(errorsOf({ mapQuery: "7 Hidden Close, Onipanu" })).toEqual({});
  });
});

describe("social links", () => {
  it("need the full https address on the network's own site", () => {
    expect(socialUrlIssue("instagram", "https://www.instagram.com/verityhomes")).toBeNull();
    expect(socialUrlIssue("x", "https://twitter.com/verityhomes")).toBeNull();
    expect(socialUrlIssue("linkedin", "https://ng.linkedin.com/company/verity")).toBeNull();
    expect(socialUrlIssue("instagram", "instagram.com/verityhomes")).toMatch(/full address/);
    expect(socialUrlIssue("facebook", "http://facebook.com/verity")).toMatch(/https/);
    expect(socialUrlIssue("facebook", "https://facebook.com.evil.example/x")).toMatch(
      /isn't a Facebook address/,
    );
    expect(socialUrlIssue("x", "javascript:alert(1)")).not.toBeNull();
  });

  it("empty is allowed and saved as null", () => {
    expect(settingsSchema.parse(valid)).toMatchObject({
      instagram: null,
      facebook: null,
      x: null,
      linkedin: null,
    });
    expect(errorsOf({ linkedin: "https://example.com/me" })).toHaveProperty("linkedin");
  });
});

describe("website text", () => {
  it("bio/story are Markdown without javascript: links; promise is one line", () => {
    expect(errorsOf({ ceoBio: "**Esther** [site](https://verity.example)" })).toEqual({});
    expect(errorsOf({ ceoBio: "[x](javascript:alert(1))" })).toHaveProperty("ceoBio");
    expect(errorsOf({ companyStory: "[x](data:text/html,hi)" })).toHaveProperty("companyStory");
    expect(errorsOf({ ceoPromise: "Line one\nline two" })).toHaveProperty("ceoPromise");
    expect(errorsOf({ ceoPromise: "x".repeat(201) })).toHaveProperty("ceoPromise");
    expect(settingsSchema.parse(valid)).toMatchObject({
      ceoBio: null,
      ceoPromise: null,
      companyStory: null,
    });
  });
});

describe("actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
  });

  it.each([
    ["updateSettings", () => actions.updateSettings(valid)],
    ["setPrivacyReviewed(true)", () => actions.setPrivacyReviewed(true)],
    ["setPrivacyReviewed(false)", () => actions.setPrivacyReviewed(false)],
  ])("%s rejects a non-admin without writing", async (_name, run) => {
    requireAdmin.mockRejectedValue(new ForbiddenError());
    expect(await run()).toEqual({ ok: false, error: "You don't have permission to do that." });
    expect(saveSettings).not.toHaveBeenCalled();
    expect(setPrivacyReviewedAt).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("validation runs before the admin check", async () => {
    const r = await actions.updateSettings({ ...valid, email: "nope" });
    expect(r).toMatchObject({ ok: false, fieldErrors: { email: expect.any(String) } });
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("saving writes the parsed row and updates every page (settings + posts tags)", async () => {
    expect(await actions.updateSettings(valid)).toMatchObject({ ok: true });
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ whatsapp: "2348031234567", email: "info@verityhomes.ng" }),
    );
    expect(updateTag).toHaveBeenCalledWith("settings");
    expect(updateTag).toHaveBeenCalledWith("posts");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("privacy: reviewed sets a date, draft clears it", async () => {
    await actions.setPrivacyReviewed(true);
    expect(setPrivacyReviewedAt).toHaveBeenLastCalledWith(expect.any(Date));
    await actions.setPrivacyReviewed(false);
    expect(setPrivacyReviewedAt).toHaveBeenLastCalledWith(null);
    expect(await actions.setPrivacyReviewed("yes")).toMatchObject({ ok: false });
  });

  it("a failed write logs no values", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    saveSettings.mockRejectedValueOnce(
      Object.assign(new Error("duplicate value 0803 123 4567 info@verityhomes.ng"), {
        code: "P2002",
      }),
    );
    expect(await actions.updateSettings(valid)).toMatchObject({ ok: false });
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toContain("P2002");
    expect(logged).not.toContain("0803");
    expect(logged).not.toContain("@");
    spy.mockRestore();
  });
});
