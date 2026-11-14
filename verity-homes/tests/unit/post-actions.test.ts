// Unit 18: every post + category action rejects a non-admin before writing; valid admin calls
// write, update the "posts" cache tag, keep the publish rules, and clean up Blob files.
// Auth, cache, DB writes and storage are mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_POST } from "@/lib/validation/post";

class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));
const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ updateTag, revalidatePath, cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/lib/db/queries/posts", () => ({ POSTS_TAG: "posts" }));

const ID = "post12345678";
const CAT = "cat123456789";
const BASE = `https://abc.public.blob.vercel-storage.com/posts/${ID}`;
const OLD_COVER = `${BASE}/old-Ab.webp`;
const NEW_COVER = `${BASE}/new-Cd.webp`;
const KEPT = `${BASE}/inline/kept-Ef.webp`;
const DROPPED = `${BASE}/inline/dropped-Gh.webp`;
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const state = {
  id: ID,
  slug: "old-slug",
  status: "DRAFT" as "DRAFT" | "PUBLISHED",
  title: "T",
  categoryId: CAT,
  excerpt: "E",
  coverUrl: OLD_COVER as string | null,
  coverAlt: "Alt",
  content: `${words(120)}\n\n![x](${KEPT})\n\n![y](${DROPPED})`,
  publishedAt: null as Date | null,
};

const m = {
  findPostState: vi.fn(async () => ({ ...state })),
  isPostSlugTaken: vi.fn<(slug: string, exceptId?: string) => Promise<boolean>>(async () => false),
  categoryExists: vi.fn(async () => true),
  insertPost: vi.fn(async () => ({ id: ID, slug: "t" })),
  savePost: vi.fn(async (_id: string, _d: unknown, slug: string) => ({ id: ID, slug })),
  setPostStatus: vi.fn(async () => ({ id: ID, slug: "old-slug", status: "PUBLISHED" })),
  deletePostRow: vi.fn(async () => ({
    slug: "old-slug",
    title: "T",
    coverUrl: OLD_COVER,
    content: "",
  })),
  isCategoryNameTaken: vi.fn(async () => false),
  isCategorySlugTaken: vi.fn(async () => false),
  insertCategory: vi.fn(async () => ({ id: CAT, name: "News", slug: "news" })),
  renameCategory: vi.fn(async () => ({ id: CAT, name: "News", slug: "news", previousSlug: "n" })),
  deleteCategoryRow: vi.fn(async () => ({ blocked: 0, name: "News", slug: "news" })),
};
vi.mock("@/lib/db/mutations/posts", () => m);

const remove = vi.fn(async (urls: readonly string[]) => ({ removed: urls.length }));
const listFolder = vi.fn(async () => [OLD_COVER, NEW_COVER, KEPT, DROPPED]);
vi.mock("@/lib/storage", () => ({
  remove,
  listFolder,
  blobPathPrefix: () => "",
  isBlobUrl: (u: string) => u.startsWith("https://") && u.includes(".blob.vercel-storage.com/"),
}));

const posts = await import("@/lib/actions/post");
const cats = await import("@/lib/actions/category");

const valid = { ...EMPTY_POST, title: "T", categoryId: CAT };
const READS = new Set<unknown>([
  m.findPostState,
  m.isPostSlugTaken,
  m.categoryExists,
  m.isCategoryNameTaken,
  m.isCategorySlugTaken,
]);
const writes = () =>
  Object.values(m)
    .filter((f) => !READS.has(f))
    .reduce((n, f) => n + f.mock.calls.length, 0) + remove.mock.calls.length;

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
});

const cases: [string, () => Promise<{ ok: boolean }>][] = [
  ["createPost", () => posts.createPost(valid)],
  ["updatePost", () => posts.updatePost(ID, valid)],
  ["publishPost", () => posts.publishPost(ID)],
  ["unpublishPost", () => posts.unpublishPost(ID)],
  ["deletePost", () => posts.deletePost(ID)],
  ["createCategory", () => cats.createCategory({ name: "News" })],
  ["updateCategory", () => cats.updateCategory(CAT, { name: "News" })],
  ["deleteCategory", () => cats.deleteCategory(CAT)],
];

describe("every action rejects a non-admin without writing", () => {
  for (const [name, run] of cases) {
    it(name, async () => {
      requireAdmin.mockRejectedValue(new ForbiddenError());
      expect(await run()).toEqual({ ok: false, error: "You don't have permission to do that." });
      expect(writes()).toBe(0);
      expect(updateTag).not.toHaveBeenCalled();
    });
  }

  it("a signed-out caller is redirected (the error is rethrown, nothing written)", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValue(redirect);
    await expect(posts.createPost(valid)).rejects.toBe(redirect);
    expect(writes()).toBe(0);
  });
});

describe("validation runs before the admin check", () => {
  it("invalid input never reaches requireAdmin()", async () => {
    const r = await posts.createPost({ ...valid, content: "[x](javascript:alert(1))" });
    expect(r).toMatchObject({ ok: false, fieldErrors: { content: expect.any(String) } });
    expect(requireAdmin).not.toHaveBeenCalled();
  });
});

