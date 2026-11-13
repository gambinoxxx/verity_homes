// lib/storage remove() (Unit 14): only Blob-hosted files are deleted; /samples/ seed images and
// anything else are skipped, and the Blob token is read only when there is work to do.
import { beforeEach, describe, expect, it, vi } from "vitest";

const del = vi.fn<(urls: string[], opts: { token: string }) => Promise<void>>(async () => {});
vi.mock("@vercel/blob", () => ({ del }));
const blobEnv = vi.fn(() => ({ BLOB_READ_WRITE_TOKEN: "test-token" }));
vi.mock("@/lib/env", () => ({ blobEnv }));

const { remove, isBlobUrl } = await import("@/lib/storage");
const BLOB = "https://abc.public.blob.vercel-storage.com/properties/x.jpg";

beforeEach(() => vi.clearAllMocks());

describe("lib/storage remove()", () => {
  it("skips /samples/ and non-Blob URLs without reading the token", async () => {
    expect(await remove(["/samples/villa.jpg", "https://example.com/a.jpg"])).toEqual({
      removed: 0,
    });
    expect(blobEnv).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes only the Blob files", async () => {
    expect(await remove(["/samples/villa.jpg", BLOB])).toEqual({ removed: 1 });
    expect(del).toHaveBeenCalledWith([BLOB], { token: "test-token" });
  });

  it("recognises Blob hosts only over https", () => {
    expect(isBlobUrl(BLOB)).toBe(true);
    expect(isBlobUrl("http://abc.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isBlobUrl("https://blob.vercel-storage.com.evil.com/x.jpg")).toBe(false);
    expect(isBlobUrl("/samples/x.jpg")).toBe(false);
  });
});
