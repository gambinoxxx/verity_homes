# AGENTS.md — read this first

This repo is the **Verity Homes and Properties** website: Next.js 16,
TypeScript, Tailwind 4, Prisma 7 with Neon, Clerk, Vercel Blob and Resend.

## Where things are

| Path | What it is | Can you edit it? |
| --- | --- | --- |
| `context/` | Specs: overview, architecture, code standards, UI, workflow rules, progress tracker | Yes, keep it in sync with the code |
| `design/` | Static HTML/CSS reference for every page, the visual source of truth | **No** |
| `testing/` | Test setup, unit specs, e2e specs, design-compare script | Copy into the repo in Unit 1 |
| `prompts/PROMPTS.md` | The prompt for each unit | No |
| `backend/` | Ready-made Prisma schema, seed, config and tested helpers | Copy into the repo in Units 1–2 |
| `brand/` | Logos, favicons and social image | No |

## Rules

1. Before any work, read every file in `context/` and `testing/TESTING.md`.
2. Work only on the unit marked `in progress` in
   `context/progress-tracker.md`.
3. Match `design/` closely: layout, spacing, colours, type, motion, and
   mobile behaviour at 390px.
4. Never invent business facts. Placeholders and `[SAMPLE]` data stay until
   the owner supplies real values.
5. Every mutation follows the same order: Zod validation, then
   `requireAdmin()` for admin actions, then the write, then
   `revalidatePath`.
6. Public pages show `PUBLISHED` rows only. The private property `address`
   never reaches the browser.
7. Finish every unit with the verification loop in `testing/TESTING.md` and
   the Definition of Done in `context/ai-workflow-rules.md`. Show the real
   command output.
8. Use stable package versions only. Install `prisma@7` and
   `@prisma/client@7` explicitly, because npm "latest" may be an 8.x RC.
   Check current docs for Clerk and Next 16 APIs before using them.

## Commands

```bash
npm run dev          # local app
npm run check        # lint + typecheck + unit tests + build
npm run test:e2e     # Playwright (desktop 1440 + mobile 390)
npm run compare -- /route design-file.html   # side-by-side with the design
npx prisma migrate dev --name <change>       # schema changes
npx prisma db seed                           # [SAMPLE] data (never in production)
```
