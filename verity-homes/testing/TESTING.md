# Testing — how every unit is verified

Every coding agent works the same way a careful senior engineer would:
**build → run checks → look at the result → compare with the design → fix
→ repeat**. A unit is never "done" because the code looks right. It is done
when the checks below pass and the screenshots match `design/`.

## 1. Install (Unit 1 sets this up)

```bash
npm i -D vitest @vitest/coverage-v8 @playwright/test @axe-core/playwright tsx
npx playwright install chromium
```

Copy the files from this folder into the repo:

| From `testing/` | To repo |
| --- | --- |
| `playwright.config.ts` | `playwright.config.ts` |
| `vitest.config.ts` | `vitest.config.ts` |
| `unit/*.test.ts` | `tests/unit/` |
| `e2e/*.spec.ts` | `tests/e2e/` |
| `scripts/compare-design.mjs` | `scripts/compare-design.mjs` |

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "compare": "node scripts/compare-design.mjs",
    "check": "npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

## 2. The verification loop (run after every unit)

| Step | Command | Pass condition |
| --- | --- | --- |
| 1. Static | `npm run lint && npm run typecheck` | Zero errors |
| 2. Unit | `npm run test` | All green. New logic gets a test. |
| 3. Build | `npm run build` | Succeeds with no type errors |
| 4. End to end | `npm run test:e2e -- tests/e2e/<unit spec>` | All green |
| 5. Visual | `npm run compare -- <route> <design file>` | Open the PNGs it writes. Fix visible differences in layout, spacing, colour, fonts, missing elements and mobile stacking. |
| 6. Report | — | List the commands run, the results and the screenshot paths |

If a step fails, **fix the root cause and rerun from step 1**. Never
weaken, skip or delete a test to make it pass. If a test itself is wrong,
explain why in your report before changing it.

## 3. What the end-to-end suite checks

`tests/e2e/public.spec.ts` runs these on every public route, at 1440px and
390px:

- The page loads with HTTP 200 and has exactly one `<h1>`.
- The page logs **no console errors** and no uncaught exceptions.
- There is **no horizontal scroll** at 360px.
- There are **no serious or critical axe accessibility violations**.
- Every `<img>` has an `alt` attribute (it may be empty for decorative
  images).
- A full-page screenshot is saved to `test-results/screens/`.

The feature specs cover these:

| Spec | Covers |
| --- | --- |
| `property.spec.ts` | Gallery lightbox (open, arrows, Esc, focus return), map iframe present with the right query, enquiry submit, WhatsApp link text, mobile bottom bar |
| `properties.spec.ts` | Filters update the URL and results, pagination, empty state |
| `enquiry.spec.ts` | Validation errors, honeypot rejection, success message, row created in the database (test DB) |
| `admin.spec.ts` | Signed-out users are redirected to `/admin/sign-in`. Signed-in flows use `@clerk/testing` (see below). |

## 4. Visual comparison with the design

`scripts/compare-design.mjs` screenshots the running app route and the
static `design/` file at the same widths, and writes the pairs side by side
to `test-results/compare/`:

```bash
npm run dev   # in another terminal
npm run compare -- /properties properties.html
npm run compare -- /properties/sample-duplex property.html
```

Read the side-by-side images and list every difference you can see before
you fix anything. Differences in data are fine: real content replaces the
placeholders. Differences in layout or style are not.

## 5. Test data

- Use a **separate Neon branch** for tests. Neon branches are free and
  instant. Point `DATABASE_URL` and `DIRECT_URL` at it in `.env.test`.
- `npx prisma migrate reset --force` followed by the seed gives a clean
  state. The seed creates `[SAMPLE]` rows: 6 properties (one with exact
  coordinates and one without), 3 plans, 4 FAQs, 3 posts, 2 testimonials
  with consent, and SiteSettings.
- Never run tests against the production database.

## 6. Admin tests with Clerk

- Install `@clerk/testing` and call `clerkSetup()` in Playwright global
  setup.
- Create a test admin user in the Clerk **development** instance with
  `publicMetadata.role = "admin"`. Put its credentials in `.env.test` as
  `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD`.
- In tests, call `setupClerkTestingToken({ page })`, then sign in with
  `clerk.signIn`.
- Before writing this, check the current `@clerk/testing` docs, because
  its API changes.

## 7. Before launch (Unit 21)

- The full suite passes on the Vercel preview URL:
  `PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app npm run test:e2e`.
- Lighthouse on mobile scores **90+ for accessibility, best practices and
  SEO**, and **80+ for performance**, on `/`, `/properties` and one
  property page.
- Manual phone check on a real Android and iPhone: preloader, menu drawer,
  gallery swipe, map, WhatsApp link opening the app, and the enquiry email
  arriving.