describe("admin calls", () => {
  it("each successful action updates the posts tag and the public pages", async () => {
    for (const [name, run] of cases) {
      vi.clearAllMocks();
      const r = await run();
      expect(r.ok, name).toBe(true);
      expect(updateTag, name).toHaveBeenCalledWith("posts");
      expect(revalidatePath, name).toHaveBeenCalledWith("/blog");
      expect(revalidatePath, name).toHaveBeenCalledWith("/");
    }
  });

  it("create: an untouched slug is made unique from the title", async () => {
    m.isPostSlugTaken.mockImplementation(async (s: string) => s === "t");
    const r = await posts.createPost({ ...valid, slug: "" });
    expect(r.ok).toBe(true);
    expect(m.insertPost).toHaveBeenCalledWith(expect.anything(), "t-2", "user_admin");
    m.isPostSlugTaken.mockImplementation(async () => false);
  });

  it("save deletes the files the post no longer uses (old cover, image removed from body)", async () => {
    const r = await posts.updatePost(ID, {
      ...valid,
      coverUrl: NEW_COVER,
      coverPathname: `posts/${ID}/new-Cd.webp`,
      content: `Text\n\n![x](${KEPT})`,
    });
    expect(r.ok).toBe(true);
    expect(listFolder).toHaveBeenCalledWith(`posts/${ID}/`);
    expect(remove).toHaveBeenCalledWith([OLD_COVER, DROPPED]);
  });

  it("a cover from outside the post's folder is refused", async () => {
    const r = await posts.updatePost(ID, {
      ...valid,
      coverUrl: "https://abc.public.blob.vercel-storage.com/posts/other1234567/x.webp",
    });
    expect(r).toMatchObject({ ok: false, fieldErrors: { cover: expect.any(String) } });
    expect(m.savePost).not.toHaveBeenCalled();
  });

  it("publishing needs the publish rules; the first publish sets publishedAt", async () => {
    m.findPostState.mockResolvedValueOnce({ ...state, coverAlt: "" });
    const blocked = await posts.publishPost(ID);
    expect(blocked).toMatchObject({ ok: false, fieldErrors: { coverAlt: expect.any(String) } });
    expect(m.setPostStatus).not.toHaveBeenCalled();

    await posts.publishPost(ID);
    expect(m.setPostStatus).toHaveBeenCalledWith(ID, "PUBLISHED", expect.any(Date));

    vi.clearAllMocks();
    m.findPostState.mockResolvedValueOnce({ ...state, publishedAt: new Date("2026-01-01") });
    await posts.publishPost(ID);
    expect(m.setPostStatus).toHaveBeenCalledWith(ID, "PUBLISHED", undefined);
  });

  it("a published post can't be saved into an unpublishable state", async () => {
    m.findPostState.mockResolvedValueOnce({ ...state, status: "PUBLISHED" });
    const r = await posts.updatePost(ID, { ...valid, content: "too short" });
    expect(r).toMatchObject({ ok: false, fieldErrors: { content: expect.any(String) } });
    expect(m.savePost).not.toHaveBeenCalled();
  });

  it("renaming refreshes the old and the new post URL", async () => {
    await posts.updatePost(ID, {
      ...valid,
      slug: "new-slug",
      coverUrl: OLD_COVER,
      content: state.content,
    });
    expect(m.savePost).toHaveBeenCalledWith(ID, expect.anything(), "new-slug", expect.anything());
    expect(revalidatePath).toHaveBeenCalledWith("/blog/old-slug");
    expect(revalidatePath).toHaveBeenCalledWith("/blog/new-slug");
  });

  it("delete removes the cover and every file in the post's folder", async () => {
    const r = await posts.deletePost(ID);
    expect(r.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith([OLD_COVER, NEW_COVER, KEPT, DROPPED]);
  });

  it("delete keeps going (and reports success) when the Blob clean-up fails", async () => {
    remove.mockRejectedValueOnce(new Error("blob down"));
    const r = await posts.deletePost(ID);
    expect(r.ok).toBe(true);
  });
});

describe("categories", () => {
  it("delete is blocked while posts use the category", async () => {
    m.deleteCategoryRow.mockResolvedValueOnce({ blocked: 2, name: "News" } as never);
    const r = await cats.deleteCategory(CAT);
    expect(r).toEqual({
      ok: false,
      error: "Move 2 posts to another category first — “News” is still in use.",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("names are unique (any case); the slug follows the name", async () => {
    m.isCategoryNameTaken.mockResolvedValueOnce(true);
    expect(await cats.createCategory({ name: "news" })).toMatchObject({
      ok: false,
      fieldErrors: { name: "There's already a category with this name." },
    });
    await cats.updateCategory(CAT, { name: "  Market   Updates " });
    expect(m.renameCategory).toHaveBeenCalledWith(CAT, "Market Updates", "market-updates");
  });
});
