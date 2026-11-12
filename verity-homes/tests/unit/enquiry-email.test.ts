import { describe, expect, it } from "vitest";
import { buildEnquiryEmail, type EnquiryEmailData } from "@/lib/email/enquiry-template";

const SITE = "https://verity.example";
const base: EnquiryEmailData = {
  id: "enq_123",
  name: "Ada Obi",
  phone: "2348030000000",
  interest: "BUYING",
  source: "HOME_PAGE",
  createdAt: new Date("2026-11-12T10:00:00Z"),
};

describe("buildEnquiryEmail", () => {
  it("uses the subject 'New enquiry: <interest> — <name>'", () => {
    expect(buildEnquiryEmail(base, SITE).subject).toBe("New enquiry: Buying — Ada Obi");
  });

  it("copes with every optional field missing", () => {
    const { html, text } = buildEnquiryEmail(base, SITE);
    expect(text).toContain("(no message)");
    expect(text).not.toMatch(/^Email:/m);
    expect(text).not.toMatch(/^Property:/m);
    expect(html).toContain("(no message)");
  });

  it("has tap-to-call and WhatsApp links for the phone number", () => {
    const { html, text } = buildEnquiryEmail(base, SITE);
    expect(html).toContain('href="tel:+2348030000000"');
    expect(html).toContain("https://wa.me/2348030000000?text=");
    expect(text).toContain("+234 803 000 0000");
  });

  it("links the property and plan with NEXT_PUBLIC_SITE_URL", () => {
    const { html, text } = buildEnquiryEmail(
      {
        ...base,
        email: "ada@example.com",
        property: { title: "Sample Duplex", slug: "sample-duplex" },
        plan: { name: "Growth Plan" },
        amountKobo: 500_000_000n,
        wantsInspection: true,
        message: "Is it still available?",
      },
      SITE,
    );
    expect(html).toContain('href="https://verity.example/properties/sample-duplex"');
    expect(text).toContain(
      "Property: Sample Duplex — https://verity.example/properties/sample-duplex",
    );
    expect(text).toContain("Plan: Growth Plan — https://verity.example/invest");
    expect(text).toContain("Amount: ₦5,000,000");
    expect(text).toContain("Email: ada@example.com");
    expect(text).toContain("Inspection: Yes");
  });

  it("escapes HTML in visitor input and keeps the subject on one line", () => {
    const { html, subject } = buildEnquiryEmail(
      { ...base, name: "Eve\n<script>x</script>", message: "<b>hi</b> & bye" },
      SITE,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt; &amp; bye");
    expect(subject).not.toContain("\n");
  });
});
