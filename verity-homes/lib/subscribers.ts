// Newsletter subscribers (Unit 19b): URL params and the CSV export. Reuses the enquiry inbox's
// CSV cell (same formula guard) and Lagos time, so both exports behave the same.
import { z } from "zod";
import { csvCell, lagosTimestamp } from "@/lib/enquiry-inbox";

export type SubscriberFilters = { q: string; page: number };

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/** ?q=gmail&page=2 — each param falls back on its own, so a bad URL never throws. */
export function parseSubscriberFilters(
  params: Record<string, string | string[] | undefined>,
): SubscriberFilters {
  const q = z
    .string()
    .trim()
    .max(120)
    .catch("")
    .parse(first(params.q) ?? "");
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .catch(1)
    .parse(first(params.page) ?? 1);
  return { q, page };
}

export function subscribersHref(f: SubscriberFilters, change: Partial<SubscriberFilters> = {}) {
  const next = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `/admin/subscribers?${qs}` : "/admin/subscribers";
}

export const SUBSCRIBER_CSV_COLUMNS = ["Joined (Lagos)", "Email"] as const;

/** BOM + CRLF like the enquiries CSV; every cell through csvCell (formula guard). */
export function subscribersCsv(rows: readonly { email: string; createdAt: Date }[]): string {
  const lines = [SUBSCRIBER_CSV_COLUMNS.map(csvCell).join(",")];
  for (const r of rows) lines.push([lagosTimestamp(r.createdAt), r.email].map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** "subscribers-2026-11-15.csv" (Lagos date). */
export function subscribersCsvFileName(now: Date): string {
  return `subscribers-${lagosTimestamp(now).slice(0, 10)}.csv`;
}
