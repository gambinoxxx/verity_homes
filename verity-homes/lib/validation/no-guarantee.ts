// Investment copy must never promise returns (Unit 17): "guarantee", "guaranteed",
// "guarantees" (any case) are rejected in plan names, badges, summaries and FAQ text.
const GUARANTEE_RE = /\bguarantee(?:d|s)?\b/i;

export const GUARANTEE_MESSAGE =
  "Please don't use “guarantee” or “guaranteed” — investment returns can't be promised. Try “expected” or “target” instead.";

export function mentionsGuarantee(text: string): boolean {
  return GUARANTEE_RE.test(text);
}
