import Image from "next/image";
import Link from "next/link";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "../icons";
import styles from "./ceo.module.css";

/**
 * "Meet our CEO". The bio and personal promise are owner-supplied (Open question 4), so they
 * stay as the design's visible placeholders until Esther provides them.
 */
export function Ceo() {
  return (
    <section className={`sec ${styles.ceo}`} aria-labelledby="ceo-h">
      <div className={`container ${styles.grid}`}>
        <div className={`${styles.photo} reveal`}>
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
        </div>
        <div>
          <span className="eyebrow reveal">Meet our CEO</span>
          <h2 className="h2 reveal d1" id="ceo-h">
            Built on trust. <em>Named for it.</em>
          </h2>
          <p className={`lead reveal d2 ${styles.lead1}`}>
            Every listing we present, every plan we offer and every promise we make is held to one
            standard: the truth. That&apos;s the name on the door.
          </p>
          <p className={`lead reveal d2 ${styles.lead2}`}>
            <span className="ph">
              [Short bio — Esther&apos;s background in real estate and property investment, the
              partners she works with, and why she founded Verity.]
            </span>
          </p>
          <blockquote className="reveal d3">
            <span className="ph">A one-line personal promise from Esther to her clients.</span>
          </blockquote>
          <div className={`${styles.actions} reveal d3`}>
            <a className="btn btn-navy" href="#contact">
              Book a consultation
              <ArrowIcon />
            </a>
            <Link className="btn btn-outline-dark" href="/about" prefetch={prefetchFor("/about")}>
              About Verity
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
