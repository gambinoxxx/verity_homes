// Client-upload token route for images (@vercel/blob/client upload()): property photos (Unit 15)
// and blog post covers + body images (Unit 18).
// 401 signed out, 403 not an admin; then requireAdmin() again inside onBeforeGenerateToken with
// the target checks (lib/storage handleImageUpload): the property exists and has room, or the
// post exists. The browser saves the result itself afterwards (addPropertyPhoto, or the post
// editor's save).
import { NextResponse } from "next/server";
import { adminAccess, requireAdmin } from "@/lib/auth";
import { getPhotoUploadState } from "@/lib/db/queries/admin-properties";
import { postExists } from "@/lib/db/queries/admin-posts";
import { MAX_PHOTOS } from "@/lib/property-photos";
import { UploadRefused, handleImageUpload } from "@/lib/storage";

export async function POST(request: Request): Promise<NextResponse> {
  const access = await adminAccess();
  if (access === "signed-out") {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (access !== "admin") {
    return NextResponse.json({ error: "You don't have permission to upload." }, { status: 403 });
  }

  let body: Parameters<typeof handleImageUpload>[1];
  try {
    body = await request.json();
  } catch {
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
      const state = await getPhotoUploadState(target.id);
      if (!state.exists) throw new UploadRefused("That property no longer exists.", 404);
      if (state.photoCount >= MAX_PHOTOS)
        throw new UploadRefused(`A property can have up to ${MAX_PHOTOS} photos.`, 409);
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UploadRefused) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("image upload token failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "The upload couldn't start. Please try again." },
      { status: 400 },
    );
  }
}
