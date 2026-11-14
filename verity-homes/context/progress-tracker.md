# Progress Tracker

Status: `todo` · `in progress` · `done` · `blocked`

Each unit has a matching prompt in `prompts/PROMPTS.md`.

## Current focus

**Public site complete** (Units 1–11). Units 12–17 (admin auth, dashboard, properties, photos + map, enquiries, plans + FAQs) done. Units 17b and 17c (investment packages + plan pages) done. Unit 18 (blog posts + categories admin) done. Next: Unit 19 — testimonials, partners, settings, subscribers. Before real plan figures go live, see open question 54 (legal/SEC review).

## Units

| # | Unit | Status | Design reference | Notes |
| --- | --- | --- | --- | --- |
| 1 | Project setup: Next 16 + TS strict, Tailwind tokens, fonts, ESLint and Prettier, `lib/env.ts`, Vitest + Playwright installed, favicons | done | `design/assets/verity.css` | Done 2026-11-11: TS strict + noUncheckedIndexedAccess, tokens in `app/globals.css` `@theme`, Playfair/Manrope via next/font, Prettier, backend helpers + tests copied (25 unit tests pass), Vitest + Playwright installed, favicons. `build` is `next build` until Prisma lands — Unit 2 must change it to `prisma generate && next build`. |
| 2 | Database: copy `prisma/schema.prisma`, Prisma 7 + Neon adapter, first migration, seed (`[SAMPLE]` content + SiteSettings), query layer skeleton | done | — | Done 2026-11-11: Prisma 7.10.1 + adapter-neon; migration `20261111140315_init` on dev and test branches, both seeded; `lib/db/queries/*` (PUBLISHED only, no `address`, no BigInt/Decimal out); 9 query tests on the Neon test branch. Env files loaded explicitly (`ENV_FILE`, default `.env.local`); `npm run db:test:reset` = reset + seed. |
| 3 | Site shell: header, mobile drawer, footer, preloader, WhatsApp float, back-to-top, progress bar, 404 | done | `index.html`, `404.html` | Done 2026-11-11: `components/site/*` + shared `<SiteChrome>` used by `app/(site)/layout.tsx` and `app/not-found.tsx` (HTTP 404). `getSiteSettings()` is `"use cache"` + `cacheTag("settings")` + `cacheLife("max")`; Unit 19 must call `updateTag("settings")`. Placeholders for phone/email; WhatsApp float hidden until a number is set. Drawer: focus in, Tab trap, Esc, focus return, scroll lock. Preloader: full loads only, reduced-motion skip, curtain up within 5s. Temp token page moved to `app/(site)/page.tsx` with a navy hero. Turbopack Tailwind rule now skips `*.module.css` (it was turning CSS modules global). `lib/nav.ts` `UNBUILT_ROUTES` turns off `<Link>` prefetch for pages not built yet: **remove each route from it in the unit that builds it.** |
| 4 | Home page wired to the database | done | `index.html` | **4a done 2026-11-11:** hero slider (3 slides, captions, progress dots, 01/03, slow zoom, headline reveal after the preloader via `lib/site-loaded.ts`), search bar (`lib/search.ts` → `/properties?type=sale\|rent\|land&area=&ptype=`, Invest tab → `/invest`), intro with rotating badge, first marquee band (`components/site/marquee-band.tsx`, reusable), featured properties with on-page filters and localStorage hearts. Shared `components/site/property-card.tsx` for Unit 5. `getFeaturedProperties()` cached with tag `"properties"` (Unit 14 must call `updateTag("properties")`). Global reveal-on-scroll (now `components/site/reveal.tsx`, React-owned; see Open question 33). **4b done 2026-11-11:** search Budget ranges per tab (`lib/search-ranges.ts`, shared with Unit 5) → `min`/`max` naira params; signature projects sticky showcase (`showcase-stack.tsx`, rAF, inert hidden panel items, hidden if none); invest section (steps, plans with highlighted gold card + rate placeholder at 0, partner marquee hidden if none, disclaimer from `lib/invest.ts`); statement scroll-fill (`statement.tsx` + `lib/scroll-fill.ts`, rAF; complete by mid-viewport; filled by CSS under reduced motion / no JS); second band (reverse, light); services accordion + image swap (`#services`); CEO; testimonials carousel (hidden if none); latest 3 posts; contact block + `components/site/enquiry-form.tsx` (submit disabled, "Form goes live soon" until Unit 7). New cached queries + tags (see architecture.md). `tests/e2e/home.spec.ts` added. |
| 5 | Properties list, filters in the URL, pagination | done | `properties.html` | Done 2026-11-12: `app/(site)/properties/page.tsx` — `PageHero` + sheet; pills, sidebar and sort `router.push(…, { scroll: false })` in a transition; results render on the server from the URL inside `<Suspense>` (◐ partial prerender). Params (`type`, `q`, `area`, `ptype`, `min`, `max`, `beds`, `title[]`, `sort`, `page`, 12/page) parsed per param with Zod in `lib/validation/property-filters.ts` (bad values dropped, never throws; 9 unit tests). Price uses `lib/search-ranges.ts` (rent/land/sale ranges by pill), preselects the URL's range, keeps a non-preset min/max as "custom"; Price-on-request included unless min/max set. Area dropdown = distinct published areas (`getPublishedAreas`). `listProperties` + `getPublishedAreas` cached, tag `"properties"`, page clamped. Shared `PropertyCard` (`cta="details"`, `data-tag`). Empty state + Clear filters + Make a request. `generateMetadata` e.g. "Properties for rent in Lagos". `/properties` removed from `UNBUILT_ROUTES`; breadcrumb and "All properties" on the property page work. Reduced-motion transitions now `0s` (see ui-context). |
| 6 | Property detail: gallery, lightbox, facts, documents, **map**, similar, JSON-LD | done | `property.html` | Done 2026-11-11 (before Unit 5, at the owner's request). `app/(site)/properties/[slug]/page.tsx`: `generateStaticParams` (published slugs, placeholder if none), cached reads (tag `"properties"`): `getPublishedPropertySlugs`, `getPropertyBySlug`, `getPropertyRedirect`, `getSimilarProperties`. **`proxy.ts`** decides the status before the shell streams (Cache Components sends a 200 shell first, so `notFound()`/`permanentRedirect()` in the page can't set it): published → page, SlugRedirect → 308, unknown/draft → 404 (`resolvePropertySlug`, two indexed lookups per request). Unit 12 adds Clerk to the same `proxy.ts`. `components/site/property/`: `gallery.tsx` (1 big + 4, "View all N photos" on the last tile, 0 photos → navy house panel, 1 photo → wide tile; lightbox dialog: arrows, ←/→, Esc, swipe, "1 / N", focus trap + return), `share-button.tsx` (navigator.share → clipboard "Link copied"), `sections.tsx` (hero + breadcrumb, head, facts/features/documents/nearby only when present, map via `lib/maps.ts`, enquiry card `id="enquire"` with `EnquiryForm` `card` variant (disabled until Unit 7), mobile bar, similar). Helpers + `RealEstateListing` JSON-LD (area + city, price only when public) in `lib/property-detail.ts` (tested). CSP + security headers in `next.config.ts`. `/properties/*` removed from `UNBUILT_ROUTES`. E2E: `property.spec.ts` all pass except the Unit 7 enquiry test (`test.fixme`); `public.spec.ts` passes for the property page; its 10 "loads cleanly" failures are the unbuilt `/properties`, `/invest`, `/about`, `/blog`, `/contact` (404). Deviations (contrast, see Q27): WhatsApp text buttons `#15803D`, "Verified" text `#14703A`. Mobile gallery shows 3 tiles with no "View all" chip, as in the design. |
| 7 | Enquiries: form component, server action, rate limit, Resend email, WhatsApp links (used on home, property, invest and contact) | done | `property.html`, `contact.html` | Done 2026-11-12: `lib/actions/enquiry.ts` `createEnquiry` (Zod → rate limit 5/h per `sha256(ip+IP_HASH_SALT)` counted in DB → published property/plan check → **save** → Resend email → `emailSentAt`; friendly messages only). `lib/email/` (only `resend` importer): `enquiry-template.ts` (HTML + plain text, subject `New enquiry: <interest> — <name>`, links via `NEXT_PUBLIC_SITE_URL`), `enquiry.ts` (never throws). `components/site/enquiry-form.tsx`: `useActionState`, errors under fields (`aria-describedby`), focus first invalid, `role="status"` success, pending/no double submit, honeypot `company`, `startedAt`; props `source`, `propertyId`, `planId`, `interest` for Units 8/9. Wired on home + property; "Form goes live soon" removed. Newsletter: `lib/actions/subscribe.ts` (upsert, honeypot). DB writes in `lib/db/mutations/enquiries.ts`. Playwright loads `.env.test` (Q29). Tests: 16 unit (action on test branch with mocked email, template, subscribe), `tests/e2e/enquiry.spec.ts`, property enquiry e2e re-enabled. |
| 8 | Contact page with **map** | done | `contact.html` | Done 2026-11-12: `app/(site)/contact/page.tsx` — `PageHero` + sheet; `ContactCards` (email/phone/WhatsApp from settings, placeholder + hidden button when unset; WhatsApp message "Hi Verity, I'd like to make an enquiry"; directions via `mapsLink(mapQuery)`); `EnquiryForm variant="contact"` (soft pills, first + last → `name`, interest select incl. Listing my property, source CONTACT_PAGE) in `#message`; `OfficeMap` (`mapEmbedUrl(mapQuery, 14)`, grayscale, map card, Open in Maps; only `officeDisplay`, so the full address shows only when `showFullAddress`). `/contact` out of `UNBUILT_ROUTES`; header "WhatsApp us" → wa.me or `/contact#message`; "Make a request" / "Book a consultation" → `/contact#message`. WhatsApp text buttons use `--whatsapp-button` (design green fails contrast). Tests: `tests/e2e/contact.spec.ts`, `tests/unit/contact-cards.test.ts`. |
| 9 | Invest page: plans and FAQs from the database | done | `invest.html` | Done 2026-11-12: `app/(site)/invest/page.tsx` — `PageHero` + sheet (how-it-works split + navy steps), plans section (navy; highlighted = gold card; rate only when > 0 else placeholder; `formatNaira`, tenure months, `PAYOUT_LABEL`; disclaimer directly under the plans), FAQ (`getFaqs("INVEST")`, native `<details>`, sticky heading, hidden if none), `#start` investment enquiry (`EnquiryForm variant="invest"`: plan select + "Not sure yet", amount → `amountKobo`; "I want to invest" preselects the plan via `lib/invest-plan-select.ts`). Plan cards + steps extracted to `components/site/invest/plans.tsx` and shared with the home section (copy stays in `lib/invest.ts`). `getFaqs` cached, tag `"faqs"`. `/invest` out of `UNBUILT_ROUTES`. No FAQPage JSON-LD yet (answers are sample text) — **Unit 20**. Tests: `tests/e2e/invest.spec.ts`, `invest-copy.test.ts` now covers the page. |
| 10 | About page (+ `/privacy`) | done | `about.html`, `post.html` | Done 2026-11-12: `app/(site)/about/page.tsx` — `PageHero` + sheet story split (dusk + building, company-story placeholder), values `MarqueeBand` (Honesty ✦ Clarity ✦ Care), three value cards, CEO (`CeoSection`, shared with home via `components/site/ceo.tsx`; full-bio + promise placeholders, **no DB field — Q4 open**), CAC trust card (`companyName`, `rcNumber`, `officeArea` from `getSiteSettings()`; `officeArea` added to the view), partner strip (`PartnerMarquee`, shared with home; published + consented only, hidden if none), navy CTA (Contact us → `/contact#message`, View properties → `/properties`). Sections in `components/site/about/`. `/privacy`: `PageHero variant="post"` + sheet + `.article`/`.prose` (now global, for Unit 11), **draft** notice from what the code does (`components/site/privacy/privacy-notice.tsx`), visible draft banner, owner placeholders (retention, response time, data location), email from settings or placeholder (Q39). `/about` + `/privacy` out of `UNBUILT_ROUTES`. No Organization JSON-LD here — **Unit 20** puts it in the root layout. Mobile CTA box stacks (deviation, Q38). Tests: `tests/e2e/about.spec.ts`, `/privacy` in `public.spec.ts`, `tests/unit/about-privacy.test.ts`; `scripts/e2e-test-settings.ts` now adds two non-public `[E2E]` partners on the test branch. |
| 11 | Blog list and post page (Markdown) | done | `blog.html`, `post.html` | Done 2026-11-12: `/blog` — `PageHero` + sheet; `BlogBrowser` inside `<Suspense>` (◐) renders from the URL: `?category=` pills (links, `aria-current`), `?q=` (title + excerpt, case-insensitive, `next/form` GET), 6/page pager (page clamped), empty state "No articles found" + See all articles; sidebar (search, recent 3, categories with published counts, invest CTA). Params parsed per param in `lib/validation/blog-filters.ts` (never throws). `/blog/[slug]` — `generateStaticParams`, post hero (`PageHero variant="post"` over the cover, gold category tag, `formatDate` · reading time), Markdown body (`components/site/blog/markdown.tsx`: react-markdown 10.1.0 + remark-gfm 4.0.1, `skipHtml`, default `urlTransform`, external links `target=_blank rel="noopener noreferrer"`, `#` demoted to h2, images via next/image only for same-site paths / `MARKDOWN_IMAGE_HOSTS`, else skipped), share (WhatsApp `whatsappShareLink` title + URL, email, native share with copy fallback), author box (CEO photo only for Esther), 2 related (same category first, then newest). `proxy.ts` now resolves `/blog/:slug` too (308 from `SlugRedirect` POST, 404 for draft/unknown). Article JSON-LD + `generateMetadata` (canonical, OG image from the cover). All post reads cached, tag `"posts"`. Home latest posts + post-page "More articles" share `PostsSection` (`components/site/post-cards.tsx`). `UNBUILT_ROUTES` now empty. Tests: `tests/e2e/blog.spec.ts`, `/blog/<seeded slug>` in `public.spec.ts`, `tests/unit/markdown.test.ts` + `blog.test.ts`; fixtures in `scripts/e2e-test-settings.ts` (5 older posts, raw-HTML post, draft, old-slug redirect). Deviation: Q40. |
| 12 | Admin auth: Clerk, `proxy.ts`, `/admin/sign-in`, `requireAdmin()`, admin layout | done | `admin.html` (shell) | Done 2026-11-12: `@clerk/nextjs@7.9.25`. Clerk confined to `lib/auth/` (ESLint `no-restricted-imports` on `@clerk/*` elsewhere): `index.ts` (`requireAdmin()` → redirect to sign-in when signed out, throws `ForbiddenError` (403) without `publicMetadata.role === "admin"`; `isAdmin()`; `getAdminUser()`), `proxy.ts` (`clerkMiddleware` for `/admin/*` only: signed out → 307 to `/admin/sign-in?redirect_url=…`, non-admin → HTTP 403 with the `/admin/no-access` page, URL unchanged — Next ignores a rewrite's `status`, so page loads fetch the static no-access page and return it as 403; RSC/Server Action requests keep the rewrite; sign-in + no-access open), `roles.ts` (pure, tested: role from session claims `metadata.role`, else one Backend API user lookup), `components.tsx` (`AuthProvider`, `SignIn`, `SignOutButton`, `UserButton`). Root `proxy.ts` dispatches `/admin` to Clerk, slugs as before. `ClerkProvider` in `app/admin/layout.tsx` only (Q42, approved) + `robots noindex`. `app/admin/sign-in/[[...sign-in]]` (`<SignIn path routing=path fallbackRedirectUrl=/admin>` in `<Suspense>`, navy screen + logo, no sign-up link), `app/admin/no-access` (403 page with "Sign out" → `/admin/sign-in`). `app/admin/(panel)/layout.tsx`: `<Suspense>` gate → `requireAdmin()` → `AdminShell` (sidebar from `lib/admin-nav.ts`, drawer ≤860px with Esc/backdrop/`inert`, topbar with Lagos-time greeting + `UserButton`); `/admin` is a placeholder until Unit 13. Tests: `tests/unit/admin-auth.test.ts`; `admin.spec.ts` (projects `admin-desktop`/`admin-mobile`, after `admin-setup`): signed-out redirects, sign-in form, "public pages make no Clerk requests", signed-in admin (shell, sidebar, topbar, desktop sidebar, mobile drawer Esc/tap-outside), viewer 403 at `/admin` + `/admin/enquiries`, viewer sign-out. Clerk test users via `@clerk/testing@2.2.55` (TESTING.md §6; ticket sign-in because password sign-in stops at Clerk Client Trust). Compared with `admin.html` at 1440/390: shell line-height set to `normal` like the design (topbar 77px, nav rows 44px), footer link underline restored; mobile user menu was hidden by `.user span` (fixed). Dashboard content, "Add property" and the Enquiries count badge are Unit 13. Playwright `PW_PORT` added (e2e server on another port when `npm run dev` holds 3000). |
| 13 | Admin dashboard | done | `admin.html` | Done 2026-11-12: `lib/db/queries/admin.ts` (`getDashboardStats`, `getNewEnquiryCount`, `getLatestEnquiries`, `getSetupStatus` — each calls `requireAdmin()`, none cached; `requireAdmin()`'s check is now `React.cache`d per request). `lib/admin-dashboard.ts` (pure, tested): `BUILT_ADMIN_ROUTES` (only `/admin` so far — **add each admin route in the unit that builds it**; until then quick actions, "Add property" and checklist links show "Coming soon"), `QUICK_ACTIONS`, `enquiryHref` (`/admin/enquiries?id=`), `enquirySubject`, `setupChecklist` (WhatsApp, email, a non-`[SAMPLE]` published property, privacy reviewed = `lib/privacy.ts` `PRIVACY_REVIEWED`, which also drives the /privacy Draft banner). `components/admin/dashboard/` (Server Components): 4 stat cards (links to `/admin/enquiries`, `/admin/properties` ×2, `/admin/plans`), latest 5 enquiries (badge + time ago, empty state), quick actions, "Before you launch" checklist (hidden when complete), top-bar Add property (icon-only ≤860px). Sidebar NEW-count badge from the panel layout (refreshes on full load / layout re-render; Unit 16's status actions must `revalidatePath("/admin", "layout")`). Design's "Sample data" alert removed (owner). Crumb is one line with ellipsis at 390. `lib/format.ts` `timeAgo`. Tests: `tests/unit/admin-dashboard.test.ts` (14: helpers, empty-state/checklist fixture renders, every query calls `requireAdmin()`, stats = direct counts); `admin.spec.ts` dashboard block (stats/latest/badge/checklist vs the TEST database with `toPass`, Coming soon, one-line greeting) — 46 passed, 2 skipped (viewport-only). Compared with `admin.html` at 1440/390. |
| 14 | Admin properties list + editor (fields, documents, featured/showcase) | done | `admin-properties.html`, `admin-property-edit.html` | Done 2026-11-12: `react-hook-form@7.91.0`, `@hookform/resolvers@6.0.2`, `sonner@2.0.8`, `@vercel/blob@2.8.2` (newest releases ≥ 2 weeks old). `lib/validation/property.ts` (form input ↔ DB output, shared by form + actions; clears fields that don't apply: beds/baths for land, period outside rent, completion date outside off-plan, project status without showcase; `publishIssues`). `lib/actions/property.ts`: create/update/publish/unpublish/delete — Zod → `requireAdmin()` (non-admin → friendly error, signed-out redirect rethrown) → write (`lib/db/mutations/properties.ts`) → `updateTag("properties")` + `revalidatePath` (/, /properties, old + new detail slugs, /admin layout). Slug: `uniqueSlug` on create, editable; renaming a PUBLISHED slug upserts a `SlugRedirect` (chains re-pointed, a redirect from the new slug dropped); delete removes redirects to it. `publishedAt` set the first time. `lib/storage` `remove()` (Blob only, skips `/samples/`, `blobEnv()` read only when needed; ESLint confines `@vercel/blob` to lib/storage). `lib/db/queries/admin-properties.ts` (`listAdminProperties` with tab counts within search/type, `getAdminProperty` incl. private address; both `requireAdmin()`, uncached). List `/admin/properties` (tabs, search, type filter, pager in the URL; table scrolls in its box; delete dialog names the property; empty states). Editor `/new` + `/[id]` (`components/admin/properties/`): every field, ₦ input with separators as she types, features chips, documents (add/remove/rename/verified), nearby places, lat/lng inputs (map picker + photo upload are Unit 15 — panels show “comes next”, existing photos read-only), featured/showcase + project status, SEO + Google preview; error summary in the Publish panel links to fields; first invalid field focused; sonner toasts; unsaved-changes warning; Preview on site (drafts: disabled with tooltip). Element ids are scoped per editor (`useId`) because Next keeps the previous page mounted hidden. Dashboard “Add property”/quick action now live. Tests: `property-validation` (18), `property-actions` (15, mocked auth/db), `storage` (3); e2e `admin-properties.spec.ts` (create → 404 → publish → live + on /properties → rename → 308 → unpublish → 404 → delete; validation focus; hidden fields; list filters; list delete) + viewer 403 on both pages. Compared with both designs at 1440/390. |
| 15 | Admin property photos (Blob upload, reorder, alt text, delete) and **map picker** (Leaflet) | done | `admin-property-edit.html` | Done 2026-11-13 (e2e rerun passed, Q48): `leaflet@1.9.4`, `react-leaflet@5.0.0`, `@types/leaflet@1.9.22`. **Photos:** `app/api/blob/upload/route.ts` (401 signed out / 403 non-admin, then `lib/storage` `handlePhotoUpload` → `handleUpload`; `requireAdmin()` + property exists + < 20 photos in `onBeforeGenerateToken`; JPEG/PNG/WebP, 10 MB, `addRandomSuffix`; only `[e2e/]properties/<id>/…`; no `onUploadCompleted`). The browser resizes (`lib/image-resize.ts`: ≤ 2400 px, WebP or JPEG at 0.82; undecodable → “This photo format isn't supported…”), uploads (`lib/storage/client.ts`), then saves the row with `addPropertyPhoto` (Zod: Blob URL in the property's folder → `requireAdmin()` → insert at the end). Order, alt text and removals are form fields saved by `updateProperty` (`syncPhotos`; removed rows' Blob files deleted after the commit — leaving without saving loses nothing). New properties: “Save the draft first to add photos” (chosen over auto-creating drafts). `components/admin/properties/photos-field.tsx`: drop zone (click, Enter/Space, drag), per-file progress, max 20, Cover badge, drag + up/down reorder, alt text + empty-alt warning. `/api/blob/*` runs `clerkMiddleware()` without redirects (proxy matcher). `next.config.ts` `images.remotePatterns` allows `*.public.blob.vercel-storage.com` (no CSP img-src/connect-src exists, so nothing else needed). `BLOB_PATH_PREFIX` (optional; Playwright sets `e2e/`). **Map:** `map-picker.tsx` via `next/dynamic` (ssr: false), OSM tiles + attribution, gold `divIcon` pin; click/drag → lat/lng (6 decimals), typing moves the pin; “Centre on area” → `geocodeArea` server action → `lib/geocode.ts` (Nominatim, descriptive User-Agent + Referer, queued ≥ 1.1 s apart, friendly errors). Tests: `property-photos` (12), `photo-actions` (12), `property-actions` (+2: Blob removal on save); e2e `admin-photos.spec.ts` — upload/reorder/alt/remove flow passed on desktop + mobile against the public Blob store; map, save-first, HEIC, viewer 403, signed-out 401 passed. Also: admin access check calls `connection()` (removed a runtime prerender warning on `/admin`); Clerk test sign-in waits for `clerk.loaded`, setup project retries once. Blob store must be **public** (the first store was private). |
| 16 | Admin enquiries inbox (status, notes, CSV export) | done | `admin-enquiries.html` | Done 2026-11-13: `/admin/enquiries` — status tabs with live counts (within search + interest), search (name, phone incl. "0803…" → stored 234…, email, message), interest filter, page and `?id=` in the URL (`lib/validation/admin-enquiry-filters.ts`); newest first, 20 a page; `lib/db/queries/admin-enquiries.ts` (`requireAdmin()`, uncached). Table: name (bold when NEW, stretched row link), interest + “via <source>”, property (→ its admin editor) / plan (plain text until Unit 17), status badge, time ago with Lagos date on hover. Detail panel: initials, phone (tel:), email (mailto: if given), interest, property/plan with public link, inspection, amount (`formatNaira`), source, received, message; WhatsApp (`whatsappReply` → “Hi <first name>, thank you for your enquiry about <property / the <plan> plan / Verity Homes>.”), Call, Email; Mark contacted / Close / Reopen (`lib/actions/enquiry-admin.ts`: Zod → `requireAdmin()` → write → `revalidatePath("/admin", "layout")` so the sidebar badge and dashboard update); private note saved on blur with “Saved”. Opening never changes status. ≤ 860 px: full-screen panel with Back. CSV: `app/api/admin/enquiries/export/route.ts` (401/403, filtered rows, BOM, CRLF, Lagos time, quotes commas/quotes/newlines, formula guard `'` before = + - @ tab CR — `lib/enquiry-inbox.ts`). `/api/admin/*` runs Clerk without redirects (proxy matcher). Tests: `enquiry-inbox` (10), `enquiry-admin-actions` (11); e2e `admin-enquiries.spec.ts` (filters/search, details, contacted/close/reopen + badge, note persists, CSV + formula guard, mobile full-screen + Back, viewer 403 page + CSV, signed-out CSV 401). Compared with `admin-enquiries.html` at 1440/390. |
| 17 | Admin: plans + FAQs | done | List/editor pattern | Done 2026-11-13: `/admin/plans` (list in /invest order — minimum, rate or “Not set”, tenure, payout, status, ★ Highlighted; drag + ↑↓ reorder saves sortOrder; edit / delete with a dialog that counts the enquiries mentioning the plan), `/admin/plans/new` + `/[id]` (property-editor pattern: RHF + `lib/validation/plan.ts`; ₦ minimum with separators, rate 0–100 / 2 dp, tenure, payout, highlighted switch with a note naming the current gold card; Save draft / Publish / Unpublish; disclaimer shown read-only). One highlight only: `clearOtherHighlights()` in the same transaction. `/admin/faqs` (Invest / General groups, inline add + edit, publish, reorder, delete). “guarantee/guaranteed/guarantees” refused in plan name/badge/summary and FAQ question/answer (`lib/validation/no-guarantee.ts`). Actions `lib/actions/plan.ts`, `lib/actions/faq.ts`: Zod → `requireAdmin()` → write → `updateTag("plans"/"faqs")` + `/`, `/invest`. Shared admin pieces: `components/admin/delete-button.tsx` (was the property delete button), `components/admin/reorder.tsx`, `lib/reorder.ts`. Sidebar: FAQs under Investment plans; quick action live; inbox plan names → `/admin/plans/<id>`. /invest FAQ answers keep single line breaks (`white-space: pre-line`). Tests: `plan-faq` (10), `plan-faq-actions` (23); e2e `admin-plans.spec.ts` (site-wide plan + FAQ flows run serially on desktop and restore the gold card/order in a `finally`); `invest.spec`/`home.spec` plan checks now read the DB at comparison time. |
| 17b | Plot options for estate listings (plots with price + deposit, payment plan / offer / terms notes, developer) | done | `property.html` (+ admin editor pattern) | Done 2026-11-14: migration `20261113204020_plot_options` (additive): `PropertyPlot` (cascade) + `Property.developerName/paymentPlan/offerNote/offerEndsAt/termsNote` + `Enquiry.plotId` (SetNull). `formatListingPrice` (“From ₦…” = cheapest plot), `lib/plots.ts` (size range “300–1,000 sqm”, “Initial deposit from ₦…”, plot names, enquiry/WhatsApp texts, `isOfferActive`). With plots the save sets `priceKobo` = cheapest plot and turns “price on request” off, so sorting uses the lowest price; the `/properties` price filter matches when **any** plot is in range (so min ₦25M still finds an ₦18M–₦70M estate — the brief's test wins over “use the lowest price” for filtering). Plots are synced by id, keeping enquiry links. Property page: “Choose your plot” under the facts strip (table; stacked cards ≤ 700 px), Select → enquiry message + hidden `plotId` + WhatsApp text (`lib/plot-select.ts` event), terms box (payment plan, offer until `offerEndsAt` — dropped from cached data and re-checked in the browser, terms), head “From ₦…” / deposit / “A development by …”, facts “Plot sizes”, JSON-LD price = lowest. Enquiry action keeps a `plotId` only if it belongs to that published property; the inbox shows the plot (table, detail, WhatsApp reply, CSV). Admin editor: “Plot options” (add/edit/remove/↑↓; size > 0, price > 0, deposit ≤ price) and “Development & offer” panels; single price disabled with a note while plots exist; “guarantee” check on all new text. Seed: “[SAMPLE] Palm Estate Plots” with the owner's 4 plot sizes/prices (names are samples — the real Zylus listing is entered in the admin). The TEST DB got the migration (`migrate deploy`) and the sample estate added non-destructively (Prisma blocks `migrate reset` from an AI agent); the dev DB has the migration but not the sample estate (run `npx prisma db seed` to add it — it wipes sample data). Tests: `plots` (10), `property-actions` (+1), `enquiry-action` (+1, DB); e2e `admin-plots.spec.ts`. Compared the estate page with `property.html` at 1440/390. |
| 17c | Investment plan packages (invest X → receive Y) + plan pages `/invest/[slug]`; summary cards on home and /invest | done | `invest.html` (+ Unit 17 admin pattern) | Done 2026-11-14: migration `20261114090000_investment_packages` (additive + slug backfill for existing plans): `InvestmentPackage` (cascade; synced by id so `Enquiry.packageId` (SetNull) survives edits), plan `slug` (unique), `description` (Markdown), `partnerName`, `contractWith`, `payoutTerms`, `exitTerms`, cover fields; `RedirectEntity.PLAN`. `lib/invest.ts`: gain = receive − invest (kobo, never rounded), % per year = ((r/a)^(12/t) − 1) × 100 to 1 dp (₦30M→₦32.5M/12 mo = 8.3%), “from” = smallest package; `lib/packages.ts` texts. Home + /invest: summary cards only (name, badge, “Invest from ₦…”, tenure, payout, one line, “View plan”; gold card + disclaimer kept). `/invest/[slug]`: hero, partner + “Your agreement is with …”, package table (You invest / You receive (expected) / Gain / Per year / Select; stacked cards on phones), Markdown description, payout & exit terms, disclaimer, Invest FAQs, enquiry form (source INVEST_PAGE, plus a Message field on plan pages). Select → message “I'm interested in the ₦20,000,000 package (receive ₦21,000,000 after 12 months) — <plan>.”, amount, hidden `packageId`, scroll to the form, WhatsApp text names the package. Unknown/draft slug → 404; slug change → PLAN redirect (proxy 308); `generateMetadata` per plan; no FAQPage/financial JSON-LD. Admin editor: “Plan page” panel (web address auto from name, partner, agreement with, description, payout/exit terms) and “Packages” panel (add/edit/remove/↑↓, live “Gain ₦… · x.x% per year”; receive > invest, tenure 1–120); old minimum/rate/tenure disabled with a note while packages exist; publish needs ≥1 package, web address, agreement with and payout terms (checked in the editor and in `publishPlan`/`updatePlan`). “guarantee” check on all new text. Inbox shows the package (table, detail `enquiry-package`, WhatsApp reply, CSV). Seed: `[SAMPLE] 12-Month Plan` (₦10M→₦10.5M, ₦20M→₦21M, ₦30M→₦32.5M), packages synced by position; seeded TEST and dev with the safe seed. Tests: `plan-packages` (16, incl. 8.3%, from-amount, validation, publish rules, non-admin); e2e packages flow (`tests/e2e/helpers/plan-packages-flow.ts`, run in `admin-plans.spec.ts`'s serial group so two plan publishes can't race the /invest rebuild); plan cleanup now deletes only the test's own plans; invest/home specs updated for summary cards, plan page 404 and the seeded plan (3 rows, 8.3%, stacked on phones). Compared /invest and the plan page with `invest.html` at 1440/390; the disclaimer uses muted ink on the white plan page. |
| 18 | Admin: posts + categories (Markdown editor with preview, cover upload) | done | List/editor pattern | Done 2026-11-14: `/admin/posts` (All/Published/Drafts tabs with counts, search title/excerpt, category filter, page — all in the URL, `lib/validation/admin-post-filters.ts`; table: cover thumb, title + /blog/slug, category, status, published date, updated time ago, view-on-site (published) / edit / delete with a dialog naming the post; empty state “Write a post”). `/admin/posts/new` + `/[id]` (`components/admin/posts/`, property/plan editor pattern: RHF + `lib/validation/post.ts` shared with the actions): title, slug (/blog/ prefix; follows the title on create and is left to `uniqueSlug` if untouched), category select + inline “New category”, excerpt with counter (160 recommended, 300 max), author (default Esther Ezenagu), cover (resize + Blob upload via the Unit 15 route into `posts/<id>/`, replace/remove, alt text required to publish), Markdown body with Write/Preview tabs (Preview = `components/site/blog/markdown.tsx`, the public renderer), toolbar (heading, bold, italic, link, list, quote, Ctrl+B/I/K; `lib/markdown-format.ts`) and Insert image (Blob `posts/<id>/inline/`, alt-text dialog, `![alt](url)` at the cursor), live reading time (`lib/post-content.ts`, 200 wpm, min 1), SEO title/description + Google preview, Save draft / Publish / Unpublish / Save changes, error summary, unsaved-changes warning. Publish needs title, slug, category, excerpt, cover + alt, ≥ 100 words (`postPublishIssues`, editor + action); `publishedAt` set once. `lib/actions/post.ts` (create/update/publish/unpublish/delete) + `lib/actions/category.ts`: Zod → `requireAdmin()` → write → `updateTag("posts")` + `/`, `/blog`, `/blog/<slug>`. Published slug change → `SlugRedirect` POST (chains re-pointed). Save deletes unused files in the post’s Blob folder (old cover, images removed from the body, uploads never inserted); delete removes cover + folder (Blob only, never /samples/). Body links/images with javascript:/vbscript:/data: refused. Upload route generalised (`handleImageUpload`, `uploadTargetFromPathname`: property or post folder). `/admin/categories`: add, inline rename (slug follows), alphabetical (Q40), delete only when no post uses it (“Move N posts first”, enforced in the action’s transaction). Sidebar: Categories under Blog posts; dashboard “Write a blog post” live. Q23 closed for posts (`MARKDOWN_IMAGE_HOSTS` = Blob host). Tests: `post-content` (reading time, unsafe links, unreferenced images, toolbar, paths, Blob host), `post-validation` (publish rules, excerpt, slug, alt, javascript:), `post-actions` (every action rejects non-admins; tags, sweep, delete, blocked category); e2e `admin-posts.spec.ts` (full draft → cover + inline image → 404 → publish → /blog + home → post page image + reading time → Preview HTML = public HTML, no script → rename 308 → inline image removed → Blob file gone → unpublish 404 → delete → cover gone; categories flow; list filters; validation; viewer 403); `admin.spec` viewer 403 on the 3 new routes. Teardown sweeps “[SAMPLE] E2E” posts/categories. Compared with admin-properties / admin-property-edit at 1440/390. Choices: Q55. |
| 19 | Admin: testimonials, partners, site settings, newsletter subscribers | todo | List/editor pattern | Split per entity if large. **Settings form must warn against putting a private street address in `mapQuery` unless `showFullAddress` is on (Q37).** |
| 20 | SEO: metadata, OG images, sitemap, robots, JSON-LD, slug redirects | todo | — | Add FAQPage JSON-LD to /invest once the FAQ answers are real (Unit 9 left it out: sample text). |
| 21 | QA and launch: full Playwright suite, axe, Lighthouse, Vercel production, domain DNS | todo | All | |

## Completed (before coding)

- CAC registration: Verity Homes and Properties Ltd, RC 9971213,
  registered 28 Oct 2026.
- Design references for all pages are in `design/`.
- Brand kit is in `brand/`: logos, favicons and the social profile image.
- Stack chosen: Next 16, TypeScript, Tailwind 4, shadcn (admin), Neon,
  Prisma 7, Clerk, Vercel Blob, Resend, Vercel, Vitest and Playwright.
- Domain: `verityhomes.com.ng`.

## Open questions

1. Phone and WhatsApp number.
2. Business email (`info@verityhomes.com.ng` once email hosting is set up). **Still open:**
   `ENQUIRY_NOTIFY_TO` is temporarily the owner's Resend sign-up address (Unit 7).
3. Office address display: show only "Onipanu, Lagos", or the full
   address? The registered address is also the CEO's home address.
4. Esther's bio and her one-line promise to clients.
5. Investment plans:
   - names, minimum amounts, return rates, tenures and payout schedules
   - approved disclosure wording, after legal/SEC review
6. Investment FAQ answers, specifically partners, payouts and early exit.
7. Partner names and logos, and permission to show them (AY Homes and
   others).
8. Real testimonials, with each client's consent.
9. Real listings: photos, prices, areas, coordinates and title documents.
10. Signature projects for the home showcase: names, areas and status.
11. Admin users: Esther only, or staff too? (Unit 12: access is any Clerk user with
    `publicMetadata.role = "admin"`; sign-ups must be restricted in the Clerk dashboard.)
12. Who owns the Clerk, Neon, Vercel and Resend accounts? Use a company
    email.
13. `.env.local` has the real Neon values and `IP_HASH_SALT`. Clerk dev keys added 2026-11-12
    (Unit 12). `.env.test` is clean. Still to tidy: the two placeholder Clerk lines in
    `.env.local` (the later real line wins). Blob is still a placeholder (Unit 15).
14. ~~`seed.ts` failed typecheck on `titleDocument`.~~ Closed in Unit 2:
    the guard is now `"titleDocument" in data && data.titleDocument`.
15. ~~Privacy and Terms links.~~ Closed 2026-11-11: `/privacy` is built in Unit 10 as a
    prose page (draft text, marked for owner review). "Terms" is removed from the footer.
16. ~~Newsletter saving.~~ Closed 2026-11-11: saving `Subscriber` rows is part of Unit 7.
17. ~~next/font Manrope width.~~ Closed 2026-11-11: accepted as is, no change.
18. ~~public.spec.ts 404 console-error exception.~~ Closed 2026-11-11: approved.
19. ~~Home search "Budget" ranges.~~ Closed 2026-11-11 (Unit 4b): ranges per tab in
    `lib/search-ranges.ts`, sent as `min`/`max` in naira (no `max` for "Above"). **Provisional,
    owner to confirm** the figures:
    - Buy: Under ₦50M · ₦50M–₦150M · ₦150M–₦300M · ₦300M–₦500M · Above ₦500M
    - Rent (per year): Under ₦3M · ₦3M–₦6M · ₦6M–₦10M · ₦10M–₦20M · Above ₦20M
    - Land: Under ₦10M · ₦10M–₦30M · ₦30M–₦80M · Above ₦80M
    - Invest tab: no budget (goes to `/invest`).
20. ~~Unit 4a deviations.~~ Closed 2026-11-11: approved. Dark text-gold (`--accent-text`) for
    accent words on white/light sections; bright gold stays on navy. Unit 4b applies the same
    rule to the statement's "the truth." and the italic words of the white "Invest. Own. Live."
    band. The 4a deviations were:
    - Heading accent words (`.h2 em`) on light sections use `--accent-text` (#8A6A22)
      instead of #C8A24E, which is ~2.3:1 on white (fails contrast). Navy sections keep
      #C8A24E.
    - Search tabs use 16px side padding at ≤420px (design 20px), so the four tabs stay on
      one row at 390px with next/font's wider Manrope (see 17).
    - Card "Enquire" links go to `/properties/<slug>#enquire` (Unit 6 must give the
      enquiry card `id="enquire"`); hero/intro links go to real routes instead of
      on-page anchors.
21. ~~Statement scroll-fill contrast.~~ Closed 2026-11-11: accepted (design's `#D5D9E0` before
    a word fills), **on condition that every word is filled by the time the statement is
    mid-viewport.** `lib/scroll-fill.ts` now starts filling when the paragraph's top reaches 85%
    of the viewport and completes when its centre reaches 50% (the old maths stopped short).
    Checked by `tests/unit/scroll-fill.test.ts` and the motion-on test in `home.spec.ts`.
    Animated words are `aria-hidden` (sentence read once from `sr-only`), filled by CSS under
    reduced motion or without JS; the motion-on axe test excludes only those words.
22. ~~Unit 4b deviations.~~ Closed 2026-11-11: all approved —
    - Showcase shows the listing's facts ("3 bedrooms · 160 sqm · C of O") instead of a
      description line; "Enquire about this" → `/properties/<slug>#enquire`.
    - Services 4th photo is `villa.jpg` (design hotlinks Unsplash).
    - CEO eyebrow on cream uses `--accent-text-on-cream` (`#866720`; reuse on /about).
    - Testimonial arrows hidden when all cards fit; autoplay pauses on hover/focus; stars from
      `rating`, initial-letter avatar. Contact "Chat on WhatsApp" → the form until a number is
      set; 44px interest chips. Latest posts hidden when there are none.
23. Partner logos (Unit 19) and post covers (Unit 18) will be Blob URLs: add the Blob host to
    `images.remotePatterns` in `next.config.ts` in those units, or `next/image` will refuse them.
    **Unit 18 must also add it to `MARKDOWN_IMAGE_HOSTS` in `lib/blog.ts`** (Markdown images from
    other hosts are skipped).
    Noted by the owner 2026-11-11 — **to do in Units 18 and 19.**
    **Closed for posts (Unit 18, 2026-11-14):** `MARKDOWN_IMAGE_HOSTS` =
    `*.public.blob.vercel-storage.com` (one label, the same rule as `remotePatterns`, which
    already allowed it since Unit 15 — no `next.config.ts` change). Covers and inline images
    render on /blog, /blog/<slug> and the home latest posts (checked by `admin-posts.spec.ts`).
    **Still open for partner logos (Unit 19).**
24. ~~Unit 6 — WhatsApp e2e test vs. the seed.~~ Closed 2026-11-11: `npm run db:test:reset` ends with
    `scripts/e2e-test-settings.ts`, which sets the obviously fake `2340000000000` on the **test
    branch only** (refuses unless `ENV_FILE=.env.test`, refuses production, refuses if the host
    matches `.env.local`). Not in the seed, never in the dev DB. It runs before the e2e server
    because SiteSettings is cached (`cacheLife("max")`) and the page is prerendered — a
    `beforeAll` in the spec runs after Playwright's webServer has built, so it could not work.
25. **Unit 6 — order.** Unit 6 was built before Unit 5 at the owner's request. Unit 5 is next;
    `/properties`, the breadcrumb "Properties" link and "All properties" 404 until then (prefetch
    stays off for `/properties`).
26. **Unit 6 — CSP scope.** The new `Content-Security-Policy` only sets `frame-src`,
    `frame-ancestors`, `object-src` and `base-uri`. `script-src`/`style-src` need nonces for Next's
    inline scripts — revisit in Unit 21. Units 18/19 must not need CSP changes for Blob images
    (no `img-src` is set).
27. **Unit 6 deviations (owner to confirm).** Design colours fail WCAG AA, so: WhatsApp *text*
    buttons use `--whatsapp-button` `#15803D` (white text 5.0:1; design `#1FAF55` is 2.9:1), hover
    `#126E34`; the "Verified" tag text uses `--success-tag-text` `#14703A` (5.5:1; design 4.47:1).
    The round WhatsApp float keeps `#25D366`. The gallery tile with "View all N photos" is named
    "Open photo 5 of 5, view all 5 photos" (WCAG 2.5.3). `.link-arrow svg` is now sized globally
    (16px, as in the design).
28. ~~Local setup on this Mac.~~ Closed 2026-11-12: `PW_CHANNEL=chrome` makes
    `playwright.config.ts` and `scripts/compare-design.mjs` use the installed Google Chrome
    (Playwright's Chromium has no macOS 12 build); unset = bundled Chromium. Documented in
    `testing/TESTING.md`. `.env.local` now holds the dev-branch values.
29. ~~E2E server database.~~ Closed 2026-11-12 (Unit 7): `playwright.config.ts` loads `.env.test`
    itself (dotenv) and refuses to run if its `DATABASE_URL` is missing, a placeholder, or the
    same host as `.env.local`; it never reuses a server on :3000; e2e enquiry emails are forced
    to `delivered@resend.dev`. Documented in `testing/TESTING.md` §5.
30. ~~Rotate the Neon test-branch password.~~ Closed 2026-11-12: rotated by the owner and
    `.env.test` updated.
31. **`public/samples/ceo.jpg` is now 1.9 MB** (commit ddb7b51). `next/image` resizes it for
    visitors, but a smaller source (≤ 300 KB) would keep the repo and builds lighter.
32. ~~Home intro photos invisible (2026-11-12).~~ Fixed: `.reveal-img` never got `.in` because
    Chrome's IntersectionObserver measures the target after its own `clip-path` (ratio 0, and
    `isIntersecting` only while the clipped top edge is on screen). `RevealObserver` now
    observes each `.reveal-img`'s parent, and adds the `js` class itself (the inline script
    was removed) so a JS failure never leaves content hidden. Badge logo is all navy; the
    services title shift is gone. e2e in `tests/e2e/home.spec.ts` (motion on, scroll jump,
    reduced motion, app JS blocked, title alignment). Note: the static `design/` files use the
    same observer pattern, which is why `npm run compare` adds `.in` itself.
33. ~~Services items went blank when tapped (2026-11-12).~~ Fixed: `RevealObserver` added `in`
    with `classList`; tapping changed the item's className (active), React rewrote it and the
    item fell back to opacity 0. Replaced site-wide by `<Reveal>` / `RevealLink` /
    `useReveal` (state in React, classes rendered by the component, hiding classes only after
    hydration). The hero headline and statement no longer read `body.loaded` / `html.js`.
    e2e: "tapping each service…" (animations on; fails on the previous code, desktop and
    mobile).
34. **Resend is in testing mode (Unit 7, 2026-11-12).** No verified domain yet, so
    `ENQUIRY_FROM="Verity Website <onboarding@resend.dev>"` and mail can only go to the
    account's own address or Resend test inboxes; `.env.test` uses `delivered@resend.dev`.
    **Unit 21 must verify `verityhomes.com.ng` in Resend and switch `ENQUIRY_FROM` to
    `website@verityhomes.com.ng`** (Vercel env too). `emailEnv()` now rejects a malformed
    `ENQUIRY_FROM` (e.g. `<x@y>` with no name, which Resend refuses with 422).
35. **Vercel env for Unit 7.** Add `RESEND_API_KEY`, `ENQUIRY_FROM` (as above, with the name)
    and `ENQUIRY_NOTIFY_TO` to the Vercel project, or enquiries are saved with
    `emailSentAt = null` and the server logs name the missing variable.
36. ~~Contact e2e and settings states (Unit 8).~~ Approved 2026-11-12: test settings come from the reset fixture, not `beforeAll`. The settings a page shows are cached and
    prerendered at build, so an e2e `beforeAll` can't switch them. The fake phone, email,
    WhatsApp and a private `officeAddress` (with `showFullAddress=false`) are set by
    `scripts/e2e-test-settings.ts` (end of `npm run db:test:reset`; it can also be run alone
    with `ENV_FILE=.env.test npx tsx scripts/e2e-test-settings.ts`). The "nothing set" state is
    tested on the same component in `tests/unit/contact-cards.test.ts`.
37. ~~`mapQuery` is free text.~~ Agreed 2026-11-12: Unit 19's settings form must warn against a private street address in `mapQuery` (noted on the Unit 19 row). The contact map and directions use
    `SiteSettings.mapQuery` as typed. The admin settings form should warn not to put the
    private street address there unless `showFullAddress` is on.
38. **Unit 10 deviation (owner to confirm).** design/about.html's CTA box sets
    `grid-template-columns:1fr auto` inline, which overrides its own ≤960px rule, so at 390px the
    heading and text squeeze to one word per line beside the buttons. The app stacks text above
    the buttons on mobile (the design's `.contact-box` mobile rule). Desktop matches. The story
    photos keep the design's 540px height at every width (also an inline style there).
39. **Privacy notice — owner/legal review before launch.** `/privacy` is a plain-English DRAFT
    for the Nigeria Data Protection Act 2023, written only from what the code does, with a visible
    "Draft" banner. Owner/legal to confirm: lawful bases as worded, retention period, response
    time for requests, where Neon/Vercel/Resend store data and the cross-border safeguards,
    whether a DPO or registration with the NDPC is needed, and the privacy contact email (it uses
    `SiteSettings.email`, placeholder until set — see Q2). Update `PRIVACY_LAST_UPDATED` in
    `components/site/privacy/privacy-notice.tsx` and remove the banner once approved.
40. **Unit 11 deviation (owner to confirm).** Same pattern as Q38: design/post.html sets
    `grid-template-columns:1fr 1fr` inline on "More articles", overriding its own ≤900px rule, so
    at 390px the two cards squeeze titles to one word per line. The app stacks them on mobile;
    desktop matches. The design shows the cover only as the post hero photo (no second cover in
    the article), so the app does the same; `coverAlt` is used for the OG image alt.
    Category order on /blog is alphabetical (Category has no sort field; the design's order is
    Investing, Buying guide, Renting, Company news). Unit 18 can add ordering if wanted.
41. ~~Neon cold start in unit tests.~~ Closed 2026-11-13: database-backed unit tests now get
    30 s per test and 60 s per setup hook (`tests/unit/helpers/test-db.ts`
    `setDatabaseTimeouts()`, called by `assertTestDatabase()` and `queries.test.ts`); all other
    tests keep Vitest's 5 s. Measured from Lagos: first connection 1–2 s, a short transaction ~1 s.
42. ~~Unit 12 deviation: `ClerkProvider` wraps `/admin` only.~~ Closed 2026-11-12: approved by the
    owner. `admin.spec.ts` checks public pages make no Clerk requests and set no Clerk cookies.
43. ~~Signed-in admin not tested yet.~~ Closed 2026-11-12: Clerk dev-instance test users (admin +
    viewer) in `.env.test`; signed-in e2e tests on (TESTING.md §6). Shell compared with
    `admin.html` at 1440/390. Found and fixed: viewer got 200 (not 403), sign-out on the 403 page
    failed, mobile user menu hidden. The `E2E_CLERK_*` logins are in `.env.test` (Playwright still falls back to `.env.local` for
    those four names only).
44. ~~Clerk dashboard leftovers.~~ Closed 2026-11-12: app renamed "Verity Homes and Properties",
    Google sign-in off (email + password only), sign-ups Restricted, session token customised.
45. ~~Resend key in `.env.test` rejected.~~ Closed 2026-11-12: new key in `.env.local`, `.env.test`
    and Vercel; the home enquiry "sends" test passes on desktop and mobile.
46. ~~No shadcn/ui.~~ Closed 2026-11-12: owner decision — no shadcn/ui; keep porting the design's
    styles into CSS modules (`architecture.md`, `ui-context.md` updated).
47. ~~Unit 14 editor additions.~~ Closed 2026-11-12: all four approved (nearby places, showcase +
    project status, SEO fields, editable document rows; status badge + Publish buttons).
48. ~~Rerun required — Unit 15 e2e (network).~~ Closed 2026-11-13: rerun on a steady connection —
    `npm run check` 237/237; `admin-properties`, `admin-photos`, `property` and `properties` specs
    43 passed, 1 skipped (mobile-only test on desktop), 0 failed, including the four that had
    failed. Two rows left by the interrupted runs were removed, and a Playwright
    `globalTeardown` (`tests/e2e/setup/global-teardown.ts`) now sweeps "[SAMPLE] E2E …"
    properties and `e2e/` Blob files after every run. Still to do: save the real
    `BLOB_READ_WRITE_TOKEN` in `.env.test` (Playwright falls back to `.env.local` meanwhile).
49. ~~Unit 16 choices.~~ Closed 2026-11-13: approved — Reopen → Contacted.
50. ~~Old test rows in the test database.~~ Closed 2026-11-13: `property.spec.ts` now names its
    enquiry “[SAMPLE] E2E Playwright Tester”, so the global teardown sweeps it after every run.
    Leftover count before: 0, after: 0 — the 18 old “Playwright Tester” rows were already gone
    from the TEST database when Unit 17 started (removed outside the app; no code deletes them).
51. **General FAQs aren't shown anywhere yet.** `/admin/faqs` manages both groups, but only the
    Invest FAQs appear on the site (/invest). Owner to decide where General FAQs should go
    (e.g. /contact or a /faq page) — a later unit.
52. ~~Unit 17b decisions.~~ Closed 2026-11-14: approved by the owner — the `/properties` price
    filter matches a listing when **any** plot is in range (sorting uses the cheapest plot);
    `[SAMPLE]` names in the seed (the real estate listing is entered in the admin); plot ids are
    preserved on edit so enquiries keep their plot link.
53. ~~Seed wiped real content.~~ Fixed 2026-11-14 (commit “Fix: seed only touches [SAMPLE]
    data”): the dev database is also the live site's, and the seed used to `deleteMany()` every
    property, post, plan, FAQ, testimonial, partner and enquiry. It now upserts its `[SAMPLE]`
    rows by key and removes only stale `[SAMPLE]` rows (`prisma/seed-lib.ts`), never SiteSettings,
    Subscribers, categories or non-`[SAMPLE]` rows; a real enquiry about a sample listing is kept
    (deviation from “delete enquiries that reference them”, to avoid losing a visitor's details —
    approved by the owner 2026-11-14).
    Seeded the dev DB once afterwards: only `[SAMPLE] Palm Estate Plots` (+4 plots) was added;
    every other count unchanged.
54. **Legal/SEC review of investment plans before publishing real figures.** Plan pages show
    package amounts, the expected amount at maturity, gain and an annualised “% per year”. Before
    any real plan (non-`[SAMPLE]`) is published, the owner should have the plan terms, wording
    and figures reviewed by a lawyer and checked against SEC Nigeria rules on investment
    offers. Plan pages deliberately carry no FAQPage or financial JSON-LD.
55. **Unit 18 choices (owner to confirm).** Conservative picks where the brief was open:
    - A new post must be saved once before a cover or body image can be added (“Save the draft
      first…”), the same choice as property photos (Unit 15): images live under `posts/<id>/`.
    - On save, every file in the post's Blob folder that is neither the cover nor mentioned in the
      body is deleted — old covers, images removed from the body, and uploads that were never
      inserted. Leaving the editor without saving deletes nothing.
    - Insert image needs alt text before it goes in (the dialog won't insert without it); the
      cover's alt text is required to publish. The body is not checked for images without alt.
    - Besides `javascript:`, `vbscript:` and `data:` link/image addresses are refused too.
    - Excerpt: 300 characters at most; the counter recommends 160 and warns above it.
    - A category can't be deleted while **any** post (drafts too) uses it.
    - The full publish e2e flow runs on desktop only (a published E2E post briefly shows on /blog
      and the home page; one at a time keeps the other public specs stable).
