# Architecture Context

## Stack

Pin these major versions. Check `npm view <pkg> version` before
installing, and never install a pre-release (`-rc`, `-beta`). Prisma's npm
"latest" tag may point at an 8.x RC: install `prisma@7` and
`@prisma/client@7` explicitly.

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript (strict) | Public pages, admin panel, server actions and route handlers in one app |
| UI | Tailwind CSS 4 + shadcn/ui (admin only) | Public pages are custom components matching `design/`; shadcn primitives for admin forms, dialogs and tables |
| Database | Neon (serverless Postgres) | System of record for all content and enquiries |
| ORM | Prisma 7 (`prisma-client` generator + `@prisma/adapter-neon`) | Typed client, schema in `prisma/schema.prisma`, Prisma Migrate |
| Auth | Clerk (`@clerk/nextjs`) | Admin sign-in only, invitation only |
| File storage | Vercel Blob (`@vercel/blob`) | Property photos, blog covers, avatars, partner logos |
| Email | Resend | Enquiry notification emails |
| Validation | Zod 4 | All form input and external data at boundaries |
| Maps (public) | Google Maps embed iframe (keyless `output=embed`) | Property and contact maps |
| Maps (admin) | Leaflet + react-leaflet with OpenStreetMap tiles | Draggable pin to set latitude and longitude |
| Testing | Vitest (unit) + Playwright (end-to-end, visual and accessibility via `@axe-core/playwright`) | See `testing/TESTING.md` |
| Hosting | Vercel | Deploys from `main`, with preview deploys per branch |

### Portability rule

Everything that holds data is plain Postgres or plain files. Moving from
Neon to another Postgres host, or from Blob to S3 or R2, must only require
changing env vars and one adapter module.

Clerk is the one hosted dependency. It holds admin logins only, and its
code is confined to `lib/auth/` (enforced by ESLint `no-restricted-imports` on `@clerk/*`):
`index.ts` (`requireAdmin`, `isAdmin`, `getAdminUser`, `ForbiddenError`), `proxy.ts`
(`clerkMiddleware` for `/admin/*`), `roles.ts` (pure role/path helpers) and `components.tsx`
(`AuthProvider`, `SignIn`, `UserButton`). The root `proxy.ts`, `app/admin/**` and
`components/admin/**` import from there. `ClerkProvider` wraps `app/admin/layout.tsx` only, so
no public page loads Clerk (Open question 42).

## System boundaries

- `app/(site)/` — Public pages. Reads published content only and never
  calls Clerk.
- `app/admin/` — The admin panel. `layout.tsx`: `ClerkProvider` + `robots noindex`.
  `(panel)/layout.tsx` calls `requireAdmin()` inside `<Suspense>` for every admin page and renders
  the shell (`components/admin/admin-shell.tsx`); admin actions and routes call it again.
- `app/admin/sign-in/[[...sign-in]]/` — The Clerk `<SignIn />` page (in `<Suspense>`).
- `app/admin/no-access/` — 403 page for signed-in users without the admin role.
- `app/api/blob/upload/` — Route handler that issues Vercel Blob client
  upload tokens, admin only.
- `app/sitemap.ts`, `app/robots.ts` — SEO files.
- `proxy.ts` — From Unit 6 (and `/blog/[slug]` from Unit 11): answers `/properties/[slug]` with the real status before the
  page streams (published → page, `SlugRedirect` → 308, unknown/draft → 404). With Cache
  Components a page sends its shell (HTTP 200) first, so `notFound()` / `permanentRedirect()`
  inside it cannot change the status. `/blog/[slug]` uses `resolvePostSlug` (SlugRedirect entity
  `POST`). `/admin/*` goes to `lib/auth/proxy.ts`: signed out → 307 to `/admin/sign-in`,
  signed in without the role → HTTP 403 with the `/admin/no-access` page (URL unchanged). Next
  ignores a proxy rewrite's `status`, so a GET page load fetches the static no-access page
  (marked with an internal header that skips Clerk) and returns it as 403; RSC navigations and
  Server Actions keep the plain rewrite. Sign-in and no-access stay open.
- `prisma/` — `schema.prisma`, `migrations/` and `seed.ts`.
- `lib/db/` — `client.ts` (the Prisma singleton) and `queries/*.ts`. This is
  the only place that imports the generated Prisma client.
- `lib/actions/` — Server actions grouped by entity (`enquiry.ts` → `createEnquiry`,
  `subscribe.ts` → `subscribe`; Unit 7). Each one validates with
  Zod, checks `requireAdmin()` for admin actions, writes, then calls
  `revalidatePath`.
- `lib/validation/` — Zod schemas shared by forms and actions.
- `lib/storage/` — Blob wrapper (`upload`, `remove`). The only importer of
  `@vercel/blob`.
- `lib/email/` — Resend client and templates. The only importer of `resend`.
  `client.ts` (lazy client), `enquiry-template.ts` (pure: subject/HTML/text),
  `enquiry.ts` (`sendEnquiryEmail`, never throws).
