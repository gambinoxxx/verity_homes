"use client";

// Delete with a confirm dialog that names the item (native <dialog>: focus moves in, Esc
// closes, focus returns to the button). Used for properties (Unit 14), plans and FAQs
// (Unit 17). `action` is the item's server action (Zod → requireAdmin → delete).
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { AdminIcon } from "./icons";
import ui from "./ui.module.css";

type Result = { ok: true; message?: string; data?: unknown } | { ok: false; error: string };

type Props = {
  id: string;
  /** Shown in the dialog and the button's label: “Delete “<title>”?” */
  title: string;
  /** "property", "plan", "FAQ" — for the button text. */
  what: string;
  action: (id: string) => Promise<Result>;
  /** What deleting removes / keeps (the dialog's body). */
  body: React.ReactNode;
  /** "icon": a table row's trash button; "panel": the editor's full-width danger button. */
  variant: "icon" | "panel";
  /** Where to go after deleting (an editor leaves its page); default: stay and refresh. */
  redirectTo?: string;
  /** Called just before navigating away (an editor clears its unsaved-changes guard). */
  onDeleted?: () => void;
};

export function DeleteButton({
  id,
  title,
  what,
  action,
  body,
  variant,
  redirectTo,
  onDeleted,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const headingId = `del-h-${id}`;

  const confirm = () =>
    startTransition(async () => {
      const res = await action(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      dialog.current?.close();
      toast.success(res.message ?? `Deleted “${title}”.`);
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          className={ui.iconBtn}
          aria-label={`Delete ${title}`}
          onClick={() => dialog.current?.showModal()}
        >
          <AdminIcon name="trash" />
        </button>
      ) : (
        <button
          type="button"
          className={`${ui.btn} ${ui.danger}`}
          style={{ width: "100%" }}
          onClick={() => dialog.current?.showModal()}
        >
          <AdminIcon name="trash" />
          Delete {what}
        </button>
      )}
      <dialog ref={dialog} className={ui.dialog} aria-labelledby={headingId}>
        <h2 id={headingId}>Delete “{title}”?</h2>
        <div className={ui.dialogBody}>{body}</div>
        <div className={ui.dialogActions}>
          <button
            type="button"
            className={`${ui.btn} ${ui.ghost}`}
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            Keep it
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.dangerSolid}`}
            onClick={confirm}
            disabled={pending}
          >
            {pending ? "Deleting…" : `Delete ${what}`}
          </button>
        </div>
      </dialog>
    </>
  );
}

/** The property dialog text (Unit 14). */
export const PROPERTY_DELETE_BODY =
  "This removes the listing and all its photos and documents. Its web address will stop working. This can't be undone.";
