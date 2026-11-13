"use client";

// Delete with a confirm dialog that names the property (native <dialog>: focus moves in, Esc
// closes, focus returns to the button). Used in the list rows and the editor's danger zone.
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { deleteProperty } from "@/lib/actions/property";
import { AdminIcon } from "../icons";
import ui from "../ui.module.css";

type Props = {
  id: string;
  title: string;
  /** "icon": the table's trash button; "panel": the editor's full-width danger button. */
  variant: "icon" | "panel";
  /** Where to go after deleting (the editor leaves its page); default: stay and refresh. */
  redirectTo?: string;
  /** Called just before navigating away (the editor clears its unsaved-changes guard). */
  onDeleted?: () => void;
};

export function DeletePropertyButton({ id, title, variant, redirectTo, onDeleted }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const headingId = `del-h-${id}`;

  const confirm = () =>
    startTransition(async () => {
      const res = await deleteProperty(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      dialog.current?.close();
      toast.success(res.message);
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
          Delete property
        </button>
      )}
      <dialog ref={dialog} className={ui.dialog} aria-labelledby={headingId}>
        <h2 id={headingId}>Delete “{title}”?</h2>
        <p>
          This removes the listing and all its photos and documents. Its web address will stop
          working. This can&apos;t be undone.
        </p>
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
            {pending ? "Deleting…" : "Delete property"}
          </button>
        </div>
      </dialog>
    </>
  );
}
