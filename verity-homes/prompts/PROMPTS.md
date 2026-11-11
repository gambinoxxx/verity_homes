# Prompts — copy one at a time into your coding agent

These work in Cursor, Windsurf, Codex, GitHub Copilot agent, Claude Code
or any agent that can read files and run commands.

**How to use them**

- Paste the **Start-of-session prompt** first, then one unit prompt.
- One unit per session or chat. Start a fresh chat for the next unit, so
  the agent rereads the context instead of guessing from memory.
- When the agent says it's finished, paste the **Verify prompt**. If
  anything fails, paste the **Fix prompt**.
- Every few units, run the **Review prompt** with a *different* model or
  agent, so the work isn't grading itself.

---

## Start-of-session prompt (paste first, every time)

```
You are a senior Next.js + TypeScript engineer and UI/UX designer working on the
Verity Homes and Properties website.

Before writing any code:
1. Read AGENTS.md, every file in context/, and testing/TESTING.md.
2. Open context/progress-tracker.md and tell me which unit we are on.
3. Open the design/ reference file(s) for that unit in the browser or read their
   HTML/CSS. The design is the source of truth for layout, spacing, colours, copy
   and motion.

Rules you must follow:
- Implement only the current unit. Do not start the next one.
- Never invent business facts (phone, address, prices, return rates, testimonials,
  partners, statistics). Use the marked placeholders or [SAMPLE] seed data.
- Never edit design/, prisma/migrations/ (once applied), components/ui/, or .env files.
- Follow the verification loop in testing/TESTING.md before saying you are done.
- If something is unclear, add it to "Open questions" in progress-tracker.md,
  pick the most conservative option, and tell me.

Reply with: the unit, a short plan (files you will create or change), and any
question that blocks you. Then wait for the unit prompt.
```

---

## Unit 1: Project setup

```
Unit 1 — Project setup.

1. Create the app in the current folder: Next.js 16, App Router, TypeScript, ESLint,
   Tailwind CSS 4, src-less layout (app/ at root), import alias "@/*".
   Use stable versions only (check `npm view <pkg> version`; never -rc/-beta).
2. tsconfig: "strict": true, "noUncheckedIndexedAccess": true.
3. Copy the provided files into place (they are already written and tested):
   - backend/lib/* → lib/   (format.ts, maps.ts, slug.ts, whatsapp.ts, env.ts,
     validation/enquiry.ts; lib/db/client.ts is used in Unit 2)
   - backend/.env.example → .env.example ; create .env.local from it and ask me for the
     values (the README tells me to create the Neon, Clerk, Vercel Blob and Resend accounts
     before we start, so all values should exist). Do not loosen lib/env.ts.
   - testing/* per the table in testing/TESTING.md §1
   - brand/web-icons: favicon.ico → app/favicon.ico, favicon.svg → app/icon.svg,
     apple-touch-icon.png → app/apple-icon.png
   - design/img/*.jpg → public/samples/
4. Install: zod@4, vitest, @playwright/test, @axe-core/playwright, tsx, server-only,
   prettier + prettier-plugin-tailwindcss. Add the package.json scripts from TESTING.md.
5. Design tokens: port the :root variables from design/assets/verity.css into
   app/globals.css and expose them in Tailwind 4 `@theme` (colors, radii, fonts).
   Load Playfair Display + Manrope with next/font/google as --font-display / --font-sans.
6. A temporary app/page.tsx showing a few token swatches + both fonts.

Done when: `npm run check` passes and `npm run test` shows the 25 unit tests passing.
Then update progress-tracker.md and report.
```

## Unit 2: Database

```
Unit 2 — Database with Prisma 7 + Neon.

1. Install prisma@7 and @prisma/client@7 and @prisma/adapter-neon@7 explicitly
   (npm "latest" may be an 8.x RC — do not use it), plus dotenv.
2. Copy backend/prisma/schema.prisma, backend/prisma/seed.ts and
   backend/prisma.config.ts into the repo. Do not change the models without telling me.
3. Ask me for the Neon DATABASE_URL (pooled) and DIRECT_URL (unpooled). Also create a
   Neon *branch* called "test" and put its URLs in .env.test.
4. `npx prisma migrate dev --name init`, then `npx prisma db seed`.
5. lib/db/client.ts from backend/lib/db/client.ts. Add lib/db/queries/ with typed
   functions (no BigInt/Decimal leaving this layer — convert to number/string):
   getSiteSettings, getFeaturedProperties, getShowcaseProperties,
   listProperties(filters), getPropertyBySlug, getSimilarProperties,
   getPublishedPlans, getFaqs(page), listPosts(filters), getPostBySlug,
   getPublishedTestimonials (consentConfirmed only), getPublishedPartners.
   Every public query filters status = PUBLISHED. getPropertyBySlug must NOT select `address`.
6. Unit tests in tests/unit/queries.test.ts against the test branch: drafts are never
   returned; testimonial without consent is never returned; address is never selected.

Done when: migration committed, seed works on a reset, tests pass, `npm run check` passes.
```

