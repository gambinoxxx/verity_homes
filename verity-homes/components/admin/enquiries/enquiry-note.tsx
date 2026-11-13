"use client";

// Private note (admin only): saves on blur when changed, with a "Saved" indicator.
import { useState } from "react";
import { saveEnquiryNote } from "@/lib/actions/enquiry-admin";
import { NOTE_MAX } from "@/lib/enquiry-inbox";
import styles from "./enquiries.module.css";

type State =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function EnquiryNote({ id, initial }: { id: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [state, setState] = useState<State>({ kind: "idle" });
  const fieldId = `note-${id}`;

  const save = async () => {
    if (value === saved) return;
    setState({ kind: "saving" });
    try {
      const res = await saveEnquiryNote(id, value);
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }
      setSaved(value);
      setState({ kind: "saved" });
    } catch {
      setState({ kind: "error", message: "Not saved — check your connection and try again." });
    }
  };

  return (
    <div className={styles.note}>
      <label htmlFor={fieldId}>Private note</label>
      <textarea
        id={fieldId}
        value={value}
        maxLength={NOTE_MAX}
        placeholder="e.g. Inspection booked for Saturday 11am"
        aria-describedby={`${fieldId}-status`}
        onChange={(e) => {
          setValue(e.target.value);
          if (state.kind !== "saving") setState({ kind: "idle" });
        }}
        onBlur={save}
      />
      <span
        id={`${fieldId}-status`}
        className={`${styles.noteStatus} ${state.kind === "error" ? styles.noteError : ""}`}
        role="status"
      >
        {state.kind === "saving"
          ? "Saving…"
          : state.kind === "saved"
            ? "Saved"
            : state.kind === "error"
              ? state.message
              : value !== saved
                ? "Saves when you click away."
                : "Only you can see this."}
      </span>
    </div>
  );
}
