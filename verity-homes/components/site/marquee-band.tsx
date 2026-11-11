import { Fragment } from "react";
import { SparkIcon } from "./icons";
import styles from "./marquee-band.module.css";

type MarqueeBandProps = {
  words: readonly string[];
  /** White band with navy outline words (the design's `.band.light`). */
  light?: boolean;
  /** Scrolls the other way (the design's `.band.rev`). */
  reverse?: boolean;
};

const STYLE_CYCLE = ["", styles.outline, styles.italic] as const;

/**
 * Big scrolling word band. Words cycle solid → gold outline → gold italic. Decorative
 * (aria-hidden), so the words are repeated twice for a seamless loop.
 */
export function MarqueeBand({ words, light = false, reverse = false }: MarqueeBandProps) {
  const cls = [styles.band, light ? styles.light : "", reverse ? styles.reverse : ""].join(" ");
  return (
    <div className={cls} aria-hidden="true">
      <div className={styles.track}>
        {[0, 1].map((copy) =>
          words.map((w, i) => (
            <Fragment key={`${copy}-${w}`}>
              <span className={STYLE_CYCLE[i % 3]}>{w}</span>
              <SparkIcon />
            </Fragment>
          )),
        )}
      </div>
    </div>
  );
}