## Unit 3: Site shell

```
Unit 3 — Site shell (header, footer, preloader, floating buttons, 404).
Reference: design/index.html (header, drawer, footer, preloader, WhatsApp float,
back-to-top, progress bar) and design/404.html.

- app/(site)/layout.tsx renders Header, Footer, WhatsAppFloat, BackToTop, ScrollProgress,
  Preloader. Footer/contact details and WhatsApp number come from getSiteSettings();
  if a value is missing, render the placeholder style from the design.
- components/site/logo.tsx: copy the SVG paths from the #logo symbol in design/index.html.
- Header: transparent over the hero, navy + blur after 40px; active link underline;
  mobile drawer (focus trap, Esc closes, body scroll lock, aria-expanded).
- Preloader: plays on every full page load (not on client-side navigation), curtain lift,
  skipped under prefers-reduced-motion, max 5s even if images are slow.
- app/not-found.tsx = design/404.html. Must return HTTP 404.
- All interactive pieces are small "use client" components; layout stays a Server Component.

Done when: public.spec.ts passes for "/" (temporary home) and the 404 route, and
`npm run compare -- / index.html` shows header/footer/preloader matching.
```

## Unit 4: Home page

```
Unit 4 — Home page wired to the database. Reference: design/index.html (match it closely).

Sections in order: hero slider (3 slides, captions, dots, counter), search bar (submits to
/properties with query params), intro "Who we are", marquee band, featured properties
(filters client-side within the 6), signature projects sticky showcase
(getShowcaseProperties, projectStatus pill), invest teaser with plans
(getPublishedPlans + disclaimer), statement scroll-fill, second marquee band, services
accordion with image swap (static content), CEO section, testimonials carousel
(published + consent only), latest 3 blog posts, contact block with the enquiry form UI
(build the form component now; Unit 7 connects it to the server action — do not fake a
success message in the meantime).

- Hero/intro/service images: use the sample images in public/samples for now via next/image.
- Showcase and statement scroll effects: one client component each, rAF-throttled,
  disabled under reduced motion.
- Empty states: if no showcase properties, hide that section; if no testimonials, hide it.

Done when: public.spec.ts for "/" passes on both projects and
`npm run compare -- / index.html` matches section by section (list any differences
you could not fix and why).
```

## Unit 5: Properties list

```
Unit 5 — /properties. Reference: design/properties.html.

- Server-rendered from URL params parsed by Zod (lib/validation/property-filters.ts):
  type (sale|rent|land|offplan), q, area, ptype, min, max (naira), beds (0–5), title[],
  sort (newest|price-asc|price-desc), page (12 per page). Invalid params fall back to
  defaults, never crash.
- Type pills and the sidebar form update the URL (router.push with scroll:false);
  results render from the server. Mobile: "Filters" button toggles the sidebar.
- Card component shared with the home page (components/site/property-card.tsx).
  Heart button saves slugs to localStorage (try/catch).
- Empty state: "No properties match your search" + clear filters + "Make a request" link.
- generateMetadata reflects the filter (e.g. "Properties for rent in Lagos").

Done when: tests/e2e/properties.spec.ts and public.spec.ts pass, and compare matches.
```

## Unit 6: Property detail + map

