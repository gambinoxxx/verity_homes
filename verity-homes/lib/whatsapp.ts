/** https://wa.me/<digits>?text=<message>, or null when no number is configured. */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** "Share on WhatsApp": https://wa.me/?text=<message> (no number — the visitor picks a chat). */
export function whatsappShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------- pre-filled messages (Unit 21)
// Every WhatsApp button names the page it was tapped on. Specific pages (property, plot, plan,
// package, post) build their own text with interestMessage(); the site-wide buttons (header,
// floating button, contact blocks) use pageWhatsappMessage() with the page's title at tap time.

const SITE_NAME = "Verity Homes and Properties";

/** "Hello Verity, I'm interested in <subject> (<url>)". */
export const interestMessage = (subject: string, url: string) =>
  `Hello Verity, I'm interested in ${subject} (${url})`;

/** "Hello Verity, I have a question about "<subject>" (<url>)". */
export const questionMessage = (subject: string, url: string) =>
  `Hello Verity, I have a question about "${subject}" (${url})`;

/** The page's own name from its <title> ("Duplex — Verity Homes and Properties" → "Duplex"). */
export function pageSubject(title: string): string | null {
  const t = title.trim();
  if (!t || t === SITE_NAME || t.startsWith(`${SITE_NAME} —`)) return null; // the home page
  return t.replace(/\s+[—|-]\s+Verity Homes and Properties$/, "").trim() || null;
}

/**
 * Message for a site-wide WhatsApp button. A property or plan page → "I'm interested in <name>";
 * any other page → "I have a question about "<page>""; the home page (or no title) → a plain
 * enquiry. Always ends with the page URL.
 */
export function pageWhatsappMessage(title: string, url: string): string {
  const subject = pageSubject(title);
  if (!subject) return `Hello Verity, I'd like to make an enquiry (${url})`;
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    /* relative or invalid: treat as a generic page */
  }
  return /^\/(?:properties|invest)\/(?!in\/)[^/]+\/?$/.test(path)
    ? interestMessage(subject, url)
    : questionMessage(subject, url);
}
