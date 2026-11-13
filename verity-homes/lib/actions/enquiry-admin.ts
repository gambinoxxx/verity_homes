"use server";

// Admin enquiry actions (Unit 16): Zod → requireAdmin() → write → refresh the admin pages, so
// the sidebar "Enquiries" badge and the dashboard's "New enquiries" update straight away.
// Opening an enquiry never changes its status — only these actions do.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import { updateEnquiryNote, updateEnquiryStatus } from "@/lib/db/mutations/enquiries";
import { NOTE_MAX } from "@/lib/enquiry-inbox";

export type EnquiryActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const idSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{8,40}$/);
const statusSchema = z.enum(["NEW", "CONTACTED", "CLOSED"]);
const noteSchema = z.string().max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`);

const MSG = {
  missing: "That enquiry no longer exists.",
  forbidden: "You don't have permission to do that.",
  failed: "Something went wrong. Please try again.",
} as const;

async function admin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e; // signed out: requireAdmin's redirect to sign-in
  }
}

const STATUS_DONE = {
  NEW: "Marked as new.",
  CONTACTED: "Marked as contacted.",
  CLOSED: "Enquiry closed.",
} as const;

export async function setEnquiryStatus(
  id: unknown,
  status: unknown,
): Promise<EnquiryActionResult<{ status: "NEW" | "CONTACTED" | "CLOSED"; message: string }>> {
  const pid = idSchema.safeParse(id);
  const st = statusSchema.safeParse(status);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!st.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const row = await updateEnquiryStatus(pid.data, st.data);
    if (!row) return { ok: false, error: MSG.missing };
    revalidatePath("/admin", "layout");
    return { ok: true, data: { status: row.status, message: STATUS_DONE[row.status] } };
  } catch (e) {
    console.error("setEnquiryStatus failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function saveEnquiryNote(
  id: unknown,
  note: unknown,
): Promise<EnquiryActionResult<{ note: string | null }>> {
  const pid = idSchema.safeParse(id);
  const text = noteSchema.safeParse(note);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!text.success) return { ok: false, error: text.error.issues[0]?.message ?? MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const value = text.data.trim() === "" ? null : text.data;
    const row = await updateEnquiryNote(pid.data, value);
    if (!row) return { ok: false, error: MSG.missing };
    revalidatePath("/admin/enquiries");
    return { ok: true, data: { note: row.note } };
  } catch (e) {
    console.error("saveEnquiryNote failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}