```
Unit 6 — /properties/[slug]. Reference: design/property.html.

- getPropertyBySlug; check SlugRedirect first (308 to new slug); unknown/draft → notFound().
- Head (tag, title, area, price via formatPrice, save + share buttons — share uses
  navigator.share with copy-link fallback), gallery (1 big + 4, "View all N photos"),
  lightbox (role=dialog, arrows, Esc, swipe on touch, focus return, counter),
  facts strip (only facts that exist), description (paragraphs from text),
  features, documents ("Verified" tag), Location block, similar properties (same
  listingType, exclude self, max 3).
- MAP: use lib/maps.ts → propertyMapQuery + mapEmbedUrl + mapsLink. iframe with
  title="Map showing the property's location", loading="lazy",
  referrerpolicy="no-referrer-when-downgrade". Map card text: if !exact say
  "Exact address shared at inspection". The private address must never be rendered or
  sent to the client. Add Google frame origins to the CSP / next.config headers.
- Nearby list from property.nearby JSON (hide if empty).
- Enquiry card (sticky) + mobile bottom bar (Enquire + WhatsApp). WhatsApp text:
  "Hi Verity, I'm interested in <title> (<url>)". Form wiring happens in Unit 7 —
  build the component here so Unit 7 only connects it.
- JSON-LD: RealEstateListing (name, url, image, address area/city only, offers price if public).
- generateMetadata + opengraph-image using the cover photo.

Done when: tests/e2e/property.spec.ts (except the enquiry submit test, which passes after
Unit 7) and public.spec.ts pass, compare matches on desktop and mobile.
```

## Unit 7: Enquiries

```
Unit 7 — Enquiry pipeline used on home, property, invest and contact pages.

- lib/actions/enquiry.ts `createEnquiry(formData)`: parse with enquirySchema
  (lib/validation/enquiry.ts — already written and tested), rate limit 5/hour per
  ipHash (sha256(ip + IP_HASH_SALT), count in DB), resolve propertyId/planId exist and are
  published, save Enquiry FIRST, then send the Resend email (lib/email/enquiry.tsx — simple
  branded HTML: name, phone (tap-to-call + WhatsApp link), interest, property/plan link,
  message). On email success set emailSentAt; on failure log and still return ok.
  Return { ok, fieldErrors? } — never raw errors.
- components/site/enquiry-form.tsx: useActionState, field errors under fields
  (aria-describedby), hidden honeypot `company` (visually hidden, tabIndex -1,
  autocomplete off), hidden startedAt set on mount, success message in role="status",
  submit button pending state.
- Newsletter footer form → lib/actions/subscribe.ts (upsert Subscriber, same honeypot).
- Unit tests for the action with the DB test branch and a mocked email module:
  saves before email; email failure still saves; honeypot rejected; rate limit works.

Done when: tests/e2e/enquiry.spec.ts (write it: validation errors, success, row exists)
and the property enquiry test pass. Report how to view test emails (Resend dashboard).
```

## Unit 8: Contact page

```
Unit 8 — /contact. Reference: design/contact.html.
Page hero + sheet, three cards (email / call+WhatsApp / visit — values from site settings,
mailto:, tel:, wa.me, mapsLink), "Leave a message" soft pill form (EnquiryForm with
source CONTACT_PAGE and the interest select), map using SiteSettings.mapQuery with the map
card. If showFullAddress is true show officeAddress, else officeArea.
Done when: public.spec.ts passes for /contact and compare matches.
```

## Unit 9: Invest page

```
Unit 9 — /invest. Reference: design/invest.html.
Hero + sheet with the 4 steps, plans from getPublishedPlans (highlighted = gold card,
return rate shown as "<rate>% per annum" only if > 0 else the placeholder style, minimum via
formatNaira, tenure in months, payout label), disclaimer (required wherever plans appear),
FAQ accordion from getFaqs('INVEST') using <details>/<summary>, investment enquiry form
(EnquiryForm source INVEST_PAGE, plan select from plans, amount field → amountKobo via
koboFromNaira). Never use the word "guaranteed".
Done when: public.spec.ts passes for /invest, compare matches.
```

## Unit 10: About page

```
Unit 10 — /about. Reference: design/about.html.
Story split with overlapping images, values band (marquee), three values, CEO section
(bio text comes from a SiteSettings field you add ONLY if I approve — otherwise keep the
placeholder and add an open question), CAC trust card (companyName, rcNumber, officeArea
from settings), partners marquee (published + consentConfirmed; hide if none), CTA box.
Done when: public.spec.ts passes for /about, compare matches.
```

## Unit 11: Blog

```
Unit 11 — /blog and /blog/[slug]. References: design/blog.html, design/post.html.
List: category pills (?category=slug), search (?q=, title + excerpt, case-insensitive),
post rows, pagination (6 per page), sidebar (search, recent posts, categories with counts,
invest CTA). Post: hero with category + date + reading time, cover image, Markdown body
rendered safely (react-markdown + remark-gfm, no raw HTML), share buttons (WhatsApp,
email, native share), author box, 2 related posts. SlugRedirect check, notFound for drafts.
JSON-LD Article. Done when public.spec.ts passes for both and compare matches.
```

