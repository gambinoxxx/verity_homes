import type { FaqView } from "@/lib/db/queries/invest";
import { PlusIcon } from "../icons";
import { MarqueeEyebrow } from "../marquee-eyebrow";
import { Reveal } from "../reveal";
import styles from "./invest-page.module.css";

/**
 * "Before you invest": native <details>/<summary> (keyboard accessible by default). The landing
 * pages (Unit 21) reuse it with their own heading. Plain HTML: no FAQPage schema.
 */
export function FaqSection({
  faqs,
  title = (
    <>
      Before you <em>invest.</em>
    </>
  ),
  lead = "Straight answers to the questions investors ask us most.",
}: {
  faqs: FaqView[];
  title?: React.ReactNode;
  lead?: string;
}) {
  if (faqs.length === 0) return null;
  return (
    <section className="sec" aria-labelledby="faq-h">
      <div className={`container ${styles.split} ${styles.faqSplit}`}>
        <div className={styles.faqHead}>
          <Reveal as="span">
            <MarqueeEyebrow label="Questions" />
          </Reveal>
          <Reveal as="h2" className={`h2 ${styles.h2}`} id="faq-h">
            {title}
          </Reveal>
          <Reveal as="p" className={`lead ${styles.lead}`}>
            {lead}
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
