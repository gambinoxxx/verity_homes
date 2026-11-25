// Unit 21 step 7: every WhatsApp button names the page; every phone number is a tel: link.
import { describe, expect, it } from "vitest";
import { telHref } from "@/lib/contact-links";
import { interestMessage, pageSubject, pageWhatsappMessage, questionMessage } from "@/lib/whatsapp";

const SITE = "https://www.verityhomes.ng";

describe("WhatsApp messages", () => {
  it("property and plan pages: I'm interested in <name> (<url>)", () => {
    expect(interestMessage("Duplex in Lekki", `${SITE}/properties/duplex`)).toBe(
      `Hello Verity, I'm interested in Duplex in Lekki (${SITE}/properties/duplex)`,
    );
    expect(
      pageWhatsappMessage(
        "Duplex in Lekki — Verity Homes and Properties",
        `${SITE}/properties/duplex`,
      ),
    ).toBe(`Hello Verity, I'm interested in Duplex in Lekki (${SITE}/properties/duplex)`);
    expect(
      pageWhatsappMessage("12-Month Plan — Verity Homes and Properties", `${SITE}/invest/12m`),
    ).toBe(`Hello Verity, I'm interested in 12-Month Plan (${SITE}/invest/12m)`);
  });

  it("other pages: a question naming the page", () => {
    expect(pageWhatsappMessage("Contact us — Verity Homes and Properties", `${SITE}/contact`)).toBe(
      `Hello Verity, I have a question about "Contact us" (${SITE}/contact)`,
    );
    expect(
      pageWhatsappMessage(
        "Properties for rent in Lagos — Verity Homes and Properties",
        `${SITE}/properties?type=rent`,
      ),
    ).toBe(
      `Hello Verity, I have a question about "Properties for rent in Lagos" (${SITE}/properties?type=rent)`,
    );
    expect(questionMessage("A post", `${SITE}/blog/a`)).toContain('"A post"');
  });

  it("home page (or no title): a plain enquiry with the URL", () => {
    expect(
      pageWhatsappMessage("Verity Homes and Properties — Invest. Own. Live.", `${SITE}/`),
    ).toBe(`Hello Verity, I'd like to make an enquiry (${SITE}/)`);
    expect(pageSubject("")).toBeNull();
    expect(pageSubject("Verity Homes and Properties")).toBeNull();
  });
});

describe("telHref", () => {
  it("Nigerian local numbers become +234; others keep their digits", () => {
    expect(telHref("0808 584 5289")).toBe("tel:+2348085845289");
    expect(telHref("+234 808 584 5289")).toBe("tel:+2348085845289");
    expect(telHref("(0)1-234")).toBe("tel:+01234");
  });
});
