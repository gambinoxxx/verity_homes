// Enquiry notification email: subject, branded HTML and a plain-text version. Pure (no I/O),
// so it is unit-tested directly. Every optional field may be missing.
import { INTEREST_LABEL, SOURCE_LABEL, formatNaira } from "@/lib/format";

export type EnquiryEmailData = {
  id: string;
  name: string;
  /** Digits with country code, e.g. 2348030000000 (normalised by enquirySchema). */
  phone: string;
  email?: string | null;
  interest: keyof typeof INTEREST_LABEL;
  source: keyof typeof SOURCE_LABEL;
  message?: string | null;
  wantsInspection?: boolean;
  amountKobo?: bigint | null;
  property?: { title: string; slug: string } | null;
  plan?: { name: string } | null;
  createdAt: Date;
};

const NAVY = "#0A1A33";
const GOLD = "#C8A24E";
const MUTED = "#4A5568";

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const siteLink = (siteUrl: string, path: string) => new URL(path, siteUrl).toString();

/** +234 803 000 0000 style for display; the raw digits are used in links. */
function displayPhone(digits: string): string {
  return digits.startsWith("234") && digits.length === 13
    ? `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
    : `+${digits}`;
}

export function buildEnquiryEmail(d: EnquiryEmailData, siteUrl: string) {
  const interest = INTEREST_LABEL[d.interest];
  const name = oneLine(d.name);
  const subject = `New enquiry: ${interest} — ${name}`;
  const tel = `tel:+${d.phone}`;
  const wa = `https://wa.me/${d.phone}?text=${encodeURIComponent(`Hello ${name}, thank you for your enquiry to Verity Homes and Properties.`)}`;
  const propertyUrl = d.property ? siteLink(siteUrl, `/properties/${d.property.slug}`) : null;
  const planUrl = d.plan ? siteLink(siteUrl, "/invest") : null;
  const message = d.message?.trim() || "";
  const when = d.createdAt.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  // [label, plain text, html]
  const rows: [string, string, string][] = [
    ["Name", name, esc(name)],
    [
      "Phone",
      displayPhone(d.phone),
      `<a href="${esc(tel)}" style="color:${NAVY}">${esc(displayPhone(d.phone))}</a> · <a href="${esc(wa)}" style="color:#1FAF55">WhatsApp</a>`,
    ],
  ];
  if (d.email)
    rows.push([
      "Email",
      d.email,
      `<a href="mailto:${esc(d.email)}" style="color:${NAVY}">${esc(d.email)}</a>`,
    ]);
  rows.push(["Interest", interest, esc(interest)]);
  if (d.property && propertyUrl)
    rows.push([
      "Property",
      `${d.property.title} — ${propertyUrl}`,
      `<a href="${esc(propertyUrl)}" style="color:${NAVY}">${esc(d.property.title)}</a>`,
    ]);
  if (d.plan && planUrl)
    rows.push([
      "Plan",
      `${d.plan.name} — ${planUrl}`,
      `<a href="${esc(planUrl)}" style="color:${NAVY}">${esc(d.plan.name)}</a>`,
    ]);
  if (d.amountKobo != null)
    rows.push(["Amount", formatNaira(d.amountKobo), esc(formatNaira(d.amountKobo))]);
  if (d.wantsInspection)
    rows.push([
      "Inspection",
      "Yes, wants to book an inspection",
      "Yes, wants to book an inspection",
    ]);
  rows.push([
    "From",
    `${SOURCE_LABEL[d.source]}, ${when}`,
    esc(`${SOURCE_LABEL[d.source]}, ${when}`),
  ]);

  const text = [
    subject,
    "",
    ...rows.map(([label, plain]) => `${label}: ${plain}`),
    "",
    "Message:",
    message || "(no message)",
    "",
    `Call: ${tel}`,
    `WhatsApp: ${wa}`,
    "",
    `Reference: ${d.id}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#F5F6F8;font-family:Arial,Helvetica,sans-serif;color:${NAVY}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden">
<tr><td style="background:${NAVY};padding:22px 28px;color:#FFFFFF;font-family:Georgia,serif;font-size:22px;letter-spacing:3px">VERITY<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:${GOLD};margin-top:4px">HOMES &amp; PROPERTIES</div></td></tr>
<tr><td style="padding:26px 28px 6px"><h1 style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:600">New enquiry: ${esc(interest)}</h1></td></tr>
<tr><td style="padding:10px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5">
${rows.map(([label, , h]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E3E6EB;color:${MUTED};width:110px;vertical-align:top">${esc(label)}</td><td style="padding:8px 0;border-bottom:1px solid #E3E6EB">${h}</td></tr>`).join("\n")}
</table></td></tr>
<tr><td style="padding:14px 28px 4px;color:${MUTED};font-size:13px;text-transform:uppercase;letter-spacing:1px">Message</td></tr>
<tr><td style="padding:0 28px 22px;font-size:15px;line-height:1.6;white-space:pre-wrap">${message ? esc(message) : `<span style="color:${MUTED}">(no message)</span>`}</td></tr>
<tr><td style="padding:0 28px 26px"><a href="${esc(tel)}" style="display:inline-block;background:${NAVY};color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;margin-right:8px">Call</a><a href="${esc(wa)}" style="display:inline-block;background:#1FAF55;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">WhatsApp</a></td></tr>
<tr><td style="padding:14px 28px;background:#F5F6F8;color:${MUTED};font-size:12px">Reference ${esc(d.id)} · sent by the Verity website</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}
