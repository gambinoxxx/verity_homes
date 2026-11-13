"use client";

// Admin toasts (sonner). Mounted once in the (panel) layout so a toast survives navigation
// (e.g. "Deleted" after leaving the editor).
import { Toaster } from "sonner";

export function AdminToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ style: { fontFamily: "var(--font-sans)" } }}
    />
  );
}
