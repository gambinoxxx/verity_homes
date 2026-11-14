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

### On a Mac where Chromium won't launch

On a Mac where Chromium won't launch, run tests with `PW_CHANNEL=chrome`. Playwright's
bundled Chromium has no build for some macOS versions (e.g. macOS 12); with
`PW_CHANNEL=chrome` both `playwright.config.ts` and `scripts/compare-design.mjs` use the
installed Google Chrome instead:

```bash
PW_CHANNEL=chrome npm run test:e2e -- tests/e2e/blog.spec.ts
PW_CHANNEL=chrome npm run compare -- /blog blog.html
```

Unset, they use the bundled Chromium as before (CI and other machines).

## 5. Test data

- Use a **separate Neon branch** for tests. Neon branches are free and
  instant. Point `DATABASE_URL` and `DIRECT_URL` at it in `.env.test`.
- `npx prisma migrate reset --force` followed by the seed gives a clean
  state. The seed creates `[SAMPLE]` rows: 6 properties (one with exact
  coordinates and one without), 3 plans, 4 FAQs, 3 posts, 2 testimonials
  with consent, and SiteSettings.
- Never run tests against the production database.

### How the test branch is used (Unit 7)

- **Unit tests** (`npm run test`) load `.env.test` in `tests/setup/env.ts`. DB-backed tests
  call `assertTestDatabase()` (`tests/unit/helpers/test-db.ts`).
- **E2E** (`npm run test:e2e`) loads `.env.test` itself, in `playwright.config.ts`, before
  starting the app. The built app inherits those values; real environment variables take
  precedence over `.env.local` in Next.js, so the app under test always uses the test
  branch. It **refuses to run** if `.env.test` is missing, if its `DATABASE_URL` is missing
  or still the placeholder, or if it points at the same host as `.env.local`.
- E2E never reuses a server already running on port 3000 (it could be `npm run dev` on
  the dev database). Stop it first, or Playwright stops with a "port in use" error.
- Enquiry emails sent during e2e always go to Resend's test inbox
  `delivered@resend.dev` (forced in `playwright.config.ts`), never a real address.
- Rows created by e2e are tagged `[E2E]` and removed after the run. Each enquiry test sends
  its own `x-forwarded-for` header so repeated runs don't hit the 5-per-hour rate limit.
- `npm run db:test:reset` ends with `scripts/e2e-test-settings.ts`: fake WhatsApp, phone,
  email and a private office address (`showFullAddress=false`) on the **test** branch, used
  by property.spec.ts and contact.spec.ts. It also adds two partners that must never be public
  (`[E2E] Partner without consent`, `[E2E] Draft partner`), checked by about.spec.ts. Settings are cached and pages prerendered when
  the e2e server builds, so tests can't change them mid-run; states the build can't show are
  unit-tested on the component instead (e.g. `tests/unit/contact-cards.test.ts`).
- Reset the branch to a clean seed with `npm run db:test:reset`. Prisma refuses to let an
  AI agent run `migrate reset` without your explicit consent.

## 6. Admin tests with Clerk

Set up in Unit 12 with `@clerk/testing@2.2.55` (pinned to match `@clerk/nextjs@7.9.25`).

- **Test users** live in the Clerk **development** instance. Use `+clerk_test` emails, and turn
  off MFA for them.
  - Admin: `publicMetadata` `{"role": "admin"}`. Put its credentials in `.env.test` as
    `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD`.
  - Viewer, no role: `E2E_CLERK_VIEWER_USERNAME` and `E2E_CLERK_VIEWER_PASSWORD`.
- **Setup files** (`tests/e2e/setup/`):
  - `global-setup.ts` calls `clerkSetup()` once in the main process, so every worker gets the
    testing token.
  - The `admin-setup` project (`auth.setup.ts`) signs both users in at `/admin/sign-in` with
    `clerk.signIn` (password strategy). It saves their browser state to
    `playwright/.auth/{admin,viewer}.json`, which is git-ignored.
- **Projects:** `admin.spec.ts` and `admin-*.spec.ts` (e.g. `admin-properties.spec.ts`) run only in
  the `admin-desktop` and `admin-mobile` projects,
  which depend on `admin-setup`. Signed-in tests use
  `test.use({ storageState: storageStateFor("admin") })`. The public `desktop` and `mobile`
  projects never sign in.
- **Signing out:** a test that signs out must sign in on its own, in a fresh context. Signing
  out ends the session, and the saved state shares that session.
- **Commands:**
  - Admin tests only: `PW_CHANNEL=chrome npm run test:e2e -- --project=admin-desktop --project=admin-mobile`
  - Compare a signed-in page with the design (needs the saved state from an e2e run):
    `COMPARE_STORAGE_STATE=playwright/.auth/admin.json PW_CHANNEL=chrome npm run compare -- /admin admin.html`

### Photo uploads in e2e (Unit 15)

- `playwright.config.ts` sets `BLOB_PATH_PREFIX=e2e/` for its test server, so every upload
  goes under `e2e/properties/<id>/` in Blob. `tests/e2e/helpers/blob.ts` checks files exist
  and deletes everything under that folder in `afterAll`.
- Needs a real `BLOB_READ_WRITE_TOKEN` in `.env.test`, for a **public** Blob store.
- `tests/e2e/setup/global-teardown.ts` runs after every Playwright run, even an interrupted one.
  It removes properties titled "[SAMPLE] E2E …" (and their redirects) and every Blob file under
  `e2e/`, so a dropped connection can't leave test data behind. Since Unit 18 it also removes
  blog posts (+ POST redirects) and categories named "[SAMPLE] E2E …"; post covers and body
  images upload under `e2e/posts/<id>/` (`admin-posts.spec.ts`).

## 7. Before launch (Unit 21)

- The full suite passes on the Vercel preview URL:
  `PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app npm run test:e2e`.
- Lighthouse on mobile scores **90+ for accessibility, best practices and
  SEO**, and **80+ for performance**, on `/`, `/properties` and one
  property page.
- Manual phone check on a real Android and iPhone: preloader, menu drawer,
  gallery swipe, map, WhatsApp link opening the app, and the enquiry email
  arriving.
