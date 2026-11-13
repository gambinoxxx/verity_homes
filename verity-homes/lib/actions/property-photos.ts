"use server";

// Property photo actions (Unit 15). The browser uploads to Blob (token from
// app/api/blob/upload/route.ts), then calls addPropertyPhoto to save the row — Blob's
// completion webhook can't reach localhost, so the row is never saved from there.
// Order, alt text and removals are saved with the property (updateProperty).
// geocodeArea: "Centre on area" in the map picker, via Nominatim from the server.
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import { insertPropertyPhoto } from "@/lib/db/mutations/properties";
import { PROPERTIES_TAG } from "@/lib/db/queries/properties";
import { geocode } from "@/lib/geocode";
import { ALT_MAX, MAX_PHOTOS, isPropertyPhotoPathname } from "@/lib/property-photos";
import { blobPathPrefix, isBlobUrl } from "@/lib/storage";

export type PhotoActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const photoSchema = z.object({
  propertyId: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{8,40}$/),
  url: z.url().max(500),
  pathname: z.string().max(300),
  width: z.number().int().min(1).max(10_000),
  height: z.number().int().min(1).max(10_000),
  alt: z.string().trim().max(ALT_MAX).default(""),
});

async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e;
  }
}

export async function addPropertyPhoto(input: unknown): Promise<
  PhotoActionResult<{
    id: string;
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
  }>
> {
  const parsed = photoSchema.safeParse(input);
  const prefix = blobPathPrefix();
  if (
    !parsed.success ||
    !isBlobUrl(parsed.data.url) ||
    !isPropertyPhotoPathname(prefix, parsed.data.propertyId, parsed.data.pathname) ||
    !new URL(parsed.data.url).pathname.endsWith(`/${parsed.data.pathname}`)
  ) {
    return { ok: false, error: "That upload doesn't look right. Please try again." };
  }
  if (!(await isAdmin())) return { ok: false, error: "You don't have permission to do that." };
  const { propertyId, ...photo } = parsed.data;
  try {
    const saved = await insertPropertyPhoto(propertyId, photo, MAX_PHOTOS);
    if (!saved) {
      return {
        ok: false,
        error: `This property already has ${MAX_PHOTOS} photos, or no longer exists.`,
      };
    }
    updateTag(PROPERTIES_TAG);
    revalidatePath(`/properties/${saved.slug}`);
    revalidatePath("/properties");
    revalidatePath("/");
    return { ok: true, data: saved.photo };
  } catch (e) {
    console.error("addPropertyPhoto failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "The photo uploaded but couldn't be saved. Please try again." };
  }
}

const areaSchema = z.object({
  area: z.string().trim().min(1, "Add the area first").max(80),
  city: z.string().trim().max(80),
});

export async function geocodeArea(
  input: unknown,
): Promise<PhotoActionResult<{ lat: number; lng: number; label: string }>> {
  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add the area first, then try again." };
  if (!(await isAdmin())) return { ok: false, error: "You don't have permission to do that." };
  const query = [parsed.data.area, parsed.data.city || "Lagos", "Nigeria"].join(", ");
  return geocode(query);
}
