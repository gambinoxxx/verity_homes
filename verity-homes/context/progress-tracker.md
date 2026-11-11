# Progress Tracker

Status: `todo` · `in progress` · `done` · `blocked`

Each unit has a matching prompt in `prompts/PROMPTS.md`.

## Current focus

Unit 1: project setup.

## Units

| # | Unit | Status | Design reference | Notes |
| --- | --- | --- | --- | --- |
| 1 | Project setup: Next 16 + TS strict, Tailwind tokens, fonts, ESLint and Prettier, `lib/env.ts`, Vitest + Playwright installed, favicons | todo | `design/assets/verity.css` | |
| 2 | Database: copy `prisma/schema.prisma`, Prisma 7 + Neon adapter, first migration, seed (`[SAMPLE]` content + SiteSettings), query layer skeleton | todo | — | |
| 3 | Site shell: header, mobile drawer, footer, preloader, WhatsApp float, back-to-top, progress bar, 404 | todo | `index.html`, `404.html` | |
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
