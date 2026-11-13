// Admin enquiries inbox (Unit 16): pure helpers — initials, WhatsApp reply text, Lagos dates
// and the CSV export. Unit-tested in tests/unit/enquiry-inbox.test.ts.
import { INTEREST_LABEL } from "@/lib/format";

/** Longest private note (characters). */
export const NOTE_MAX = 2000;

/** "Adaeze Okafor" → "AO"; "tunde" → "T"; "" → "?". */
export function initials(name: string): string {
  const parts = name
    .replace(/\[[^\]]*\]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts.slice(0, 1);
  const out = letters.map((p) => (p ?? "").charAt(0).toUpperCase()).join("");
  return out || "?";
}

/** First word of the name, ignoring "[SAMPLE]"-style tags: "Adaeze Okafor" → "Adaeze". */
export function firstName(name: string): string {
  return (
    name
      .replace(/\[[^\]]*\]/g, " ")
      .trim()
      .split(/\s+/)[0] ?? ""
  );
}

/** "Hi Adaeze, thank you for your enquiry about Contemporary Detached Duplex." */
export function whatsappReply(e: {
  name: string;
  propertyTitle: string | null;
  planName: string | null;
}): string {
  const who = firstName(e.name);
  const about = e.propertyTitle ?? (e.planName ? `the ${e.planName} plan` : "Verity Homes");
  return `Hi${who ? ` ${who}` : ""}, thank you for your enquiry about ${about}.`;
}

const lagosParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Lagos local time, sortable: "2026-11-13 09:05". */
export function lagosTimestamp(d: Date): string {
  const p = Object.fromEntries(lagosParts.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

const lagosLong = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** For hover titles: "Fri, 13 Nov 2026, 09:05 (Lagos)". */
export function lagosLongDate(d: Date): string {
  return `${lagosLong.format(d)} (Lagos)`;
}

// ---- CSV ----

/**
 * One CSV cell. Formula guard: a value starting with = + - @ (or a tab / carriage return,
 * which spreadsheets also treat specially) gets a leading ' so Excel/Sheets show it as text
 * instead of running it. Quoted when it contains a comma, quote or line break.
 */
export function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const CSV_COLUMNS = [
  "Received (Lagos)",
  "Name",
  "Phone",
  "Email",
  "Interest",
  "Property / plan",
  "Status",
  "Message",
  "Note",
] as const;

export type CsvEnquiry = {
  createdAt: Date;
  name: string;
  phone: string;
  email: string | null;
  interest: keyof typeof INTEREST_LABEL;
  propertyTitle: string | null;
  planName: string | null;
  status: "NEW" | "CONTACTED" | "CLOSED";
  message: string;
  note: string | null;
};

const STATUS_TEXT = { NEW: "New", CONTACTED: "Contacted", CLOSED: "Closed" } as const;

/** The whole file: BOM (so Excel reads UTF-8), header, one row per enquiry, CRLF line ends. */
export function enquiriesCsv(rows: readonly CsvEnquiry[]): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        lagosTimestamp(r.createdAt),
        r.name,
        r.phone,
        r.email,
        INTEREST_LABEL[r.interest],
        r.propertyTitle ?? (r.planName ? `Plan: ${r.planName}` : ""),
        STATUS_TEXT[r.status],
        r.message,
        r.note,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** "enquiries-2026-11-13.csv" (Lagos date). */
export function csvFileName(now: Date): string {
  return `enquiries-${lagosTimestamp(now).slice(0, 10)}.csv`;
}
