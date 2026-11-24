// Unit 21 step 10: scripts/clear-samples.ts decisions (dry run by default, Blob files only
// under samples/ and only when no real row uses them).
import { describe, expect, it } from "vitest";
import {
  blobPathname,
  parseClearArgs,
  sampleBlobsToDelete,
  settingsFieldsWithSample,
  urlsIn,
} from "@/lib/sample-cleanup";

const BLOB = "https://abc123.public.blob.vercel-storage.com";

describe("parseClearArgs", () => {
  it("is a dry run unless --confirm is passed", () => {
    expect(parseClearArgs([])).toBe("dry-run");
    expect(parseClearArgs(["--dry-run"])).toBe("dry-run");
    expect(parseClearArgs(["--confirm"])).toBe("confirm");
  });
  it("refuses both flags and unknown flags", () => {
    expect(() => parseClearArgs(["--confirm", "--dry-run"])).toThrow(/not both/);
    expect(() => parseClearArgs(["--force"])).toThrow(/Unknown/);
  });
});

describe("sampleBlobsToDelete", () => {
  const a = `${BLOB}/samples/villa-a1b2.jpg`;
  const b = `${BLOB}/samples/dusk-c3d4.jpg`;
  const e2e = `${BLOB}/e2e/samples/x.jpg`;
  const realPhoto = `${BLOB}/properties/p1/real.jpg`;

  it("only Blob files under samples/ that no real row mentions", () => {
    const realText = JSON.stringify([{ images: [{ url: b }] }]);
    expect(sampleBlobsToDelete([a, b, e2e, a], realText)).toEqual([e2e, a].sort());
  });

  it("never public/samples images, other Blob folders or other hosts", () => {
    expect(
      sampleBlobsToDelete(
        ["/samples/villa.jpg", realPhoto, "https://example.com/samples/x.jpg"],
        "",
      ),
    ).toEqual([]);
  });
});

describe("helpers", () => {
  it("urlsIn finds Markdown image and link URLs", () => {
    expect(urlsIn(`![A](${BLOB}/samples/a.jpg) and [x](https://x.test/y).`)).toEqual([
      `${BLOB}/samples/a.jpg`,
      "https://x.test/y",
    ]);
    expect(urlsIn(null)).toEqual([]);
  });

  it("blobPathname is null for non-Blob URLs", () => {
    expect(blobPathname(`${BLOB}/samples/a%20b.jpg`)).toBe("samples/a b.jpg");
    expect(blobPathname("/samples/a.jpg")).toBeNull();
  });

  it("settingsFieldsWithSample lists text fields still marked [SAMPLE]", () => {
    expect(
      settingsFieldsWithSample({ ceoBio: "[SAMPLE] Bio", phone: "0803", showFullAddress: false }),
    ).toEqual(["ceoBio"]);
    expect(settingsFieldsWithSample(null)).toEqual([]);
  });
});
