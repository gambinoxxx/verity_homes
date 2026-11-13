# Progress Tracker

Status: `todo` · `in progress` · `done` · `blocked`

Each unit has a matching prompt in `prompts/PROMPTS.md`.

## Current focus

**Public site complete** (Units 1–11). Units 12–13 (admin auth, dashboard) done. Next: **Unit 14 — admin properties list + editor**.

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
| 14 | Admin properties list + editor (fields, documents, featured/showcase) | todo | `admin-properties.html`, `admin-property-edit.html` | |
| 15 | Admin property photos (Blob upload, reorder, alt text, delete) and **map picker** (Leaflet) | todo | `admin-property-edit.html` | |
| 16 | Admin enquiries inbox (status, notes, CSV export) | todo | `admin-enquiries.html` | |
| 17 | Admin: plans + FAQs | todo | List/editor pattern | |
| 18 | Admin: posts + categories (Markdown editor with preview, cover upload) | todo | List/editor pattern | |
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
41. **Neon cold start in unit tests.** The first DB-backed unit test after the test branch has
    been idle can exceed Vitest's 5 s timeout (seen twice: enquiry-action, subscribe-action); a
    rerun passes. Not changed in Unit 11. Options: a warm-up query in `tests/setup/env.ts`, or a
    longer `testTimeout` for DB tests only — owner/reviewer to choose.
42. ~~Unit 12 deviation: `ClerkProvider` wraps `/admin` only.~~ Closed 2026-11-12: approved by the
    owner. `admin.spec.ts` checks public pages make no Clerk requests and set no Clerk cookies.
43. ~~Signed-in admin not tested yet.~~ Closed 2026-11-12: Clerk dev-instance test users (admin +
    viewer) in `.env.test`; signed-in e2e tests on (TESTING.md §6). Shell compared with
    `admin.html` at 1440/390. Found and fixed: viewer got 200 (not 403), sign-out on the 403 page
    failed, mobile user menu hidden. Note: the `E2E_CLERK_*` logins are currently only in
    `.env.local`; Playwright takes just those four names from it as a fallback — move them to
    `.env.test`.
44. ~~Clerk dashboard leftovers.~~ Closed 2026-11-12: app renamed "Verity Homes and Properties",
    Google sign-in off (email + password only), sign-ups Restricted, session token customised.
45. ~~Resend key in `.env.test` rejected.~~ Closed 2026-11-12: new key in `.env.local`, `.env.test`
    and Vercel; the home enquiry "sends" test passes on desktop and mobile.
