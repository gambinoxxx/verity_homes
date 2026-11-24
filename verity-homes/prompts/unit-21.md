# Unit 21 — Lead generation + launch

This REPLACES the old "Unit 21: QA + launch" section in PROMPTS.md (add a note there pointing
here). Deadline: Friday.

Environment: local Mac (VS Code). E2E: `PW_CHANNEL=chrome PW_PORT=3100`.
The domain is LIVE: main address https://www.verityhomes.ng (verityhomes.ng 308 → www).
DNS is at Whogohost (not Vercel). The Vercel project, Blob store, env vars and domain are
ALREADY set up — don't redo them. You don't have Vercel/Resend/Clerk/Whogohost access: write
exact steps and records for the owner instead of running them.

TESTING RULE: only the tests you touch, ONCE, plus `npm run check`; ONE full-suite run at the
very end (step 12). Separate commits per part; push after each. Never print env values.

DATABASE WARNING: `.env.local` DATABASE_URL points at the Neon MAIN branch, which is ALSO the
live production database. So:
- Create and test the step-4 migration against the TEST branch (`.env.test`) first.
- Anything run with `.env.local` touches LIVE data: the step-10 script must run with
  `--dry-run` there until the owner says yes.
- Never run `prisma migrate reset`, `db push --force-reset` or the seed against main.
- The step-4 migration (additive, nullable columns only) reaches production through the normal
  deploy; tell the owner before you push it.

GA4 / Search Console / Bing / Meta IDs aren't available yet: build everything so it's a no-op
when the env var is unset. The owner adds the IDs in Vercel later.

PRIORITY ORDER (so we can deploy tonight and keep going): 1 → 10 (dry run, show counts) → 7 →
2 + 3 → 4 → 5 → 6 → 8 → 9 → 11 → 12.

## 1. Domain
Replace every hard-coded "verityhomes.com.ng" (blog web-address preview, emails, docs, tests)
with "www.verityhomes.ng" / "verityhomes.ng" as appropriate. The site URL always comes from
`NEXT_PUBLIC_SITE_URL`.

## 2. Cookie consent (NDPA)
Small bottom banner: "We use cookies to understand which pages and ads help people find us."
[Accept] [Decline] + link to /privacy. Store the choice (try/catch localStorage). Google Consent
Mode v2 defaults to denied; update on Accept. Nothing analytics/ads loads before consent.
Mention it in the privacy page (draft text, flagged for review).

## 3. Analytics
GA4 via `@next/third-parties` (`NEXT_PUBLIC_GA_ID`; no-op if unset or no consent). Optional Meta
Pixel (`NEXT_PUBLIC_META_PIXEL_ID`), same gating. One `track(event, params)` helper. Events:
`generate_lead` (enquiry form success, incl. form type + property/plan slug), `whatsapp_click`,
`phone_click`, `email_click`, `plan_package_select`, `newsletter_signup`, `view_item` (property
page), `view_plan`. Unit test the helper (no-op without consent or ID).

## 4. Lead source tracking
On first landing, capture utm_source/medium/campaign/term/content, gclid, fbclid, the landing
page and the referrer (first touch, sessionStorage, try/catch). Send them with every enquiry
(hidden fields, validated and length-limited in Zod) and save on the Enquiry (Prisma migration:
nullable fields). Show "Source" in the admin enquiry list and detail (e.g. "Google Ads ·
land-lekki", "Instagram", "Google search", "Direct") and include it in the CSV.

## 5. Search engine verification
`metadata.verification` for Google (`NEXT_PUBLIC_GSC_VERIFICATION`) and Bing
(`NEXT_PUBLIC_BING_VERIFICATION`), only when set. (The owner will probably verify Google by a
DNS TXT record instead — that's fine, this is the fallback.)

## 6. Area pages
`/properties/in/[area]` for every area/locality that has ≥1 PUBLISHED property (slug from the
existing location field). H1 "Properties for sale and rent in <Area>, Lagos", a short templated
intro, the listings grid (existing card), a CTA (WhatsApp + enquiry), breadcrumbs, unique
title/description, canonical, in the sitemap; 404 if none. Link them from property pages
("More in Lekki") and the /properties area filter. No invented facts about areas.

## 7. Contact taps
Every phone number is a `tel:` link. Every WhatsApp button opens a pre-filled message naming
the page ("Hello Verity, I'm interested in <property title> (<url>)"). Both fire the step-3
events (wire them up when step 3 lands).

## 8. Speed
Lighthouse mobile on /, /properties, one property page, one post. Targets: ≥ 90 performance,
≥ 95 accessibility / SEO / best practices. Fix what's cheap (image sizes and priority, fonts,
unused JS, CLS). Report before/after scores.

## 9. DNS + env checklist
Write `docs/DNS-CHECKLIST.md` listing EVERY record still needed at Whogohost, with
Type / Name / Value (or "copy from <dashboard>") / TTL / why, for ONE login session:
- Resend: verify verityhomes.ng (sending subdomain); list its records.
- Clerk production instance for www.verityhomes.ng: list its CNAMEs, plus the steps to create
  the production instance and re-create the admin user with publicMetadata role "admin".
- Hostinger mailbox (already verified; MX already set to mx1/mx2.hostinger.com): SPF — merge
  into the ONE existing `v=spf1` record and show the final merged value (Hostinger + Resend if
  Resend needs root SPF); DKIM; DMARC (start with p=none; rua to a Verity mailbox).
- Google Search Console: domain-property TXT record (value from Search Console).
Then the Vercel Production env changes (names only, no values): Clerk live keys,
`ENQUIRY_FROM` = "Verity Homes <website@verityhomes.ng>", `ENQUIRY_NOTIFY_TO`, the GA / GSC /
Bing / Meta IDs.

## 10. Sample data
Script `scripts/clear-samples.ts` that removes [SAMPLE] rows (and their Blob files under
samples/ only if no real row uses them). `--dry-run` by default prints counts per table;
`--confirm` actually deletes. Run the dry run against production (`.env.local`) and SHOW the
counts; don't delete until the owner says yes. Real content is never touched.

## 11. Admin guide
`docs/ADMIN-GUIDE.md` for Esther (plain English, short sections, screenshots where easy):
signing in; adding a property (photos, map, publish checklist); blog posts (paste from the AI
prompt in `docs/AI-BLOG-PROMPT.md` — the owner will supply that text; leave a placeholder);
how headings/bullets work (## and - symbols, always check Preview); enquiries + where they came
from + CSV; plans (stay hidden until the legal review); testimonials/partners (consent);
settings; and "Getting more clients": Google Business Profile, reviews, 1–2 posts a week, keep
listings fresh, where to see leads per ad.

## 12. Final
ONE full test run (both projects). Fix real failures. Update the tracker (Unit 21 done; launch
checklist of what's left for the owner). Push.
Report: commits, Lighthouse scores, test counts, the DNS checklist path, the sample-data
dry-run counts.
