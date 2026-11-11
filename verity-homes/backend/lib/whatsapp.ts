/** https://wa.me/<digits>?text=<message>, or null when no number is configured. */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
