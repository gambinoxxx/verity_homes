// Contact link helpers shared by the footer, the home contact block and the contact page.

/** "0803 000 0000" / "+234 803…" → "tel:+2348030000000" (every phone number is a tel: link). */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
  return `tel:+${intl}`;
}
