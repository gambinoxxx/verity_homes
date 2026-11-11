# Progress Tracker

Status: `todo` · `in progress` · `done` · `blocked`

Each unit has a matching prompt in `prompts/PROMPTS.md`.

## Current focus

Unit 4: home page (Units 1–3 done).

## Units

| # | Unit | Status | Design reference | Notes |
| --- | --- | --- | --- | --- |
| 1 | Project setup: Next 16 + TS strict, Tailwind tokens, fonts, ESLint and Prettier, `lib/env.ts`, Vitest + Playwright installed, favicons | done | `design/assets/verity.css` | Done 2026-11-11: TS strict + noUncheckedIndexedAccess, tokens in `app/globals.css` `@theme`, Playfair/Manrope via next/font, Prettier, backend helpers + tests copied (25 unit tests pass), Vitest + Playwright installed, favicons. `build` is `next build` until Prisma lands — Unit 2 must change it to `prisma generate && next build`. |
| 2 | Database: copy `prisma/schema.prisma`, Prisma 7 + Neon adapter, first migration, seed (`[SAMPLE]` content + SiteSettings), query layer skeleton | done | — | Done 2026-11-11: Prisma 7.10.1 + adapter-neon; migration `20261111140315_init` on dev and test branches, both seeded; `lib/db/queries/*` (PUBLISHED only, no `address`, no BigInt/Decimal out); 9 query tests on the Neon test branch. Env files loaded explicitly (`ENV_FILE`, default `.env.local`); `npm run db:test:reset` = reset + seed. |
| 3 | Site shell: header, mobile drawer, footer, preloader, WhatsApp float, back-to-top, progress bar, 404 | done | `index.html`, `404.html` | Done 2026-11-11: `components/site/*` + shared `<SiteChrome>` used by `app/(site)/layout.tsx` and `app/not-found.tsx` (HTTP 404). `getSiteSettings()` is `"use cache"` + `cacheTag("settings")` + `cacheLife("max")`; Unit 19 must call `updateTag("settings")`. Placeholders for phone/email; WhatsApp float hidden until a number is set. Drawer: focus in, Tab trap, Esc, focus return, scroll lock. Preloader: full loads only, reduced-motion skip, curtain up within 5s. Temp token page moved to `app/(site)/page.tsx` with a navy hero. Turbopack Tailwind rule now skips `*.module.css` (it was turning CSS modules global). `lib/nav.ts` `UNBUILT_ROUTES` turns off `<Link>` prefetch for pages not built yet: **remove each route from it in the unit that builds it.** |
| 4 | Home page wired to the database | todo | `index.html` | |
| 5 | Properties list, filters in the URL, pagination | todo | `properties.html` | |
| 6 | Property detail: gallery, lightbox, facts, documents, **map**, similar, JSON-LD | todo | `property.html` | |
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
15. Footer "Privacy policy" and "Terms" links: `/privacy` is in the page list but in no
    unit; no terms page is planned at all. Both link to routes that 404 for now (Terms is a
    plain `<a>`). Write the pages, or drop "Terms" from the footer?
16. Footer newsletter form: design only, submit does nothing yet (no fake "Subscribed").
    Which unit saves `Subscriber` rows (public action + rate limit)? Suggest Unit 7
    alongside enquiries.
17. Manrope from `next/font` measures ~4% wider than the copy `design/` loads from the
    Google Fonts CSS API (canvas `measureText` 78px vs 75px for "Properties", same CSS).
    Layout matches, but on the 390px 404 page the two buttons wrap onto two rows instead
    of one. Accept, or pin the exact font files?
18. `tests/e2e/public.spec.ts` (Unit 3): the "no console errors" check now ignores the one
    console message Chromium logs for the 404 *document* on `/this-page-does-not-exist`,
    which that route has to return. All other errors still fail. `testing/e2e/` (the kit
    copy) is unchanged.
