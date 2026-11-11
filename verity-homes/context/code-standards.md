# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes rather than layering workarounds.
- Keep data access, validation and UI in separate files.
- Don't invent business facts. Placeholders stay visibly marked, as in
  `design/`, until real data exists.

## TypeScript

- Turn on `"strict": true` and `"noUncheckedIndexedAccess": true`.
- No `any`. Use Prisma's generated types
  (`Prisma.PropertyGetPayload<{ include: { images: true } }>`) or
  `z.infer<>`.
- Validate all unknown input (form data, search params, env vars) with Zod
  at the boundary.
- `lib/env.ts` parses `process.env` with Zod and throws at startup if a
  variable is missing.
- `BigInt` never reaches a Client Component or JSON. Convert it to a number
  or a formatted string in the query layer.
  `Decimal` coordinates become `number`.

## Next.js 16

- Default to Server Components, and fetch data through `lib/db/queries/*`.
- Add `"use client"` only for interactivity, specifically:
  - preloader, header scroll and drawer, hero slider, showcase
  - filters, gallery and lightbox, forms with live state
  - the Leaflet picker and the photo uploader
- Mutations are server actions in `lib/actions/`. After writing, call
  `revalidatePath` for every public page that shows the entity: for
  example, `/`, `/properties` and `/properties/[slug]`.
- Every page exports `generateMetadata`. Property and post pages also
  export Open Graph images, using the cover photo.
- Use `next/image` for every image, with Blob hosts in
  `images.remotePatterns`. Give the hero image `priority` and every other
  image `sizes`.
- Dynamic routes use slugs and call `notFound()` for a missing or
  unpublished slug. Check `SlugRedirect` first.
- Property filters live in the URL (`?type=rent&area=lekki&beds=3&page=2`)
  and are parsed with Zod. The page is server-rendered from them, so links
  can be shared.
- Fonts come from `next/font/google`: Playfair Display and Manrope, exposed
  as CSS variables.

## Styling

- Port `design/assets/verity.css` tokens into Tailwind 4 `@theme` (see
  `ui-context.md`). Components use tokens, never raw hex values.
- Recreate the `design/` look exactly: radii, spacing, shadows and
  animations. When a Tailwind class can't express it, use a small CSS module
  next to the component.
- Build mobile-first. No horizontal scroll at 360px, touch targets of at
  least 44px, and text contrast of at least 4.5:1.
- Every animation respects `prefers-reduced-motion`.

## Server actions and route handlers

- Parse input with Zod before any logic runs.
- Admin actions call `requireAdmin()` before any read of drafts or any
  write.
- Return `{ ok: true, data }` or `{ ok: false, error, fieldErrors? }`.
  Never return stack traces or raw database errors.
- Public forms (enquiry, newsletter) have:
  - a honeypot field named `company`, which must be empty
  - a rate limit of 5 enquiries per `ipHash` per hour, checked in the
    database
  - a minimum fill time of 3 seconds, enforced with a hidden timestamp
- WhatsApp links use
  `https://wa.me/<SiteSettings.whatsapp>?text=<encoded message naming the property or plan>`.

## Data and storage

- Content and metadata go in Postgres. Image files go in Vercel Blob,
  uploaded straight from the browser with `upload()` from
  `@vercel/blob/client`. The token route is admin only, allows JPEG, PNG
  and WebP up to 10 MB, and needs `addRandomSuffix: true`.
- Money is stored in kobo (`BigInt`) and formatted as `₦250,000,000`. Never
  use floats for money.
- Every schema change goes through `npx prisma migrate dev --name <change>`,
  and the migration is committed.
  - Production runs `npx prisma migrate deploy`, as part of the Vercel
    build command.
  - `prisma db push` is never used.
- Prisma 7 uses two connection strings:
  - `DIRECT_URL` (unpooled), in `prisma.config.ts`, for migrations
  - `DATABASE_URL` (pooled), through `@prisma/adapter-neon`, in
    `lib/db/client.ts`, at runtime
  - Prisma 7 does not read env files. `prisma.config.ts` and
    `prisma/seed.ts` load `.env.local`, or the file named in `ENV_FILE`
    (e.g. `ENV_FILE=.env.test`, used by `npm run db:test:reset`).
- Slugs are generated on create (`slugify(title)`, made unique with `-2`,
  `-3`…). Renaming a published slug adds a `SlugRedirect`.

## Testing

See `testing/TESTING.md`. A unit is not finished until its tests pass and
its Playwright screenshots have been compared against `design/`.

## File organization

- `app/(site)/` — public routes and their layout (header, footer, WhatsApp
  button)
- `app/admin/` — admin routes, behind the protected layout
- `app/api/` — the Blob upload route
- `components/site/`, `components/admin/` and `components/ui/`
- `lib/db/`, `lib/actions/`, `lib/validation/`, `lib/storage/`,
  `lib/email/`, `lib/auth/`
- `lib/env.ts`, `lib/maps.ts`, `lib/format.ts`
- `prisma/` — the schema, migrations and seed
- `tests/unit/` and `tests/e2e/`
- `context/` — these files
- `design/` — static references, read-only
