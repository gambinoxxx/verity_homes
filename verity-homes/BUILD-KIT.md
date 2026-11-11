# Verity Homes and Properties — build kit

Everything a coding agent needs to build the full website and admin panel.

## What's inside

```
verity-handoff/
├── AGENTS.md            ← rules every agent reads first (also copied to CLAUDE.md)
├── context/             ← the specs: overview, architecture, standards, UI, workflow, progress
├── design/              ← clickable HTML for every page (open design/index.html in a browser)
│   ├── index.html  properties.html  property.html  invest.html  about.html
│   ├── blog.html   post.html        contact.html   404.html
│   ├── admin.html  admin-properties.html  admin-property-edit.html  admin-enquiries.html
│   └── assets/ (verity.css, verity.js, admin.css)   img/ (sample photos)
├── backend/             ← ready and tested: Prisma schema + seed + config, lib helpers
├── testing/             ← TESTING.md, Playwright + Vitest configs, unit + e2e specs, compare script
├── prompts/PROMPTS.md   ← one copy-paste prompt per unit (21 units) + verify / fix / review prompts
└── brand/               ← logos, favicons, social profile image
```

## Before day 1 (about 30 minutes, all free tiers)

1. **GitHub:** create a private repo called `verity-homes`. Put this whole
   folder in it.
2. **Neon** (neon.tech): create the project `verity`. Copy the pooled and
   direct connection strings, then create a branch called `test`.
3. **Clerk** (clerk.com): create the app "Verity Admin" and copy its keys.
   Under *Restrictions*, turn off sign-ups.
4. **Vercel** (vercel.com): import the repo, then create a **Blob** store
   and copy `BLOB_READ_WRITE_TOKEN`.
5. **Resend** (resend.com): copy the API key. Domain verification comes in
   Unit 21.

Use a company email for these accounts if you can, so you can hand them
over to Esther later.

## How to build with any agent (saves credits)

1. Open the repo in your agent (Cursor, Windsurf, Codex, Copilot or Claude
   Code).
2. Paste the **Start-of-session prompt** from `prompts/PROMPTS.md`, then
   the prompt for the current unit.
3. When it says it's done, paste the **Verify prompt**. It has to show real
   test output and design comparisons.
4. Start a new chat for each unit.
5. Every 3–4 units, paste the **Review prompt** into a *different* model.

The cheaper models do well on the long, repetitive units: 8, 10, 13, 16,
17 and 19. Save the stronger model for the tricky ones:

- 2: database
- 6: property detail and map
- 7: enquiries
- 12: auth
- 15: photo uploads and map picker
- 21: launch

## Already done and tested (agents shouldn't redo these)

- Database schema: 13 tables, validated against Prisma 7. The seed fills
  every table with `[SAMPLE]` data, refuses to run in production, and
  includes a draft and a no-consent testimonial so tests can prove they
  stay hidden.
- `lib/format.ts`, `lib/maps.ts`, `lib/slug.ts`, `lib/whatsapp.ts` and
  `lib/validation/enquiry.ts` pass **25 unit tests** and strict
  TypeScript.
- All page designs render with no console errors and no sideways
  scrolling at 1440px and 390px.

## Maps: how they work

- **Public pages:** a free Google Maps embed with no API key, styled grey,
  plus an "Open in Google Maps" button.
- **Privacy:** by default, the property map shows the **area** (for
  example "Lekki, Lagos"), not the exact house. Esther can switch on
  "Show exact location" per property. The street address is never shown
  publicly.
- **Admin:** a draggable pin on an OpenStreetMap map (also free) sets the
  coordinates.

## Still needed from Esther

These are the open questions in `context/progress-tracker.md`:

- phone and WhatsApp number, and email
- whether to show the full address
- her bio
- investment plan figures and the legally reviewed wording
- partner logos, with permission
- real testimonials, with consent
- real listings and projects
