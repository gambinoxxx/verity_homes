import Image from "next/image";
import Link from "next/link";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "../icons";
import { Logo } from "../logo";
import { Reveal } from "../reveal";
import styles from "./intro.module.css";

const POINTS = [
  { title: "Homes & land", text: "Houses, apartments and plots for sale and rent.", delay: 1 },
  {
    title: "Investment plans",
    text: "Grow your money through structured real estate projects.",
    delay: 2,
  },
  { title: "Management", text: "We look after your property and your tenants.", delay: 1 },
  { title: "Development", text: "New residential projects, from plan to handover.", delay: 2 },
] as const;

/** "Who we are": arched photo, inset photo, rotating gold badge, four service points. */
export function Intro() {
  return (
    <section className={styles.intro} id="about" aria-labelledby="intro-h">
      <div className={`container ${styles.grid}`}>
        <div className={styles.media}>
          <Reveal variant="image" className={`${styles.m1} media`}>
            <Image
              src="/samples/tower.jpg"
              alt="Modern residential tower"
              fill
              sizes="(max-width: 960px) 72vw, 440px"
            />
          </Reveal>
          <Reveal variant="image" className={`${styles.m2} media`}>
            <Image
              src="/samples/dusk.jpg"
              alt="Modern home lit at dusk"
              fill
              sizes="(max-width: 960px) 48vw, 300px"
            />
          </Reveal>
          <div className={styles.badge} aria-hidden="true">
            <svg className={styles.ring} viewBox="0 0 120 120">
              <defs>
                <path
                  id="intro-badge-circle"
                  d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0"
                />
              </defs>
              <text>
                <textPath href="#intro-badge-circle">VERITY · HOMES · PROPERTIES · </textPath>
              </text>
            </svg>
            <Logo className={styles.mark} monochrome />
          </div>
        </div>
        <div>
          <Reveal as="span" className="eyebrow">
            Who we are
          </Reveal>
          <Reveal as="h2" className="h2" delay={1} id="intro-h">
            Real estate built on <em>truth.</em>
          </Reveal>
          <Reveal as="p" className={`lead ${styles.lead}`} delay={2}>
            Verity means truth — and that is how we work. Verity Homes and Properties Ltd helps
            families, professionals and investors buy, rent, develop and invest in property with
            confidence, through one team that walks with you from first enquiry to the day you get
            your keys.
          </Reveal>
          <div className={styles.points}>
            {POINTS.map((p) => (
              <Reveal key={p.title} delay={p.delay}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className={styles.cta} delay={3}>
            <Link className="link-arrow" href="/contact" prefetch={prefetchFor("/contact")}>
              Book a consultation <ArrowIcon />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