- `lib/db/mutations/` — Writes for public actions (`enquiries.ts`: rate-limit count,
  published property/plan lookup, save enquiry, mark email sent, upsert subscriber).
- `lib/ip-hash.ts` — client IP from `x-forwarded-for` / `x-real-ip`, `sha256(ip + salt)`.
- `lib/auth/` — `requireAdmin()` and `isAdmin()` (the access check runs once per request,
  `React.cache`).
- `lib/db/queries/admin.ts` — admin-only reads (dashboard). Each function calls
  `requireAdmin()` itself and is never cached (`"use cache"` is for public data only).
- `lib/property-detail.ts` — Property page helpers: facts strip, description paragraphs,
  WhatsApp text, meta description and `RealEstateListing` JSON-LD (area + city only).
- `lib/maps.ts` — Builds map embed URLs and "Open in Google Maps" links from
  a property or the site settings.
- `lib/format.ts` — Formats money, dates (`formatDate`, Lagos time) and enum labels.
- `lib/search.ts` + `lib/search-ranges.ts` — Search URL building and the budget ranges
  (naira) per listing type, shared by the home search and the `/properties` filters.
- `lib/invest.ts` — Shared investment copy: the disclaimer and the 4 steps.
- `lib/blog.ts` — Post helpers: share links, meta description, Article JSON-LD, and the Markdown
  link/image rules (`markdownLinkKind`, `markdownImageSrc`, `MARKDOWN_IMAGE_HOSTS`).
  `lib/validation/blog-filters.ts` parses `/blog` params (`category`, `q`, `page`).
- `components/site/blog/markdown.tsx` — The only Markdown renderer: react-markdown + remark-gfm,
  `skipHtml` (raw HTML is never rendered), default `urlTransform`, safe external links, images only
  from known hosts. Unit 18's preview must use this same component.
- `components/site/privacy/privacy-notice.tsx` — The /privacy DRAFT notice. It describes what the
  code collects; when a unit changes what is collected, stored or shared (new form field, new
  processor, analytics, cookies), update the notice and `PRIVACY_LAST_UPDATED` in the same unit.
- `components/site/` — Public sections and cards, ported from `design/`.
  `site-chrome.tsx` wraps every public page and the root `app/not-found.tsx`.
