import styles from "./marquee-eyebrow.module.css";

const REPEAT = 3; // per group: wide enough to fill the pill even for short labels

/**
 * The scrolling eyebrow pill (design `.pill`), used above key section headings site-wide.
 * Screen readers get the label once; the moving copies are aria-hidden. Under
 * prefers-reduced-motion it stands still with one centred label.
 */
export function MarqueeEyebrow({ label, className = "" }: { label: string; className?: string }) {
  const group = (key: string) => (
    <span key={key} className={styles.group}>
      {Array.from({ length: REPEAT }, (_, i) => (
        <span key={i} className={styles.item}>
          <span>{label}</span>
          <i>·</i>
        </span>
      ))}
    </span>
  );
  return (
    <span className={`${styles.pill} ${className}`} data-eyebrow="">
      <span className="sr-only">{label}</span>
      <span className={styles.track} aria-hidden="true">
        {group("a")}
        {group("b")}
      </span>
    </span>
  );
}
