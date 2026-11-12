// The Verity mark: roof stroke + gold "V". Paths copied from the #logo symbol in design/index.html.
type LogoProps = {
  className?: string;
  /** Draw the whole mark (roof and V) in currentColor, e.g. navy on the gold intro badge. */
  monochrome?: boolean;
};

export function Logo({ className, monochrome = false }: LogoProps) {
  const accent = monochrome ? "currentColor" : "var(--accent-primary)";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path
        d="M8 18 L24 6 L40 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M11 18 L24 42 L37 18"
        fill="none"
        stroke={accent}
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M19 18 L24 27 L29 18"
        fill="none"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
