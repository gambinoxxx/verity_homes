// Spec for lib/validation/enquiry.ts (shared by the form and the server action).
import { describe, expect, it } from "vitest";
import { enquirySchema } from "@/lib/validation/enquiry";

const valid = {
  name: "Tunde Bello",
  phone: "+234 803 000 0000",
  email: "",
  interest: "BUYING",
  message: "Is it still available?",
  source: "PROPERTY_PAGE",
  propertyId: "clx123",
  wantsInspection: true,
  company: "", // honeypot
  startedAt: Date.now() - 10_000,
};

describe("enquirySchema", () => {
  it("accepts a normal enquiry and normalises the phone to digits", () => {
    const r = enquirySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.phone).toBe("2348030000000");
      expect(r.data.email).toBeUndefined();
    }
  });
  it("requires name and phone", () => {
    const r = enquirySchema.safeParse({ ...valid, name: "", phone: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = r.error.flatten().fieldErrors;
      expect(f.name).toBeDefined();
      expect(f.phone).toBeDefined();
    }
  });
  it("rejects a phone number that is too short", () => {
    expect(enquirySchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });
  it("rejects a bad email but allows none", () => {
    expect(enquirySchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, email: undefined }).success).toBe(true);
  });
  it("rejects bots: filled honeypot", () => {
    expect(enquirySchema.safeParse({ ...valid, company: "Acme" }).success).toBe(false);
  });
  it("rejects bots: form submitted faster than 3 seconds", () => {
    expect(enquirySchema.safeParse({ ...valid, startedAt: Date.now() - 500 }).success).toBe(false);
  });
  it("caps the message length", () => {
    expect(enquirySchema.safeParse({ ...valid, message: "x".repeat(2001) }).success).toBe(false);
  });
});
