# Verity Homes and Properties — Website

## Overview

The public website and admin panel for **Verity Homes and Properties Ltd**
(RC 9971213, Onipanu, Lagos), a Lagos real-estate company.

- **Public side:** visitors browse homes, land and rentals, view each property
  with photos, documents and a map, learn about the investment plans, read
  the blog, and send enquiries by form or WhatsApp.
- **Admin side:** the CEO (Esther Ezenagu) manages properties, investment
  plans, blog posts, testimonials, partners, site settings and incoming
  enquiries herself, without touching code.

Domain: `verityhomes.com.ng` (`verityhomes.ng` may be added later and
redirected).

## Goals

1. Present Verity as a credible, registered company: CAC registration
   visible, professional listings, clear contact routes.
2. Turn visitors into enquiries. Every listing, plan and page has a
   one-click route to an enquiry form or WhatsApp.
3. Let the CEO publish and update content herself, with changes visible on
   the site immediately.
4. Keep the stack portable: plain Postgres and standard libraries, with no
   CMS lock-in.

## Design reference

`design/` holds static HTML for every page. **These are the source of truth
for layout, spacing, copy and behaviour.** Build each page to match its
reference at 1440px and 390px wide.

| Page | Route | Reference file |
| --- | --- | --- |
| Home | `/` | `design/index.html` |
| Properties (list + filters) | `/properties` | `design/properties.html` |
| Property detail (gallery, documents, **map**, enquiry) | `/properties/[slug]` | `design/property.html` |
| Invest with Verity (steps, plans, FAQ, form) | `/invest` | `design/invest.html` |
| About (story, values, CEO, CAC, partners) | `/about` | `design/about.html` |
| Blog list (categories, search, sidebar) | `/blog` | `design/blog.html` |
| Blog post | `/blog/[slug]` | `design/post.html` |
| Contact (3 cards, form, **map**) | `/contact` | `design/contact.html` |
| Not found | any unknown route | `design/404.html` |
| Privacy policy | `/privacy` | Simple prose page using the `post.html` layout |
| Admin dashboard | `/admin` | `design/admin.html` |
| Admin properties list | `/admin/properties` | `design/admin-properties.html` |
| Admin property editor | `/admin/properties/new`, `/admin/properties/[id]` | `design/admin-property-edit.html` |
| Admin enquiries | `/admin/enquiries` | `design/admin-enquiries.html` |
| Admin plans, posts, testimonials, partners, FAQs, settings | `/admin/<entity>` | Same list and editor patterns as properties |
| Admin sign-in | `/admin/sign-in` | Clerk `<SignIn />`, centred on a navy background |

**Services** is a section of the home page (`/#services`), not a separate
page.

## Core user flows

### Visitor

1. The visitor lands on the home page; the branded preloader plays, then
   lifts like a curtain to reveal the hero.
2. They browse featured properties, or open `/properties` and filter by
   listing type, location, property type, price, bedrooms and title
   document.
3. They open a property page with:
   - a photo gallery and lightbox
   - key facts, features, documents and price
   - a map of the area
   - an enquiry card
4. They enquire through the form (saved and emailed) or tap "Chat on
   WhatsApp", which opens a pre-filled message naming the property.
5. Alternatively, they read `/invest` and submit an investment enquiry for a
   specific plan.

### Admin (CEO)

1. She signs in at `/admin/sign-in` (Clerk, invitation only).
2. She creates or edits a property: details, photos (drag to reorder, alt
   text), map pin, documents, then publishes or saves a draft.
3. She manages plans, FAQs, posts, testimonials, partners and site settings.
4. She works through the enquiries inbox: view, WhatsApp or call, mark as
   contacted or closed, and add a private note.

## Features

### Public site

- Branded preloader on every page load (skipped for reduced motion)
- Megamound-inspired styling:
  - page hero with a giant title and breadcrumb
  - a white rounded "sheet" overlapping the hero
  - large scrolling text bands and small pill tickers
- Sticky stacked-card showcase of developments (home page)
- Property search and filters, with filter state kept in the URL query string
- Property detail:
  - gallery with lightbox
  - facts strip, features and documents
  - an embedded **map** with an "Open in Google Maps" button
  - nearby places
  - a sticky enquiry card, plus a mobile bottom bar on phones
- Contact page with an embedded **map** of the office area
- Investment page with plans and FAQs from the database
- Blog with categories, search, recent posts and article pages
- Newsletter email capture in the footer
- Floating WhatsApp button, back-to-top button and scroll progress bar

### Admin panel

- Clerk sign-in, admins only
- CRUD for properties, including:
  - up to 20 photos, reorderable, with alt text
  - a map pin picker
  - documents, featured and showcase flags, and draft or published status
- CRUD for investment plans, FAQs, blog posts (Markdown), categories,
  testimonials (consent required to publish) and partners (consent required)
- Enquiries inbox with status, notes and CSV export
- Site settings: phone, WhatsApp, email, office area or address, socials

### Notifications

- Each enquiry is saved first, then a Resend email is sent to
  `ENQUIRY_NOTIFY_TO`.

## Scope

### In scope

- Everything listed above, responsive down to 360px
- SEO:
  - `generateMetadata` per page
  - Open Graph images
  - `sitemap.xml` and `robots.txt`
  - JSON-LD (`RealEstateListing` / `Organization`)

### Out of scope

- Taking payments or investment funds online
- Investor accounts, dashboards or returns tracking
- Public user accounts or saved searches. The heart button saves to
  `localStorage` only.
- Mortgage or ROI calculators
- Multi-language support or a mobile app

## Success criteria

1. A visitor can filter properties, open a detail page, see the map and
   submit an enquiry. The enquiry appears in the admin inbox and arrives by
   email.
2. The admin can create a property with photos and a map pin, publish it,
   and see it on the public site without a redeploy.
3. The admin can publish a post, a plan and an FAQ, and each renders on its
   public page.
4. Every public page:
   - matches its `design/` reference at 1440px and 390px
   - has no horizontal scroll at 360px
   - scores 90+ for Lighthouse accessibility
   - logs no console errors
5. `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`
   all pass, and the Playwright suite passes.