- `lib/nav.ts` — Main nav links, active-link matching, and `UNBUILT_ROUTES`
  (no `<Link>` prefetch for pages that don't exist yet).
- `components/admin/` — Admin tables, forms and the map picker.
- `components/ui/` — Generated shadcn primitives.

## Storage model

The source of truth is `prisma/schema.prisma`, and it already exists.

- **Postgres** holds:
  - Property, PropertyImage and PropertyDocument
  - InvestmentPlan and Faq
  - Post and Category
  - Testimonial and Partner
  - Enquiry and Subscriber
  - SiteSettings (a single row, id = 1)
  - SlugRedirect
- **Vercel Blob** holds image files only. Rows store `url` and `pathname`.
- **Money** is a `BigInt` in kobo. Format it with `lib/format.ts`.
- **Coordinates** are `Decimal(9,6)` latitude and longitude on Property.
- **Users and sessions** live in Clerk. Rows store the Clerk user id as a
  plain string in `createdBy`.

## Environment variables

`lib/env.ts` validates the environment in groups, so a service that is not set up
yet never breaks the build or pages that don't use it:

| Group | Variables | Validated | Who may read it |
| --- | --- | --- | --- |
| Core: `env` | `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `IP_HASH_SALT`, optional `DIRECT_URL` | At import; the build fails if invalid | Anything server-side |
| `emailEnv()` | `RESEND_API_KEY`, `ENQUIRY_NOTIFY_TO`, `ENQUIRY_FROM` | First call (Unit 7) | `lib/email` only |
| `clerkEnv()` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | First call (Unit 12) | `lib/auth` only |
| `blobEnv()` | `BLOB_READ_WRITE_TOKEN` | First call (Unit 15) | `lib/storage` only |

- A feature getter throws an error that names the missing variables (never their
  values). There are no defaults or dummy values.
- An ESLint `no-restricted-imports` rule enforces who may import the feature getters.
- Vercel needs only the core group until each feature unit ships; add that unit's
  variables to Vercel in the same unit.

## Caching

- `cacheComponents` is on. Public reads use `"use cache"` and a tag, with
  `cacheLife("max")`:
  - `getSiteSettings()` is tagged `"settings"` (`SETTINGS_TAG`).
  - `getFeaturedProperties()` and `getShowcaseProperties()` are tagged `"properties"`
    (`PROPERTIES_TAG`). So are the detail-page reads `getPublishedPropertySlugs()`,
    `getPropertyBySlug()`, `getPropertyRedirect()` (SlugRedirect) and `getSimilarProperties()`.
    So are the list-page reads `listProperties(filters)` (the normalised filters object is
    part of the cache key) and `getPublishedAreas()` (Unit 5).
  - `/properties` reads `searchParams` inside `<Suspense>` (request-time data under Cache
    Components): the hero and sheet prerender, the results stream (◐ in the build output).
    URL params are parsed in `lib/validation/property-filters.ts`; every param falls back to
    "not set" on its own, so a bad URL never throws.
  - `getPublishedPlans()` is tagged `"plans"` (`PLANS_TAG`) and `getFaqs(page)` `"faqs"`
    (`FAQS_TAG`), both in `lib/db/queries/invest.ts`.
  - `getLatestPosts()` is tagged `"posts"` (`POSTS_TAG`, `lib/db/queries/posts.ts`), as are the
    Unit 11 reads `listPosts(filters)`, `getPostCategories()`, `getPublishedPostSlugs()`,
    `getPostBySlug()`, `getPostRedirect()` and `getRelatedPosts()`. `/blog` reads `searchParams`
    inside `<Suspense>` like `/properties`.
  - `getPublishedTestimonials()` is tagged `"testimonials"` and `getPublishedPartners()`
    `"partners"` (`TESTIMONIALS_TAG`, `PARTNERS_TAG`, `lib/db/queries/trust.ts`).
- With `cacheComponents`, a page that reads uncached data outside `<Suspense>` fails the
  build, so every query used by a static public page is cached like this.
- Admin actions that change cached data call `updateTag(tag)`, as well as
  `revalidatePath`:
  | Unit | Admin area | Tags to update |
  | --- | --- | --- |
  | 14–15 | Properties, photos | `"properties"` |
  | 17 | Plans + FAQs | `"plans"`, `"faqs"` |
  | 18 | Posts, categories | `"posts"` |
  | 19 | Testimonials, partners, settings | `"testimonials"`, `"partners"`, `"settings"` |
- Vitest aliases `next/cache` to a no-op stub, so cached queries run directly
  in unit tests.

## Maps

- **Property page:** if latitude and longitude are set and
  `showExactLocation` is true, the embed is
  `https://www.google.com/maps?q=LAT,LNG&z=15&output=embed`.
- **Otherwise:** the property page map uses
  `q=encodeURIComponent(area + ", " + city)` with `z=13`, and the map card
  says "Exact address shared at inspection". The private `address` field is
  never rendered.
- **"Open in Google Maps" button:** links to
  `https://www.google.com/maps/search/?api=1&query=...` using the same query.
- **Contact page:** uses `SiteSettings.mapQuery` (`mapEmbedUrl(mapQuery, 14)`, "Open in Maps"
  and "Get directions" via `mapsLink`). The visible address is `officeDisplay` (the area, or
  `officeAddress` only when `showFullAddress` is on). Components in `components/site/contact/`.
- **Admin map picker:** react-leaflet with OSM tiles
  (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, with attribution).
  - Clicking the map or dragging the marker sets latitude and longitude.
  - Two number inputs stay in sync with the marker.
  - It loads with `next/dynamic` and `ssr: false`.
- **CSP and next.config:** allow frames from `https://www.google.com` and
  `https://maps.google.com`, and images from the Blob host and
  `tile.openstreetmap.org`.
  - Done in Unit 6: `next.config.ts` `headers()` sends `Content-Security-Policy:
    frame-src 'self' https://www.google.com https://maps.google.com; frame-ancestors 'self';
    object-src 'none'; base-uri 'self'`, plus `Referrer-Policy` and `X-Content-Type-Options`.
    No `script-src`/`style-src`/`img-src` yet (Next's inline scripts would need nonces).

## Auth and access model

- Clerk handles sign-in. Public sign-ups are disabled in the Clerk dashboard
  and admins are invited.
- There is one role: `publicMetadata.role === "admin"`. It is read from the session token claim
  `metadata` when the token is customised (`{ "metadata": "{{user.public_metadata}}" }`), else
  from the user via Clerk's Backend API (one lookup per check).
- Protection has two layers:
  - `proxy.ts` redirects unauthenticated `/admin/*` requests to
    `/admin/sign-in`.
  - Every admin page, server action and route handler also calls
    `requireAdmin()`. The proxy alone is never treated as enough.
- Public pages never call Clerk.

## Invariants

1. Public pages only query rows with `status = PUBLISHED`. Testimonials and
   partners additionally require `consentConfirmed = true`.
2. No mutation runs without Zod validation first and, for admin actions,
   `requireAdmin()` second.
3. Images live only in Blob. Deleting a property, post or partner deletes
   its Blob files.
4. Prices, return rates, contact details and the RC number come from the
   database or site settings. They are never hardcoded in JSX.
5. An enquiry is saved before the email is sent. If the email fails, the
   enquiry is kept with `emailSentAt = null`.
6. Investment copy never says "guaranteed". The disclaimer from
   `design/invest.html` appears wherever plans appear.
7. Only `lib/db`, `lib/storage`, `lib/email` and `lib/auth` import their
   vendor SDKs.
8. A private property `address` is never sent to the browser on public
   pages.
9. Changing a published slug writes a `SlugRedirect`, and the old URL issues
   a 308 redirect to the new one (done in `proxy.ts`, see System boundaries).
