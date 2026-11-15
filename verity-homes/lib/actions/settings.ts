"use server";

// Site settings actions (Unit 19a): Zod → requireAdmin() → upsert row id = 1 →
// updateTag("settings") (+ "posts": the blog author box reads the CEO bio) and
// revalidatePath("/", "layout"), so the header, footer, WhatsApp float, contact, about, privacy
// and every other page show the change on the next request — no redeploy.
// Logs never include values (phone, email, address…): only the error's name/code.
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import { saveSettings, setPrivacyReviewedAt } from "@/lib/db/mutations/settings";
import { POSTS_TAG } from "@/lib/db/queries/posts";
import { SETTINGS_TAG } from "@/lib/db/queries/settings";
import { settingsSchema } from "@/lib/validation/settings";

export type SettingsActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  failed: "Something went wrong. Please try again.",
} as const;

async function admin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e; // signed out: the redirect to sign-in
  }
}

/** A safe description of an error for the logs: never its message (it may echo values). */
function errorTag(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) return `${(e as { code: unknown }).code}`;
  return e instanceof Error ? e.name : "unknown";
}

function refresh() {
  updateTag(SETTINGS_TAG);
  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
}

export async function updateSettings(input: unknown): Promise<SettingsActionResult> {
  const r = settingsSchema.safeParse(input);
  if (!r.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of r.error.issues)
      fieldErrors[i.path.map(String).join(".") || "form"] ??= i.message;
    return { ok: false, error: MSG.check, fieldErrors };
  }
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    await saveSettings(r.data);
    refresh();
    return { ok: true, message: "Settings saved — the website shows them now." };
  } catch (e) {
    console.error("updateSettings failed:", errorTag(e));
    return { ok: false, error: MSG.failed };
  }
}

/** "Mark privacy notice as reviewed" (true) / "Mark as draft again" (false). */
export async function setPrivacyReviewed(reviewed: unknown): Promise<SettingsActionResult> {
  const r = z.boolean().safeParse(reviewed);
  if (!r.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    await setPrivacyReviewedAt(r.data ? new Date() : null);
    refresh();
    revalidatePath("/admin", "layout"); // the dashboard checklist
    return {
      ok: true,
      message: r.data
        ? "Privacy notice marked as reviewed — the Draft banner is gone."
        : "Privacy notice is a draft again — the banner is back.",
    };
  } catch (e) {
    console.error("setPrivacyReviewed failed:", errorTag(e));
    return { ok: false, error: MSG.failed };
  }
}
