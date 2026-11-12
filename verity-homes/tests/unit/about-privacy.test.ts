// States the e2e build can't show (it has one settings/partners state per build), checked on
// the real components: no partners → no strip; no settings email → visible placeholder.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PartnerMarquee } from "@/components/site/partner-marquee";
import { PrivacyNotice } from "@/components/site/privacy/privacy-notice";

describe("PartnerMarquee", () => {
  it("renders nothing when there are no partners", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerMarquee, { partners: [], labelId: "x", light: true }),
    );
    expect(html).toBe("");
  });

  it("names each partner once for screen readers (the loop copy is aria-hidden)", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerMarquee, {
        partners: [{ id: "1", name: "Acme Builders", logoUrl: null, website: null }],
        labelId: "x",
      }),
    );
    expect(html).toContain("Our development partners");
    expect(html.match(/Acme Builders/g)).toHaveLength(2);
    expect(html).toContain('aria-hidden="true"><span>Acme Builders');
  });
});

describe("PrivacyNotice", () => {
  const base = {
    companyName: "Verity Homes and Properties Ltd",
    rcNumber: "9971213",
    officeDisplay: "Onipanu, Lagos State",
  };

  it("shows the draft banner, company and RC number", () => {
    const html = renderToStaticMarkup(createElement(PrivacyNotice, { ...base, email: null }));
    expect(html).toContain("to be reviewed by Verity Homes and Properties before launch.");
    expect(html).toContain("Verity Homes and Properties Ltd (RC 9971213)");
  });

  it("uses a visible placeholder (no mailto) when no email is set", () => {
    const html = renderToStaticMarkup(createElement(PrivacyNotice, { ...base, email: null }));
    expect(html).not.toContain("mailto:");
    expect(html).toContain("privacy contact email — owner to add in site settings");
  });

  it("links the settings email when set", () => {
    const html = renderToStaticMarkup(
      createElement(PrivacyNotice, { ...base, email: "info@example.com" }),
    );
    expect(html).toContain('href="mailto:info@example.com"');
  });

  it("keeps the retention period as an owner placeholder and never says 'guaranteed'", () => {
    const html = renderToStaticMarkup(createElement(PrivacyNotice, { ...base, email: null }));
    expect(html).toContain("retention period — owner to confirm");
    expect(html.toLowerCase()).not.toContain("guarantee");
  });
});