## Unit 12: Admin auth

```
Unit 12 — Clerk admin auth.
- Install @clerk/nextjs (stable). Wrap the root layout in <ClerkProvider>.
- proxy.ts (Next 16 name for middleware) with clerkMiddleware: protect /admin(.*) except
  /admin/sign-in(.*). Check the current Clerk docs for the exact Next 16 setup.
- app/admin/sign-in/[[...sign-in]]/page.tsx: centred <SignIn /> on navy with the logo.
- lib/auth/index.ts: requireAdmin() (redirects to sign-in if signed out, throws 403 if
  publicMetadata.role !== "admin") and isAdmin().
- app/admin/layout.tsx: calls requireAdmin(), renders the admin shell from
  design/admin.html (sidebar, top bar, Clerk <UserButton />), metadata robots noindex.
- Tell me exactly what to set in the Clerk dashboard (disable sign-ups, add my user,
  set publicMetadata { "role": "admin" }, allowed redirect URLs).
Done when tests/e2e/admin.spec.ts (signed-out part) passes.
```

## Unit 13: Admin dashboard

```
Unit 13 — /admin dashboard. Reference: design/admin.html (remove the "sample data" alert).
Stats from real counts (new enquiries, published listings + featured count, drafts,
published plans), latest 5 enquiries, quick actions. Server Component only.
```

## Unit 14: Admin properties list + editor

```
Unit 14 — Admin properties. References: design/admin-properties.html,
design/admin-property-edit.html.
- List: status tabs with counts, search, type filter (URL params), table, row actions
  (view on site, edit, delete with confirm dialog). Mobile: table scrolls inside its box.
- Editor (/admin/properties/new and /[id]): all fields from the reference EXCEPT photos and
  the map picker (Unit 15) — but keep their panels with lat/lng inputs working.
  React Hook Form + zodResolver with lib/validation/property.ts (shared with the action).
  Price input uses koboFromNaira. Features chip input. Documents list (add/remove/toggle).
  Slug: auto from title on create (uniqueSlug); editable; if a PUBLISHED property's slug
  changes, create a SlugRedirect.
- Actions in lib/actions/property.ts: create, update, publish, unpublish, delete
  (delete also removes Blob files via lib/storage). Every action: Zod → requireAdmin()
  → write → revalidatePath('/', '/properties', '/properties/<slug>'). Toasts via sonner.
Done when: you can create, edit, publish, unpublish and delete a property, the public
pages update immediately, and unit tests for lib/validation/property.ts pass.
```

## Unit 15: Admin photos + map picker

```
Unit 15 — Property photos and map picker. Reference: design/admin-property-edit.html.
- Photos: Vercel Blob client uploads (`upload` from @vercel/blob/client) through
  app/api/blob/upload/route.ts (handleUpload; requireAdmin in onBeforeGenerateToken;
  allowedContentTypes jpeg/png/webp; maximumSizeInBytes 10MB; addRandomSuffix true).
  Drag-and-drop zone + click, progress per file, max 20, reorder (drag + up/down buttons
  for keyboard users), first = cover, alt text per photo (warn if empty), remove (deletes
  the Blob file on save). Store url, pathname, width, height, sortOrder.
- Map picker: react-leaflet + leaflet with OSM tiles and attribution, loaded with
  next/dynamic ssr:false. Click or drag marker sets lat/lng (6 decimals); typing lat/lng
  moves the marker; "Use area centre" button geocodes area+city via Nominatim
  (https://nominatim.openstreetmap.org/search?format=json&q=…, with a descriptive
  User-Agent/Referer, max 1 request/sec) — or skip geocoding if blocked and say so.
  "Show exact location" switch explained under it.
Done when: upload, reorder, alt text, delete and the pin all persist, and the public
property page shows the updated gallery and map.
```

## Unit 16: Admin enquiries

```
Unit 16 — Admin enquiries inbox. Reference: design/admin-enquiries.html.
Status tabs with counts, search (name/phone/message), table + detail panel (URL param
?id=), actions: WhatsApp (wa.me with "Hi <name>, thanks for your enquiry about …"),
call (tel:), mark contacted, close, reopen, private note (autosave on blur), CSV export
(route handler, admin only, all filtered rows). Sidebar badge = count of NEW.
```

## Unit 17: Plans + FAQs admin

