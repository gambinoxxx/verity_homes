// Typed, validated environment. Import `env` instead of reading process.env directly.
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(), // migrations only
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  ENQUIRY_NOTIFY_TO: z.email(),
  ENQUIRY_FROM: z.string().min(3),
  NEXT_PUBLIC_SITE_URL: z.url(),
  IP_HASH_SALT: z.string().min(16),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment variables — see .env.example");
}
export const env = parsed.data;
