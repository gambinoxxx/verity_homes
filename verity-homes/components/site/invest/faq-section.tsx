import type { FaqView } from "@/lib/db/queries/invest";
import { PlusIcon } from "../icons";
import { PillTicker } from "../pill-ticker";
import { Reveal } from "../reveal";
import styles from "./invest-page.module.css";

/** "Before you invest": native <details>/<summary> (keyboard accessible by default). */
export function FaqSection({ faqs }: { faqs: FaqView[] }) {
  if (faqs.length === 0) return null;
  return (
    <section className="sec" aria-labelledby="faq-h">
      <div className={`container ${styles.split} ${styles.faqSplit}`}>
        <div className={styles.faqHead}>
          <Reveal as="span">
            <PillTicker label="Questions" />
          </Reveal>
          <Reveal as="h2" className={`h2 ${styles.h2}`} id="faq-h">
            Before you <em>invest.</em>
          </Reveal>
          <Reveal as="p" className={`lead ${styles.lead}`}>
            Straight answers to the questions investors ask us most.
          </Reveal>
        </div>
        <div className={styles.faq}>
          {faqs.map((faq, i) => (
            <Reveal as="details" key={faq.id} delay={i % 2 ? 1 : 0}>
              <summary>
                {faq.question}
                <span className={styles.ic} aria-hidden="true">
                  <PlusIcon />
                </span>
              </summary>
              {faq.answer
                .split(/\n\s*\n/)
                .filter((t) => t.trim())
                .map((t, k) => (
                  <p key={k}>{t.trim()}</p>
                ))}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
