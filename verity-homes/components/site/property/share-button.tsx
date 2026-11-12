"use client";

import { useEffect, useState } from "react";
import { ShareIcon } from "../icons";

type ShareButtonProps = {
  title: string;
  url: string;
  className?: string;
  noteClassName?: string;
  /** Accessible name (default "Share property"). */
  label?: string;
  /** Visible content (default: the share icon). */
  children?: React.ReactNode;
};

/**
 * Native share sheet where the browser has one (phones); otherwise copies the link and says
 * "Link copied". The message sits in a polite live region so screen readers hear it too.
 */
export function ShareButton({
  title,
  url,
  className,
  noteClassName,
  label = "Share property",
  children,
}: ShareButtonProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(""), 2500);
    return () => window.clearTimeout(t);
  }, [note]);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // The visitor closed the sheet: nothing to do. Any other failure falls back to copying.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch {
      setNote("Couldn't copy the link");
    }
  }

  return (
    <>
      <button type="button" className={className} aria-label={label} onClick={share}>
        {children ?? <ShareIcon />}
      </button>
      {/* aria-live without role="status": the enquiry form's success message owns that role. */}
      <span className={noteClassName} aria-live="polite">
        {note}
      </span>
    </>
  );
}
