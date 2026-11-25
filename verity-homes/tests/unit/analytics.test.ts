// Unit 21 steps 2–3: the track() helper is a no-op without consent or without an ID, and the
// consent store survives blocked storage.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanParams,
  contactEvent,
  leadParams,
  pageSlugs,
  parseAnalyticsConfig,
  track,
  type TrackDeps,
} from "@/lib/analytics";
import type { Consent } from "@/lib/consent";

const GA = "G-ABC123XYZ";
const PIXEL = "123456789012345";

function deps(consent: Consent | null, gaId: string | null, pixelId: string | null) {
  const win: { dataLayer?: unknown[]; fbq?: ReturnType<typeof vi.fn<(...a: unknown[]) => void>> } =
    {};
  if (pixelId) win.fbq = vi.fn<(...a: unknown[]) => void>();
  const d: TrackDeps = {
    consent: () => consent,
    config: () => ({ gaId, pixelId }),
    win: () => win,
  };
  return { d, win };
}

/** dataLayer entries are Arguments objects; compare them as arrays. */
const entries = (w: { dataLayer?: unknown[] }) =>
  (w.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));

describe("track", () => {
  it("does nothing without consent", () => {
    for (const consent of [null, "denied"] as const) {
      const { d, win } = deps(consent, GA, PIXEL);
      expect(track("generate_lead", { form_type: "CONTACT_PAGE" }, d)).toBe(false);
      expect(win.dataLayer).toBeUndefined();
      expect(win.fbq).not.toHaveBeenCalled();
    }
  });

  it("does nothing without an ID, even with consent", () => {
    const { d, win } = deps("granted", null, null);
    expect(track("whatsapp_click", {}, d)).toBe(false);
    expect(win.dataLayer).toBeUndefined();
  });

  it("does nothing on the server", () => {
    const d: TrackDeps = {
      consent: () => "granted",
      config: () => ({ gaId: GA, pixelId: null }),
      win: () => undefined,
    };
    expect(track("view_item", {}, d)).toBe(false);
  });

  it("sends a GA4 event (as gtag arguments) once consent is granted", () => {
    const { d, win } = deps("granted", GA, null);
    expect(track("generate_lead", { form_type: "PROPERTY_PAGE", property_slug: "x" }, d)).toBe(
      true,
    );
    expect(entries(win)).toEqual([
      ["event", "generate_lead", { form_type: "PROPERTY_PAGE", property_slug: "x" }],
    ]);
    expect(Object.prototype.toString.call(win.dataLayer![0])).toBe("[object Arguments]");
  });

  it("maps to Meta standard events, custom for the rest", () => {
    const { d, win } = deps("granted", null, PIXEL);
    track("generate_lead", { form_type: "HOME_PAGE" }, d);
    track("phone_click", {}, d);
    track("plan_package_select", { plan_slug: "p" }, d);
    expect(win.fbq).toHaveBeenNthCalledWith(1, "track", "Lead", { form_type: "HOME_PAGE" });
    expect(win.fbq).toHaveBeenNthCalledWith(2, "track", "Contact", {});
    expect(win.fbq).toHaveBeenNthCalledWith(3, "trackCustom", "plan_package_select", {
      plan_slug: "p",
    });
  });

  it("skips the Pixel until its script has defined fbq", () => {
    const { d, win } = deps("granted", null, PIXEL);
    delete win.fbq;
    expect(track("view_plan", {}, d)).toBe(false);
  });
});

describe("analytics helpers", () => {
  it("ignores unset or malformed IDs", () => {
    expect(parseAnalyticsConfig(undefined, undefined)).toEqual({ gaId: null, pixelId: null });
    expect(parseAnalyticsConfig("", "")).toEqual({ gaId: null, pixelId: null });
    expect(parseAnalyticsConfig("UA-1234-1", "abc")).toEqual({ gaId: null, pixelId: null });
    expect(parseAnalyticsConfig(" g-abc123xyz ", "123456789012345")).toEqual({
      gaId: GA,
      pixelId: PIXEL,
    });
  });

  it("drops empty params and caps long strings", () => {
    const out = cleanParams({ a: "", b: undefined, c: null, d: "x".repeat(300), e: 0, f: false });
    expect(out).toEqual({ d: "x".repeat(100), e: 0, f: false });
  });

  it("names the property or plan in generate_lead", () => {
    expect(leadParams("PROPERTY_PAGE", "/properties/4-bed-lekki")).toEqual({
      form_type: "PROPERTY_PAGE",
      property_slug: "4-bed-lekki",
      page_path: "/properties/4-bed-lekki",
    });
    expect(leadParams("INVEST_PAGE", "/invest/land-banking")).toMatchObject({
      plan_slug: "land-banking",
    });
    expect(leadParams("CONTACT_PAGE", "/contact")).toEqual({
      form_type: "CONTACT_PAGE",
      page_path: "/contact",
    });
    expect(pageSlugs("/properties")).toEqual({});
    expect(pageSlugs("/properties/in")).toEqual({});
    expect(pageSlugs("/invest")).toEqual({});
  });

  it("maps data-contact values to events", () => {
    expect(contactEvent("whatsapp")).toBe("whatsapp_click");
    expect(contactEvent("phone")).toBe("phone_click");
    expect(contactEvent("email")).toBe("email_click");
    expect(contactEvent("map")).toBeNull();
    expect(contactEvent(null)).toBeNull();
  });
});

describe("consent store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function fakeWindow(storage: Partial<Storage>) {
    const target = new EventTarget();
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
    });
  }

  it("saves, reads, forgets and notifies", async () => {
    const data = new Map<string, string>();
    fakeWindow({
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    });
    const { readConsent, writeConsent, subscribeConsent } = await import("@/lib/consent");
    const cb = vi.fn();
    const stop = subscribeConsent(cb);
    expect(readConsent()).toBeNull();
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
    writeConsent(null);
    expect(readConsent()).toBeNull();
    expect(cb).toHaveBeenCalledTimes(2);
    stop();
  });

  it("keeps the choice for the visit when storage throws", async () => {
    const boom = () => {
      throw new Error("blocked");
    };
    fakeWindow({ getItem: boom, setItem: boom, removeItem: boom });
    const { readConsent, writeConsent } = await import("@/lib/consent");
    expect(readConsent()).toBeNull();
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("ignores a tampered stored value", async () => {
    fakeWindow({ getItem: () => "yes please" });
    const { readConsent } = await import("@/lib/consent");
    expect(readConsent()).toBeNull();
  });
});
