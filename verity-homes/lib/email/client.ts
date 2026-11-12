// The only module that imports `resend` (architecture invariant 7). Server only.
import "server-only";
import { Resend } from "resend";
import { emailEnv } from "@/lib/env";

let client: Resend | null = null;

/** Lazily created so a missing RESEND_API_KEY only fails when an email is actually sent. */
export function resend(): Resend {
  return (client ??= new Resend(emailEnv().RESEND_API_KEY));
}
