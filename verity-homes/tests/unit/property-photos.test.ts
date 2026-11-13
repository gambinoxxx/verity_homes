// lib/property-photos.ts (Unit 15): reorder, resize maths, upload pathnames, alt warnings.
import { describe, expect, it } from "vitest";
import {
  fitWithin,
  isPropertyPhotoPathname,
  moveItem,
  photoBaseName,
  photoPathname,
  photosMissingAlt,
  propertyIdFromPathname,
  roundCoord,
} from "@/lib/property-photos";
import { EMPTY_PROPERTY, propertySchema } from "@/lib/validation/property";

const ID = "cmwdewcs90000vo5m5qhcppl7";

describe("moveItem (reorder)", () => {
  it("moves up, down and to the cover spot", () => {
    expect(moveItem(["a", "b", "c", "d"], 2, 1)).toEqual(["a", "c", "b", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("ignores out-of-range or no-op moves, never mutates", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(list, 1, 2)).toEqual(["a", "b"]);
    expect(moveItem(list, 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(list, 0, 1)).not.toBe(list);
    expect(list).toEqual(["a", "b"]);
  });
});

describe("fitWithin (in-browser resize)", () => {
  it("scales the long side to 2400 px, keeping the ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1200, height: 2400 });
  });
  it("never upscales", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});

describe("upload pathnames", () => {
  it("properties/<id>/<clean-name>.<ext>, with an optional e2e/ prefix", () => {
    expect(photoBaseName("My Photo (1).HEIC")).toBe("my-photo-1");
    expect(photoBaseName(".jpg")).toBe("photo");
    expect(photoPathname("", ID, "Front View.JPG", "image/webp")).toBe(
      `properties/${ID}/front-view.webp`,
    );
    expect(photoPathname("e2e/", ID, "a.png", "image/jpeg")).toBe(`e2e/properties/${ID}/a.jpg`);
  });

  it("accepts only files directly in the property's folder (Blob adds a suffix)", () => {
    expect(isPropertyPhotoPathname("", ID, `properties/${ID}/front-view-AbC12xYz9.webp`)).toBe(
      true,
    );
    expect(isPropertyPhotoPathname("", ID, `properties/${ID}/x/../y.webp`)).toBe(false);
    expect(isPropertyPhotoPathname("", ID, `properties/other123456/x.webp`)).toBe(false);
    expect(isPropertyPhotoPathname("", ID, `properties/${ID}/x.gif`)).toBe(false);
    expect(isPropertyPhotoPathname("e2e/", ID, `properties/${ID}/x.jpg`)).toBe(false);
    expect(isPropertyPhotoPathname("", "Bad Id", `properties/Bad Id/x.jpg`)).toBe(false);
  });

  it("reads the property id back from a pathname", () => {
    expect(propertyIdFromPathname("e2e/", `e2e/properties/${ID}/a.jpg`)).toBe(ID);
    expect(propertyIdFromPathname("", `e2e/properties/${ID}/a.jpg`)).toBe(null);
    expect(propertyIdFromPathname("", `blog/${ID}/a.jpg`)).toBe(null);
  });
});

describe("alt text and coordinates", () => {
  it("lists photos without a description (1-based)", () => {
    expect(photosMissingAlt([{ alt: "Front" }, { alt: " " }, { alt: "" }])).toEqual([2, 3]);
  });
  it("coordinates use 6 decimals", () => {
    expect(roundCoord(6.44741234)).toBe("6.447412");
    expect(roundCoord(3.4)).toBe("3.400000");
  });
});

describe("photos in the property schema", () => {
  const base = { ...EMPTY_PROPERTY, title: "[SAMPLE] T" };
  it("passes order + alt and the removed ids to the save", () => {
    const r = propertySchema.safeParse({
      ...base,
      photos: [
        { id: "p2", alt: " Pool " },
        { id: "p1", alt: "" },
      ],
      removedPhotoIds: ["p3"],
    });
    expect(r.success && r.data.photos).toEqual({
      items: [
        { id: "p2", alt: "Pool" },
        { id: "p1", alt: "" },
      ],
      removedIds: ["p3"],
    });
  });
  it("no photos field → photos untouched", () => {
    const rest: Record<string, unknown> = { ...base };
    delete rest.photos;
    delete rest.removedPhotoIds;
    const r = propertySchema.safeParse(rest);
    expect(r.success && r.data.photos).toBe(undefined);
  });
  it("max 20 photos, alt ≤ 200 characters", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ id: `p${i}`, alt: "" }));
    expect(propertySchema.safeParse({ ...base, photos: many }).success).toBe(false);
    expect(
      propertySchema.safeParse({ ...base, photos: [{ id: "p1", alt: "x".repeat(201) }] }).success,
    ).toBe(false);
  });
});
