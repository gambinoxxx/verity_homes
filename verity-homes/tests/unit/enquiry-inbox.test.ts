// Admin enquiries inbox (Unit 16): CSV builder, WhatsApp reply text, initials, URL filters.
import { describe, expect, it } from "vitest";
import {
  CSV_COLUMNS,
  type CsvEnquiry,
  csvCell,
  csvFileName,
  enquiriesCsv,
  firstName,
  initials,
  lagosTimestamp,
  whatsappReply,
} from "@/lib/enquiry-inbox";
import { whatsappLink } from "@/lib/whatsapp";
import {
  enquiriesCsvHref,
  enquiriesHref,
  parseEnquiryFilters,
} from "@/lib/validation/admin-enquiry-filters";

describe("csvCell", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a, b")).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("guards against spreadsheet formulas", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+2348030000000")).toBe("'+2348030000000");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\tcmd")).toBe("'\tcmd");
    expect(csvCell("2348030000000")).toBe("2348030000000"); // stored phones are digits
    expect(csvCell("a=b")).toBe("a=b"); // only a leading sign is dangerous
  });
});

describe("Lagos timestamps", () => {
  it("formats in Lagos time (UTC+1), sortable", () => {
    expect(lagosTimestamp(new Date("2026-11-13T08:05:00Z"))).toBe("2026-11-13 09:05");
    expect(lagosTimestamp(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01 00:30");
    expect(csvFileName(new Date("2026-11-13T23:30:00Z"))).toBe("enquiries-2026-11-14.csv");
  });
});

describe("enquiriesCsv", () => {
  const row: CsvEnquiry = {
    createdAt: new Date("2026-11-13T08:05:00Z"),
    name: "Ada, Okafor",
    phone: "2348030000000",
    email: null,
    interest: "BUYING",
    propertyTitle: "4-Bed Duplex",
    planName: null,
    status: "NEW",
    message: '=cmd|"/c calc"!A1\nsecond line',
    note: null,
  };

  it("BOM, header, CRLF rows, every column in order", () => {
    const csv = enquiriesCsv([
      row,
      {
        ...row,
        name: "Tunde",
        propertyTitle: null,
        planName: "Starter",
        status: "CLOSED",
        message: "Hi",
        note: "Called",
      },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
    expect(lines[0]).toBe(
      "Received (Lagos),Name,Phone,Email,Interest,Property / plan,Status,Message,Note",
    );
    expect(lines[1]).toBe(
      '2026-11-13 09:05,"Ada, Okafor",2348030000000,,Buying,4-Bed Duplex,New,"\'=cmd|""/c calc""!A1\nsecond line",',
    );
    expect(csv).toContain("Tunde,2348030000000,,Buying,Plan: Starter,Closed,Hi,Called\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("an empty export still has the header", () => {
    expect(enquiriesCsv([])).toBe(`﻿${CSV_COLUMNS.join(",")}\r\n`);
  });
});

describe("WhatsApp reply", () => {
  it("greets by first name and names the property, plan, or Verity Homes", () => {
    expect(whatsappReply({ name: "Adaeze Okafor", propertyTitle: "Duplex", planName: null })).toBe(
      "Hi Adaeze, thank you for your enquiry about Duplex.",
    );
    expect(whatsappReply({ name: "Tunde", propertyTitle: null, planName: "Starter" })).toBe(
      "Hi Tunde, thank you for your enquiry about the Starter plan.",
    );
    expect(whatsappReply({ name: "[SAMPLE] Ngozi K.", propertyTitle: null, planName: null })).toBe(
      "Hi Ngozi, thank you for your enquiry about Verity Homes.",
    );
  });

  it("links to the visitor's number", () => {
    const link = whatsappLink(
      "2348030000000",
      whatsappReply({ name: "Ada", propertyTitle: null, planName: null }),
    );
    expect(link).toBe(
      "https://wa.me/2348030000000?text=Hi%20Ada%2C%20thank%20you%20for%20your%20enquiry%20about%20Verity%20Homes.",
    );
  });

  it("initials and first names ignore [SAMPLE] tags", () => {
    expect(initials("Adaeze Okafor")).toBe("AO");
    expect(initials("tunde")).toBe("T");
    expect(initials("[SAMPLE] E2E Ada Obi")).toBe("EO");
    expect(initials("  ")).toBe("?");
    expect(firstName("[SAMPLE] Ngozi K.")).toBe("Ngozi");
  });
});

describe("inbox URL filters", () => {
  it("parses each param on its own", () => {
    expect(
      parseEnquiryFilters({
        status: "new",
        q: " ada ",
        interest: "buying",
        page: "2",
        id: "cmwabc12345",
      }),
    ).toEqual({ status: "new", q: "ada", interest: "buying", page: 2, id: "cmwabc12345" });
    expect(parseEnquiryFilters({ status: "x", interest: "castle", page: "0", id: "../x" })).toEqual(
      {
        status: "all",
        q: "",
        interest: null,
        page: 1,
        id: null,
      },
    );
  });

  it("changing a filter resets the page and closes the open enquiry", () => {
    const f = parseEnquiryFilters({ status: "new", q: "ada", page: "3", id: "cmwabc12345" });
    expect(enquiriesHref(f, { status: "closed" })).toBe("/admin/enquiries?status=closed&q=ada");
    expect(enquiriesHref(f, { id: "cmwdef67890" })).toBe(
      "/admin/enquiries?status=new&q=ada&page=3&id=cmwdef67890",
    );
    expect(enquiriesCsvHref(f)).toBe("/api/admin/enquiries/export?status=new&q=ada");
  });
});
