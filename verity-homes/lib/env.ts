// Typed, validated environment, grouped by feature so a missing secret for one feature
// (Clerk, Blob, Resend) never breaks pages that don't use it — e.g. the Vercel build
// before those services are set up.
//
// - `env`: core variables every page needs. Validated at import; throws if invalid.
// - `clerkEnv()`, `blobEnv()`, `emailEnv()`: validated on first call; throw an error that
//   names the missing variables. Only lib/auth, lib/storage and lib/email may call them
//   (enforced in eslint.config.mjs).
//
// Errors name variables only, never their values.
import "server-only";
import { z } from "zod";

type Source = Record<string, string | undefined>;

function parseOrThrow<T extends z.ZodType>(feature: string, schema: T, source: Source): z.infer<T> {
  const parsed = schema.safeParse(source);
  if (parsed.success) return parsed.data;
  const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))].sort();
  throw new Error(
    `Missing or invalid environment variable(s) for ${feature}: ${names.join(", ")}. See .env.example.`,
  );
}

// ---------------------------------------------------------------- core (every page)

const coreSchema = z.object({
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(), // Prisma migrations only
  NEXT_PUBLIC_SITE_URL: z.url(),
  IP_HASH_SALT: z.string().min(16),
});

export type CoreEnv = z.infer<typeof coreSchema>;

/** Exported for tests; the app uses `env`. */
export function parseCoreEnv(source: Source = process.env): CoreEnv {
  return parseOrThrow("the site (core)", coreSchema, source);
}

export const env = parseCoreEnv();

// ---------------------------------------------------------------- per feature (lazy)

function lazyFeature<T extends z.ZodType>(feature: string, schema: T) {
  let cached: z.infer<T> | undefined;
  return (): z.infer<T> => (cached ??= parseOrThrow(feature, schema, process.env));
}

/** Clerk admin sign-in (Unit 12). Call only from lib/auth. */
export const clerkEnv = lazyFeature(
  "Clerk (admin sign-in)",
  z.object({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
  }),
);

/** Vercel Blob photo uploads (Unit 15). Call only from lib/storage. */
export const blobEnv = lazyFeature(
  "Vercel Blob (uploads)",
  z.object({
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
  }),
);

/** Resend enquiry emails (Unit 7). Call only from lib/email. */
export const emailEnv = lazyFeature(
  "Resend (enquiry email)",
  z.object({
    RESEND_API_KEY: z.string().min(1),
    ENQUIRY_NOTIFY_TO: z.email(),
    ENQUIRY_FROM: z.string().min(3),
  }),
);
