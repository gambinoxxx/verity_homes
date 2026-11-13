// Host shown in the editor's Google preview (NEXT_PUBLIC_SITE_URL), e.g. "verityhomes.com.ng".
export function siteHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host || "your-site";
  } catch {
    return "your-site";
  }
}
