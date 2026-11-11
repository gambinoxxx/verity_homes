import styles from "./pill-ticker.module.css";

/**
 * Small gold-bordered pill with a scrolling uppercase label (the design's `.pill`), used
 * instead of an eyebrow on key sections. Screen readers get the label once.
 */
export function PillTicker({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`${styles.pill} ${className}`}>
      <span className="sr-only">{label}</span>
      <span className={styles.track} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={styles.item}>
            <span>{label}</span>
            <i>·</i>
          </span>
        ))}
      </span>
    </span>
  );
}
