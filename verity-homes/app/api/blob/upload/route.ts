// Client-upload token route for images (@vercel/blob/client upload()): property photos (Unit 15)
// blog post covers + body images (Unit 18), testimonial avatars and partner logos (Unit 19b).
// 401 signed out, 403 not an admin; then requireAdmin() again inside onBeforeGenerateToken with
// the target checks (lib/storage handleImageUpload): the property exists and has room, or the
// post exists. The browser saves the result itself afterwards (addPropertyPhoto, or the post
// editor's save).
// Unit 20b: every error is JSON { error }, and the real reason is console.error'd (never the
// token). The admin only ever sees lib/upload-errors.ts UPLOAD_FAILED for these: the Blob client
// turns any non-2xx here into "Failed to retrieve the client token".
import { NextResponse } from "next/server";
import { ForbiddenError, adminAccess, requireAdmin } from "@/lib/auth";
import { getPhotoUploadState } from "@/lib/db/queries/admin-properties";
import { postExists } from "@/lib/db/queries/admin-posts";
import { partnerExists, testimonialExists } from "@/lib/db/queries/admin-trust";
import { MAX_PHOTOS } from "@/lib/property-photos";
import { UploadRefused, blobConfigured, handleImageUpload } from "@/lib/storage";

export async function POST(request: Request): Promise<NextResponse> {
  const access = await adminAccess();
  if (access === "signed-out") {
    console.error("image upload refused: signed out (401)");
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (access !== "admin") {
    console.error("image upload refused: not an admin (403)");
    return NextResponse.json({ error: "You don't have permission to upload." }, { status: 403 });
  }
  if (!blobConfigured()) {
    console.error("image upload failed: BLOB_READ_WRITE_TOKEN is missing");
    return NextResponse.json({ error: "Uploads are not set up on this server." }, { status: 500 });
  }

  let body: Parameters<typeof handleImageUpload>[1];
  try {
    body = await request.json();
  } catch {
    console.error("image upload failed: the request body is not JSON (400)");
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const result = await handleImageUpload(request, body, async (target) => {
      await requireAdmin();
      if (target.kind === "post") {
        if (!(await postExists(target.id)))
          throw new UploadRefused("That post no longer exists.", 404);
        return;
      }
      if (target.kind === "testimonial") {
        if (!(await testimonialExists(target.id)))
          throw new UploadRefused("That testimonial no longer exists.", 404);
        return;
      }
      if (target.kind === "partner") {
        if (!(await partnerExists(target.id)))
          throw new UploadRefused("That partner no longer exists.", 404);
        return;
      }
      const state = await getPhotoUploadState(target.id);
      if (!state.exists) throw new UploadRefused("That property no longer exists.", 404);
      if (state.photoCount >= MAX_PHOTOS)
        throw new UploadRefused(`A property can have up to ${MAX_PHOTOS} photos.`, 409);
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UploadRefused) {
      console.error(`image upload refused (${e.status}): ${e.message}`);
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof ForbiddenError) {
      console.error("image upload refused: not an admin (403)");
      return NextResponse.json({ error: "You don't have permission to upload." }, { status: 403 });
    }
    console.error("image upload token failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "The upload couldn't start. Please try again." },
      { status: 400 },
    );
  }
}
