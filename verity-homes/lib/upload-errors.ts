// What an admin sees when an image upload fails (Unit 20b). The live site once showed the raw
// "Vercel Blob: Failed to retrieve the client token"; technical text never reaches the screen.
// Only messages written for the admin (UploadMessage, UnsupportedPhotoError) are shown as they
// are; everything else — Blob, network, token route — becomes UPLOAD_FAILED. The real reason is
// logged on the server by app/api/blob/upload/route.ts (and in the browser console here).
import { UnsupportedPhotoError } from "@/lib/image-resize";

export const UPLOAD_FAILED =
  "The upload didn't work. Please try again; if it keeps failing, contact your web developer.";

/** An upload problem worded for the admin (file too large, photo limit reached…). */
export class UploadMessage extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadMessage";
  }
}

export function uploadErrorMessage(e: unknown): string {
  if (e instanceof UploadMessage || e instanceof UnsupportedPhotoError) return e.message;
  if (typeof window !== "undefined") console.error("image upload failed:", e);
  return UPLOAD_FAILED;
}
