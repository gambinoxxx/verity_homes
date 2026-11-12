// The contact cards with and without contact details (the e2e server can only show one
// settings state per build, so the "nothing set" state is checked here on the real component).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ContactCards,
  telHref,
  type ContactDetails,
} from "@/components/site/contact/contact-cards";

const base: ContactDetails = {
  email: null,
  phone: null,
  whatsapp: null,
  officeDisplay: "Onipanu, Lagos State",
  mapQuery: "Onipanu, Lagos",
};
const render = (d: ContactDetails) =>
  renderToStaticMarkup(createElement(ContactCards, { details: d }));

describe("ContactCards", () => {
  it("with nothing set: placeholders, no email/call/WhatsApp buttons, directions still work", () => {
    const html = render(base);
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("Send an email");
    expect(html).not.toContain("Call us");
    expect(html).toContain('class="ph"');
    expect(html).toContain("Phone number");
    expect(html).toContain("Get directions");
    expect(html).toContain(
      "https://www.google.com/maps/search/?api=1&amp;query=Onipanu%2C%20Lagos",
    );
  });

  it("with details set: mailto, tel and wa.me links with the enquiry message", () => {
    const html = render({
      ...base,
      email: "hello@example.com",
      phone: "0803 000 0000",
      whatsapp: "2348030000000",
    });
    expect(html).toContain('href="mailto:hello@example.com"');
    expect(html).toContain('href="tel:+2348030000000"');
    expect(html).toContain(
      `href="https://wa.me/2348030000000?text=${encodeURIComponent(
        "Hi Verity, I'd like to make an enquiry",
      ).replace(/'/g, "&#x27;")}"`,
    );
  });

  it("hides only the button whose number is missing", () => {
    const callOnly = render({ ...base, phone: "0803 000 0000" });
    expect(callOnly).toContain("Call us");
    expect(callOnly).not.toContain("wa.me");
    const waOnly = render({ ...base, whatsapp: "2348030000000" });
    expect(waOnly).not.toContain("tel:");
    expect(waOnly).toContain("wa.me");
  });

  it("shows only what officeDisplay holds (the area unless showFullAddress is on)", () => {
    expect(render(base)).toContain("Onipanu, Lagos State");
  });
});

describe("telHref", () => {
  it("normalises Nigerian numbers to +234", () => {
    expect(telHref("0803 000 0000")).toBe("tel:+2348030000000");
    expect(telHref("+234 803 000 0000")).toBe("tel:+2348030000000");
  });
});
