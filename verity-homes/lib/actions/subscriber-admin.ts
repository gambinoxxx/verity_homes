"use server";

// Delete one newsletter subscriber (Unit 19b) — for data-deletion requests under the privacy
// notice. Zod → requireAdmin() → delete. The address is never logged.
import { revalidatePath } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import { deleteSubscriberRow } from "@/lib/db/mutations/trust";
import { trustIdSchema } from "@/lib/validation/trust";

export type SubscriberActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function deleteSubscriber(id: unknown): Promise<SubscriberActionResult> {
  const sid = trustIdSchema.safeParse(id);
  if (!sid.success) return { ok: false, error: "That subscriber no longer exists." };
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, error: "You don't have permission to do that." };
    throw e;
  }
  try {
    const row = await deleteSubscriberRow(sid.data);
    if (!row) return { ok: false, error: "That subscriber no longer exists." };
    revalidatePath("/admin/subscribers");
    return { ok: true, message: `Removed ${row.email} from the newsletter list.` };
  } catch (e) {
    console.error("deleteSubscriber failed:", e instanceof Error ? e.name : "unknown");
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
