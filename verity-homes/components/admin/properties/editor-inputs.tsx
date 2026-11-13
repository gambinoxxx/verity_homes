"use client";

// Small inputs for the property editor: labelled field shell (hint + error, aria wiring),
// switch, naira price input, features chip input, and the unsaved-changes guard.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { formatNairaInput } from "@/lib/format";
import { fieldId } from "@/lib/validation/property";
import { AdminIcon } from "../icons";
import ui from "../ui.module.css";
import styles from "./editor.module.css";

/**
 * Id prefix per editor instance. Next 16 keeps the previous page mounted but hidden
 * (<Activity>), e.g. /new after the first save, so ids must not repeat between instances.
 */
export const IdScope = createContext("");

export function useIdScope() {
  return useContext(IdScope);
}

/** aria + id props for the control of `path` ("title", "documents.0.name"). */
export function controlProps(scope: string, path: string, error?: string, hint?: boolean) {
  const id = fieldId(path, scope);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

type FieldProps = {
  path: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  full?: boolean;
  /** For grouped controls (chips, prefix) the label points at the inner input. */
  children: React.ReactNode;
  className?: string;
};

export function Field({ path, label, hint, error, full, children, className }: FieldProps) {
  const id = fieldId(path, useIdScope());
  return (
    <div className={`${styles.f} ${full ? styles.full : ""} ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-err`} className={styles.err}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

type SwitchProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
};

/** Design .switch: label text (+ small note) on the left, toggle on the right. */
export function Switch({ label, note, className, ...input }: SwitchProps) {
  return (
    <label className={`${ui.switch} ${className ?? ""}`}>
      <span>
        {label}
        {note ? <small>{note}</small> : null}
      </span>
      <input type="checkbox" role="switch" {...input} />
    </label>
  );
}

/**
 * Naira amount with thousands separators added as she types. The caret stays after the same
 * digit it was after, so editing the middle of "250,000,000" doesn't jump to the end.
 */
export function PriceInput({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  ...aria
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  /** React Hook Form field.ref (a callback; lets the form focus this input on errors). */
  inputRef: (el: HTMLInputElement | null) => void;
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}) {
  const local = useRef<HTMLInputElement | null>(null);
  const caret = useRef<number | null>(null);

  useEffect(() => {
    if (caret.current === null || !local.current) return;
    const el = local.current;
    let digits = caret.current;
    let pos = 0;
    while (pos < el.value.length && digits > 0) {
      if (/[\d.]/.test(el.value[pos] ?? "")) digits--;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [value]);

  return (
    <input
      {...aria}
      ref={(el) => {
        local.current = el;
        inputRef(el);
      }}
      name={name}
      inputMode="decimal"
      autoComplete="off"
      placeholder="e.g. 250,000,000"
      value={value}
      onBlur={onBlur}
      onChange={(e) => {
        const raw = e.target.value;
        const at = e.target.selectionStart ?? raw.length;
        caret.current = raw.slice(0, at).replace(/[^\d.]/g, "").length;
        onChange(formatNairaInput(raw));
      }}
    />
  );
}

/** Features & amenities: Enter (or comma) adds a chip, × removes it, Backspace on empty removes the last. */
export function FeaturesInput({
  value,
  onChange,
  id,
  max,
  maxLength,
  invalid,
  describedBy,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id: string;
  max: number;
  maxLength: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim().slice(0, maxLength);
    if (!text) return;
    if (!value.some((v) => v.toLowerCase() === text.toLowerCase()) && value.length < max) {
      onChange([...value, text]);
    }
    setDraft("");
  };
  return (
    <div className={styles.chips} data-invalid={invalid || undefined}>
      <ul aria-label="Features added">
        {value.map((f, i) => (
          <li key={`${f}-${i}`} className={styles.chip}>
            {f}
            <button
              type="button"
              aria-label={`Remove ${f}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <AdminIcon name="x" />
            </button>
          </li>
        ))}
      </ul>
      <input
        id={id}
        value={draft}
        maxLength={maxLength}
        placeholder={
          value.length >= max ? `Up to ${max} features` : "Type a feature and press Enter"
        }
        disabled={value.length >= max}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault(); // never submits the form
            add();
          } else if (e.key === "Backspace" && draft === "" && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

/**
 * Warns before leaving with unsaved changes: the browser's own prompt on reload/close, and a
 * confirm() for in-app links (captured before Next's <Link> handles the click).
 */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download"))
        return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      if (!window.confirm("You have unsaved changes. Leave this page without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
