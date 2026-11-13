// Browser-side Blob upload (Unit 15): the only client importer of @vercel/blob/client.
// The token comes from app/api/blob/upload/route.ts, which checks the admin and the folder.
import { upload } from "@vercel/blob/client";

export const UPLOAD_ROUTE = "/api/blob/upload";

export type UploadedFile = { url: string; pathname: string };

export async function uploadPhotoFile(
  pathname: string,
  file: Blob,
  opts: { contentType: string; onProgress?: (percent: number) => void; signal?: AbortSignal },
): Promise<UploadedFile> {
  const res = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: UPLOAD_ROUTE,
    contentType: opts.contentType,
    abortSignal: opts.signal,
    onUploadProgress: ({ percentage }) => opts.onProgress?.(percentage),
  });
  return { url: res.url, pathname: res.pathname };
}
