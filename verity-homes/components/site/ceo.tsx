import Image from "next/image";
import { Reveal } from "./reveal";
import styles from "./ceo.module.css";

/** Margin and layout classes for the text column (home and /about share them). */
export const ceoText = { lead1: styles.lead1, lead2: styles.lead2, actions: styles.actions };

/**
 * CEO section (design `.ceo`): cream band, arched portrait with a gold ring and a navy name
 * card, and a text column supplied by the page (home: "Meet our CEO"; /about: "Meet Esther.").
 * The bio and personal promise are owner-supplied (Open question 4), so pages keep the
 * design's visible placeholders until Esther provides them.
 */
export function CeoSection({ children }: { children: React.ReactNode }) {
  return (
    <section className={`sec on-cream ${styles.ceo}`} aria-labelledby="ceo-h">
      <div className={`container ${styles.grid}`}>
        <Reveal className={styles.photo}>
          <div className={styles.ring} aria-hidden="true" />
          <div className={styles.frame}>
            <Image
              src="/samples/ceo.jpg"
              alt="Esther Ezenagu, Founder and CEO of Verity Homes and Properties"
              fill
              sizes="(max-width: 960px) 460px, 520px"
            />
          </div>
          <div className={styles.card}>
            <b>Esther Ezenagu</b>
            <span>Founder &amp; CEO</span>
          </div>
        </Reveal>
        <div>{children}</div>
      </div>
    </section>
  );
}
