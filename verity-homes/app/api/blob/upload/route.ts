// Client-upload token route for property photos (Unit 15, @vercel/blob/client upload()).
// 401 signed out, 403 not an admin; then requireAdmin() again inside onBeforeGenerateToken
// with the property and photo-limit checks (lib/storage handlePhotoUpload). The browser saves
// the photo row itself afterwards (lib/actions/property-photos.ts addPropertyPhoto).
import { NextResponse } from "next/server";
import { adminAccess, requireAdmin } from "@/lib/auth";
import { getPhotoUploadState } from "@/lib/db/queries/admin-properties";
import { MAX_PHOTOS } from "@/lib/property-photos";
import { UploadRefused, handlePhotoUpload } from "@/lib/storage";

export async function POST(request: Request): Promise<NextResponse> {
  const access = await adminAccess();
  if (access === "signed-out") {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (access !== "admin") {
    return NextResponse.json({ error: "You don't have permission to upload." }, { status: 403 });
  }

  let body: Parameters<typeof handlePhotoUpload>[1];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const result = await handlePhotoUpload(request, body, async (propertyId) => {
      await requireAdmin();
      const state = await getPhotoUploadState(propertyId);
      if (!state.exists) throw new UploadRefused("That property no longer exists.", 404);
      if (state.photoCount >= MAX_PHOTOS)
        throw new UploadRefused(`A property can have up to ${MAX_PHOTOS} photos.`, 409);
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UploadRefused) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("photo upload token failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "The upload couldn't start. Please try again." },
      { status: 400 },
    );
  }
}
