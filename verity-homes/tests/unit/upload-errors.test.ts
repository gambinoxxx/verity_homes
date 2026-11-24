// Unit 20b: upload errors are friendly in every image field; the token route logs the real
// reason and answers JSON (401/403 auth, 500 when BLOB_READ_WRITE_TOKEN is missing).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnsupportedPhotoError } from "@/lib/image-resize";
import { UPLOAD_FAILED, UploadMessage, uploadErrorMessage } from "@/lib/upload-errors";

describe("uploadErrorMessage", () => {
  it("never shows technical text", () => {
    for (const e of [
      new Error("Vercel Blob: Failed to retrieve the client token"),
      new TypeError("Failed to fetch"),
      new Error("BlobAccessError: Access denied, please provide a valid token"),
      "boom",
      undefined,
    ]) {
      expect(uploadErrorMessage(e)).toBe(UPLOAD_FAILED);
    }
    expect(UPLOAD_FAILED).toBe(
      "The upload didn't work. Please try again; if it keeps failing, contact your web developer.",
    );
  });

  it("shows messages written for the admin as they are", () => {
    expect(uploadErrorMessage(new UploadMessage("This file is too large (over 40 MB)."))).toBe(
      "This file is too large (over 40 MB).",
    );
    const unsupported = new UnsupportedPhotoError();
    expect(uploadErrorMessage(unsupported)).toBe(unsupported.message);
  });
});

// ---------------------------------------------------------------- the token route

class ForbiddenError extends Error {}
const adminAccess = vi.fn<() => Promise<"admin" | "signed-out" | "forbidden">>();
vi.mock("@/lib/auth", () => ({ adminAccess, requireAdmin: vi.fn(), ForbiddenError }));
vi.mock("@/lib/db/queries/admin-properties", () => ({ getPhotoUploadState: vi.fn() }));
vi.mock("@/lib/db/queries/admin-posts", () => ({ postExists: vi.fn() }));
vi.mock("@/lib/db/queries/admin-trust", () => ({
  partnerExists: vi.fn(),
  testimonialExists: vi.fn(),
}));
class UploadRefused extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
const handleImageUpload = vi.fn();
vi.mock("@/lib/storage", () => ({
  UploadRefused,
  handleImageUpload,
  blobConfigured: () => Boolean(process.env.BLOB_READ_WRITE_TOKEN),
}));

const { POST } = await import("@/app/api/blob/upload/route");
const req = () =>
  new Request("http://localhost/api/blob/upload", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token", payload: {} }),
  });
const TOKEN = "vercel_blob_rw_test_secret_value";

describe("POST /api/blob/upload", () => {
  let logged: string[];
  beforeEach(() => {
    logged = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      logged.push(a.map(String).join(" "));
    });
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
    adminAccess.mockResolvedValue("admin");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("401 signed out, 403 not an admin — JSON, logged", async () => {
    adminAccess.mockResolvedValueOnce("signed-out");
    const a = await POST(req());
    expect(a.status).toBe(401);
    expect(await a.json()).toHaveProperty("error");
    adminAccess.mockResolvedValueOnce("forbidden");
    const b = await POST(req());
    expect(b.status).toBe(403);
    expect(await b.json()).toHaveProperty("error");
    expect(logged.join("\n")).toMatch(/401[\s\S]*403/);
  });

  it("500 and an exact log line when BLOB_READ_WRITE_TOKEN is missing", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error");
    expect(logged).toContain("image upload failed: BLOB_READ_WRITE_TOKEN is missing");
    expect(handleImageUpload).not.toHaveBeenCalled();
  });

  it("logs the real reason of an unexpected failure, never the token", async () => {
    handleImageUpload.mockRejectedValueOnce(new Error("Blob API answered 503"));
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(logged.join("\n")).toContain("Blob API answered 503");
    expect(logged.join("\n")).not.toContain(TOKEN);
  });

  it("a refusal keeps its status and is logged", async () => {
    handleImageUpload.mockRejectedValueOnce(new UploadRefused("That post no longer exists.", 404));
    const res = await POST(req());
    expect(res.status).toBe(404);
    expect(logged.join("\n")).toContain("That post no longer exists.");
  });
});
