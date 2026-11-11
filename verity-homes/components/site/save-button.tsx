"use client";

import { useSyncExternalStore } from "react";
import {
  getSavedServerSnapshot,
  getSavedSnapshot,
  isSaved,
  subscribeSaved,
  toggleSaved,
} from "@/lib/saved-properties";
import { HeartIcon } from "./icons";

type SaveButtonProps = { slug: string; title: string; className?: string };

/** Heart toggle on a property card. Saved slugs live in localStorage on this device. */
export function SaveButton({ slug, title, className }: SaveButtonProps) {
  const snapshot = useSyncExternalStore(subscribeSaved, getSavedSnapshot, getSavedServerSnapshot);
  const saved = isSaved(snapshot, slug);
  return (
    <button
      type="button"
      className={className}
      aria-label={`Save ${title}`}
      aria-pressed={saved}
      onClick={() => toggleSaved(slug)}
    >
      <HeartIcon />
    </button>
  );
}
