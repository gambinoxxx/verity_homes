# Progress Tracker

Status: `todo` · `in progress` · `done` · `blocked`

Each unit has a matching prompt in `prompts/PROMPTS.md`.

## Current focus

Unit 7: enquiries — **next** (Units 1–6 done; Unit 6 was built before Unit 5 at the owner's request).

## Units

| # | Unit | Status | Design reference | Notes |
| --- | --- | --- | --- | --- |
| 1 | Project setup: Next 16 + TS strict, Tailwind tokens, fonts, ESLint and Prettier, `lib/env.ts`, Vitest + Playwright installed, favicons | done | `design/assets/verity.css` | Done 2026-11-11: TS strict + noUncheckedIndexedAccess, tokens in `app/globals.css` `@theme`, Playfair/Manrope via next/font, Prettier, backend helpers + tests copied (25 unit tests pass), Vitest + Playwright installed, favicons. `build` is `next build` until Prisma lands — Unit 2 must change it to `prisma generate && next build`. |
| 2 | Database: copy `prisma/schema.prisma`, Prisma 7 + Neon adapter, first migration, seed (`[SAMPLE]` content + SiteSettings), query layer skeleton | done | — | Done 2026-11-11: Prisma 7.10.1 + adapter-neon; migration `20261111140315_init` on dev and test branches, both seeded; `lib/db/queries/*` (PUBLISHED only, no `address`, no BigInt/Decimal out); 9 query tests on the Neon test branch. Env files loaded explicitly (`ENV_FILE`, default `.env.local`); `npm run db:test:reset` = reset + seed. |
| 3 | Site shell: header, mobile drawer, footer, preloader, WhatsApp float, back-to-top, progress bar, 404 | done | `index.html`, `404.html` | Done 2026-11-11: `components/site/*` + shared `<SiteChrome>` used by `app/(site)/layout.tsx` and `app/not-found.tsx` (HTTP 404). `getSiteSettings()` is `"use cache"` + `cacheTag("settings")` + `cacheLife("max")`; Unit 19 must call `updateTag("settings")`. Placeholders for phone/email; WhatsApp float hidden until a number is set. Drawer: focus in, Tab trap, Esc, focus return, scroll lock. Preloader: full loads only, reduced-motion skip, curtain up within 5s. Temp token page moved to `app/(site)/page.tsx` with a navy hero. Turbopack Tailwind rule now skips `*.module.css` (it was turning CSS modules global). `lib/nav.ts` `UNBUILT_ROUTES` turns off `<Link>` prefetch for pages not built yet: **remove each route from it in the unit that builds it.** |
| 4 | Home page wired to the database | done | `index.html` | **4a done 2026-11-11:** hero slider (3 slides, captions, progress dots, 01/03, slow zoom, headline reveal after the preloader via `lib/site-loaded.ts`), search bar (`lib/search.ts` → `/properties?type=sale\|rent\|land&area=&ptype=`, Invest tab → `/invest`), intro with rotating badge, first marquee band (`components/site/marquee-band.tsx`, reusable), featured properties with on-page filters and localStorage hearts. Shared `components/site/property-card.tsx` for Unit 5. `getFeaturedProperties()` cached with tag `"properties"` (Unit 14 must call `updateTag("properties")`). Global reveal-on-scroll (now `components/site/reveal.tsx`, React-owned; see Open question 33). **4b done 2026-11-11:** search Budget ranges per tab (`lib/search-ranges.ts`, shared with Unit 5) → `min`/`max` naira params; signature projects sticky showcase (`showcase-stack.tsx`, rAF, inert hidden panel items, hidden if none); invest section (steps, plans with highlighted gold card + rate placeholder at 0, partner marquee hidden if none, disclaimer from `lib/invest.ts`); statement scroll-fill (`statement.tsx` + `lib/scroll-fill.ts`, rAF; complete by mid-viewport; filled by CSS under reduced motion / no JS); second band (reverse, light); services accordion + image swap (`#services`); CEO; testimonials carousel (hidden if none); latest 3 posts; contact block + `components/site/enquiry-form.tsx` (submit disabled, "Form goes live soon" until Unit 7). New cached queries + tags (see architecture.md). `tests/e2e/home.spec.ts` added. |
| 5 | Properties list, filters in the URL, pagination | done | `properties.html` | Done 2026-11-12: `app/(site)/properties/page.tsx` — `PageHero` + sheet; pills, sidebar and sort `router.push(…, { scroll: false })` in a transition; results render on the server from the URL inside `<Suspense>` (◐ partial prerender). Params (`type`, `q`, `area`, `ptype`, `min`, `max`, `beds`, `title[]`, `sort`, `page`, 12/page) parsed per param with Zod in `lib/validation/property-filters.ts` (bad values dropped, never throws; 9 unit tests). Price uses `lib/search-ranges.ts` (rent/land/sale ranges by pill), preselects the URL's range, keeps a non-preset min/max as "custom"; Price-on-request included unless min/max set. Area dropdown = distinct published areas (`getPublishedAreas`). `listProperties` + `getPublishedAreas` cached, tag `"properties"`, page clamped. Shared `PropertyCard` (`cta="details"`, `data-tag`). Empty state + Clear filters + Make a request. `generateMetadata` e.g. "Properties for rent in Lagos". `/properties` removed from `UNBUILT_ROUTES`; breadcrumb and "All properties" on the property page work. Reduced-motion transitions now `0s` (see ui-context). |
| 6 | Property detail: gallery, lightbox, facts, documents, **map**, similar, JSON-LD | done | `property.html` | Done 2026-11-11 (before Unit 5, at the owner's request). `app/(site)/properties/[slug]/page.tsx`: `generateStaticParams` (published slugs, placeholder if none), cached reads (tag `"properties"`): `getPublishedPropertySlugs`, `getPropertyBySlug`, `getPropertyRedirect`, `getSimilarProperties`. **`proxy.ts`** decides the status before the shell streams (Cache Components sends a 200 shell first, so `notFound()`/`permanentRedirect()` in the page can't set it): published → page, SlugRedirect → 308, unknown/draft → 404 (`resolvePropertySlug`, two indexed lookups per request). Unit 12 adds Clerk to the same `proxy.ts`. `components/site/property/`: `gallery.tsx` (1 big + 4, "View all N photos" on the last tile, 0 photos → navy house panel, 1 photo → wide tile; lightbox dialog: arrows, ←/→, Esc, swipe, "1 / N", focus trap + return), `share-button.tsx` (navigator.share → clipboard "Link copied"), `sections.tsx` (hero + breadcrumb, head, facts/features/documents/nearby only when present, map via `lib/maps.ts`, enquiry card `id="enquire"` with `EnquiryForm` `card` variant (disabled until Unit 7), mobile bar, similar). Helpers + `RealEstateListing` JSON-LD (area + city, price only when public) in `lib/property-detail.ts` (tested). CSP + security headers in `next.config.ts`. `/properties/*` removed from `UNBUILT_ROUTES`. E2E: `property.spec.ts` all pass except the Unit 7 enquiry test (`test.fixme`); `public.spec.ts` passes for the property page; its 10 "loads cleanly" failures are the unbuilt `/properties`, `/invest`, `/about`, `/blog`, `/contact` (404). Deviations (contrast, see Q27): WhatsApp text buttons `#15803D`, "Verified" text `#14703A`. Mobile gallery shows 3 tiles with no "View all" chip, as in the design. |
| 7 | Enquiries: form component, server action, rate limit, Resend email, WhatsApp links (used on home, property, invest and contact) | todo | `property.html`, `contact.html` | |
| 8 | Contact page with **map** | todo | `contact.html` | |
| 9 | Invest page: plans and FAQs from the database | todo | `invest.html` | Build now; launch needs approved wording (Q5) |
| 10 | About page | todo | `about.html` | |
| 11 | Blog list and post page (Markdown) | todo | `blog.html`, `post.html` | |
| 12 | Admin auth: Clerk, `proxy.ts`, `/admin/sign-in`, `requireAdmin()`, admin layout | todo | `admin.html` (shell) | |
| 13 | Admin dashboard | todo | `admin.html` | |
| 14 | Admin properties list + editor (fields, documents, featured/showcase) | todo | `admin-properties.html`, `admin-property-edit.html` | |
| 15 | Admin property photos (Blob upload, reorder, alt text, delete) and **map picker** (Leaflet) | todo | `admin-property-edit.html` | |
| 16 | Admin enquiries inbox (status, notes, CSV export) | todo | `admin-enquiries.html` | |
| 17 | Admin: plans + FAQs | todo | List/editor pattern | |
| 18 | Admin: posts + categories (Markdown editor with preview, cover upload) | todo | List/editor pattern | |
| 19 | Admin: testimonials, partners, site settings, newsletter subscribers | todo | List/editor pattern | Split per entity if large |
| 20 | SEO: metadata, OG images, sitemap, robots, JSON-LD, slug redirects | todo | — | |
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
2. Business email (`info@verityhomes.com.ng` once email hosting is set up).
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
11. Admin users: Esther only, or staff too?
12. Who owns the Clerk, Neon, Vercel and Resend accounts? Use a company
    email.
13. `.env.local` has the real Neon values and `IP_HASH_SALT`. Clerk, Blob
    and Resend values are still placeholders, needed from Units 7 and 12.
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
28. **Local setup on this Mac (2026-11-11).** `.env.local` is still a copy of `.env.example`
    (placeholder Neon host and salt), so Unit 6 was built, tested and compared against the test
    branch (`.env.test` loaded into the shell). Playwright 1.65 has no Chromium for macOS 12, so
    e2e and compare ran in the installed Google Chrome (`channel: "chrome"`) via an uncommitted
    override; the committed config is unchanged. Fill `.env.local` with the dev-branch values.
29. **E2E server database (Unit 5).** `playwright.config.ts` starts `npm run build && npm run
    start`, which reads `.env.local` (dev branch), but `db:test:reset` writes the e2e fixtures
    (fake WhatsApp number) to the **test** branch. Unit 5's e2e run exported `.env.test` into
    the shell first (`set -a; . ./.env.test; set +a; npm run test:e2e …`), since real env vars
    override `.env.local`. Should the Playwright config load `.env.test` for its web server so
    a plain `npm run test:e2e` always uses the test branch?
30. **Rotate the Neon test-branch password (2026-11-12).** During Unit 5 a URL-parse error
    echoed the `.env.test` connection string into the agent's tool output. It went nowhere else,
    but rotate the test branch's password in Neon and update `.env.test`.
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
