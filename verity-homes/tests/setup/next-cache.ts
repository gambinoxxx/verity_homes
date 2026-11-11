// Test stub for `next/cache` (see vitest.config.mts). Outside a Next.js server the real
// cacheTag/cacheLife throw, so query functions marked "use cache" run uncached in tests.
// Arguments are ignored; app code is still type-checked against the real next/cache types.
const noop = () => {};
export const cacheTag = noop;
export const cacheLife = noop;
export const revalidateTag = noop;
export const updateTag = noop;
export const revalidatePath = noop;