```
Unit 17 — Admin investment plans and FAQs. Follow the list + editor pattern from
Unit 14 (same components). Plans: name, badge, summary, minimum (₦), return rate %,
tenure months, payout, highlighted (only one at a time), status, drag to reorder.
FAQs: page, question, answer, status, order. Show the disclaimer text read-only in the
plan editor as a reminder. revalidate /, /invest.
```

## Unit 18: Posts admin

```
Unit 18 — Admin blog posts + categories. List + editor pattern. Editor: title, slug,
category (create inline), excerpt, cover upload (Blob) + alt, Markdown editor with live
preview tabs (textarea + react-markdown — no heavy WYSIWYG), reading time computed
(200 wpm), SEO title/description with Google preview, draft/publish, slug redirect.
revalidate /, /blog, /blog/<slug>.
```

## Unit 19: Testimonials, partners, settings, subscribers

```
Unit 19 — Admin testimonials, partners, site settings, newsletter subscribers.
Testimonials: cannot publish unless "Client gave permission" is checked (enforced in Zod
AND the action). Partners: logo upload, website, same consent rule. Site settings: one
form for phone, WhatsApp (normalise to digits, show a test link), email, office area,
office address + "show full address" switch with a warning, map query with live map
preview, socials, opening hours. Subscribers: list + CSV export.
Split into separate sessions if it gets large.
```

## Unit 20: SEO

```
Unit 20 — SEO. app/sitemap.ts (static pages + published properties and posts with
lastModified), app/robots.ts (disallow /admin), metadataBase from NEXT_PUBLIC_SITE_URL,
default OG image (brand/verity-social-profile-1080.png or a 1200×630 version you
generate from the logo), Organization JSON-LD in the root layout (name, RC number as
identifier, logo, area — no phone if not set), canonical URLs, 308 redirects from
SlugRedirect. Check every page has a unique title and description.
```

## Unit 21: QA + launch

```
Unit 21 — QA and launch.
1. Run the full Playwright suite on both projects; fix everything.
2. Enable the signed-in admin tests (testing/TESTING.md §6) and make them pass.
3. Lighthouse mobile on /, /properties and one property: a11y/best-practices/SEO ≥ 90,
   performance ≥ 80. Fix image sizes, fonts, layout shift.
4. Vercel: project, env vars (production + preview), build command
   `prisma generate && prisma migrate deploy && next build`, Blob store, domain
   verityhomes.com.ng (give me the exact DNS records to add at Whogohost).
5. Resend: verify the domain (give me the DNS records), set ENQUIRY_FROM.
6. Make sure the seed never ran on production; production starts empty.
7. Write docs/ADMIN-GUIDE.md: a plain-English guide for Esther (adding a property,
   photos, map pin, publishing, answering enquiries).
Report: test results, Lighthouse scores, URLs, and the list of open questions left.
```

---

## Verify prompt (paste when the agent says "done")

```
Before I accept this unit, run the full verification loop from testing/TESTING.md and show
me the real output (not a summary):
1. npm run lint && npm run typecheck
2. npm run test
3. npm run build
4. npm run test:e2e -- <the specs for this unit>
5. npm run compare for each page in this unit, then open the images and list every visible
   difference from the design (layout, spacing, colour, type, missing elements, mobile).
Fix what you find, rerun, and give me the final results plus screenshot paths.
Then confirm each item of the Definition of Done in context/ai-workflow-rules.md.
```

## Fix prompt (when something fails)

```
This is failing: <paste the error / test output / screenshot description>.
Find the root cause before changing code — explain it in two or three sentences.
Do not weaken, skip or delete tests. Fix it, then rerun the verification loop and show
the output.
```

## Review prompt (use a different model/agent every few units)

```
You are reviewing work another engineer did on this repo. Do not write new features.
Read AGENTS.md and context/. Then review the diff for units <N–M> (git log / git diff) for:
1. Broken invariants from context/architecture.md (drafts leaking, address leaking,
   missing requireAdmin, missing Zod validation, BigInt reaching the client, hardcoded
   contact details or prices, "guaranteed" in copy).
2. Security: auth on every admin action/route, upload limits, rate limiting, XSS in
   Markdown, secrets in code.
3. Accessibility: labels, focus states, keyboard access, alt text, contrast.
4. Visual drift from design/ (run npm run compare on the affected pages).
5. Missing or weak tests.
List findings ranked by severity with file:line and a concrete fix. Do not fix them unless
I ask.
```
