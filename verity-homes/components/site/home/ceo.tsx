import Image from "next/image";
import Link from "next/link";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "../icons";
import { Reveal } from "../reveal";
import styles from "./ceo.module.css";

/**
 * "Meet our CEO". The bio and personal promise are owner-supplied (Open question 4), so they
 * stay as the design's visible placeholders until Esther provides them.
 */
export function Ceo() {
  return (
    <section className={`sec ${styles.ceo}`} aria-labelledby="ceo-h">
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
        <div>
          <Reveal as="span" className="eyebrow">
            Meet our CEO
          </Reveal>
          <Reveal as="h2" className="h2" delay={1} id="ceo-h">
            Built on trust. <em>Named for it.</em>
          </Reveal>
          <Reveal as="p" className={`lead ${styles.lead1}`} delay={2}>
            Every listing we present, every plan we offer and every promise we make is held to one
            standard: the truth. That&apos;s the name on the door.
          </Reveal>
          <Reveal as="p" className={`lead ${styles.lead2}`} delay={2}>
            <span className="ph">
              [Short bio — Esther&apos;s background in real estate and property investment, the
              partners she works with, and why she founded Verity.]
            </span>
          </Reveal>
          <Reveal as="blockquote" delay={3}>
            <span className="ph">A one-line personal promise from Esther to her clients.</span>
          </Reveal>
          <Reveal className={styles.actions} delay={3}>
            <a className="btn btn-navy" href="#contact">
              Book a consultation
              <ArrowIcon />
            </a>
            <Link className="btn btn-outline-dark" href="/about" prefetch={prefetchFor("/about")}>
              About Verity
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
