"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { ArrowIcon } from "../icons";
import styles from "./services.module.css";

// Static copy from design/index.html. The design's 4th image is an Unsplash photo; the sample
// set has no interior shot, so villa.jpg stands in until real photos are supplied.
const SERVICES = [
  {
    title: "Property sales",
    text: "Homes for sale with support through inspection, documentation and handover.",
    img: "/samples/dusk.jpg",
  },
  {
    title: "Rentals",
    text: "Residential and commercial lettings with clear terms for landlords and tenants.",
    img: "/samples/tower.jpg",
  },
  {
    title: "Land",
    text: "Plots for homes and investment, with title documents reviewed before you commit.",
    img: "/samples/aerial.jpg",
  },
  {
    title: "Property management",
    text: "Rent collection, maintenance and tenant care, so your property runs smoothly.",
    img: "/samples/villa.jpg",
  },
  {
    title: "Development",
    text: "Planning and delivering new residential projects with trusted partners.",
    img: "/samples/building.jpg",
  },
] as const;

const DELAYS = ["", "d1", "d2", "d1", "d2"] as const;

/**
 * "Our services": one-open accordion (click, or hover on devices that can hover) that swaps
 * the photo beside it. The section id is "services" so the nav link /#services lands here.
 */
export function Services() {
  const [active, setActive] = useState(0);
  const uid = useId();
  const current = SERVICES[active] ?? SERVICES[0];

  return (
    <section className="sec" id="services" aria-labelledby="svc-h">
      <div className="container">
        <div className="sec-head">
          <div>
            <span className="eyebrow reveal">Our services</span>
            <h2 className="h2 reveal d1" id="svc-h">
              Everything property, <em>in one place.</em>
            </h2>
          </div>
          <p className="lead reveal d2">
            Whatever stage you&apos;re at — buying, letting, investing or building — one team
            handles it end to end.
          </p>
        </div>
        <div className={styles.list}>
          <div className={styles.items}>
            {SERVICES.map((s, i) => {
              const on = i === active;
              const btnId = `${uid}-b${i}`;
              const panelId = `${uid}-p${i}`;
              return (
                <div
                  key={s.title}
                  className={`${styles.item} ${on ? styles.active : ""} reveal ${DELAYS[i]}`}
                >
                  <h3>
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={on}
                      aria-controls={panelId}
                      onClick={() => setActive(i)}
                      onMouseEnter={() => {
                        if (window.matchMedia("(hover: hover)").matches) setActive(i);
                      }}
                    >
                      <span className={styles.n} aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.title}>{s.title}</span>
                      <span className={styles.ic} aria-hidden="true">
                        <ArrowIcon />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    aria-hidden={!on}
                    className={styles.panel}
                  >
                    <p>{s.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.visual}>
            {SERVICES.map((s, i) => (
              <div
                key={s.img}
                className={`media ${styles.shot} ${i === active ? styles.show : ""}`}
                aria-hidden="true"
              >
                <Image src={s.img} alt="" fill sizes="(max-width: 960px) 100vw, 610px" />
              </div>
            ))}
            <div className={styles.cap}>
              <b aria-live="polite">{current.title}</b>
              <a className={`btn btn-gold ${styles.capBtn}`} href="#contact">
                Enquire
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
