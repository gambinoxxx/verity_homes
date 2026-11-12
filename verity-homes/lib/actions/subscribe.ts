"use server";

// Footer newsletter sign-up. Same honeypot as the enquiry form; a repeat sign-up is fine.
import { z } from "zod";
import { upsertSubscriber } from "@/lib/db/mutations/enquiries";

export type SubscribeState = null | { ok: true; message: string } | { ok: false; error: string };

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  company: z.string().max(0).optional().default(""), // honeypot: must stay empty
});

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = subscribeSchema.safeParse({
    email: formData.get("email") ?? "",
    company: formData.get("company") ?? "",
  });
  if (!parsed.success) {
    const honeypot = parsed.error.issues.some((i) => i.path[0] === "company");
    return {
      ok: false,
      error: honeypot
        ? "Sorry, something went wrong."
        : (parsed.error.issues[0]?.message ?? "Enter a valid email address"),
    };
  }
  try {
    await upsertSubscriber(parsed.data.email);
    return { ok: true, message: "You're on the list — we'll email you new listings." };
  } catch (e) {
    console.error(`subscribe failed: ${e instanceof Error ? e.message : "unknown error"}`);
    return { ok: false, error: "Sorry, we couldn't add you just now. Please try again later." };
  }
}
