"use client";

// "Choose your plot" (Unit 17b): an estate's plot sizes with price, deposit and what each suits.
// Select → the enquiry form gets that plot (message + plotId), the WhatsApp links name it, and
// the page scrolls to #enquire. A table on wide screens; stacked cards on phones (CSS only).
import { useState, useSyncExternalStore } from "react";
import { formatNaira } from "@/lib/format";
import { isOfferActive, plotEnquiryMessage, plotName, plotWhatsappMessage } from "@/lib/plots";
import { selectPlot } from "@/lib/plot-select";
import { useHydrated } from "@/lib/use-hydrated";
import type { PlotView } from "@/lib/db/queries/properties";
import styles from "./property.module.css";

type Props = { propertyId: string; title: string; url: string; plots: PlotView[] };

export function PlotOptions({ propertyId, title, url, plots }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const hydrated = useHydrated();

  const choose = (p: PlotView) => {
    setChosen(p.id);
    selectPlot({
      propertyId,
      plotId: p.id,
      message: plotEnquiryMessage(title, p),
      whatsappText: plotWhatsappMessage(title, p, url),
    });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("enquire")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className={`${styles.block} ${styles.plots}`} aria-labelledby="plots-h" id="plots">
      <h2 id="plots-h">Choose your plot</h2>
      <div className={styles.plotTable} role="table" aria-label="Plot options">
        <div className={styles.plotHead} role="row">
          <span role="columnheader">Plot size</span>
          <span role="columnheader">Price</span>
          <span role="columnheader">Initial deposit</span>
          <span role="columnheader">Suitable for</span>
          <span role="columnheader">
            <span className="sr-only">Choose</span>
          </span>
        </div>
        {plots.map((p) => {
          const selected = chosen === p.id;
          return (
            <div
              key={p.id}
              role="row"
              className={`${styles.plotRow} ${selected ? styles.plotChosen : ""}`}
              data-plot-size={p.sizeSqm}
            >
              <span role="cell" className={styles.plotSize}>
                <small>Plot size</small>
                <b>{plotName(p)}</b>
              </span>
              <span role="cell">
                <small>Price</small>
                <b className={styles.plotPrice}>{formatNaira(p.priceKobo)}</b>
              </span>
              <span role="cell">
                <small>Initial deposit</small>
                {p.initialDepositKobo !== null ? formatNaira(p.initialDepositKobo) : "—"}
              </span>
              <span role="cell">
                <small>Suitable for</small>
                {p.suitableFor ?? "—"}
              </span>
              <span role="cell" className={styles.plotAction}>
                <button
                  type="button"
                  className={`btn ${selected ? "btn-gold" : "btn-navy"}`}
                  aria-pressed={selected}
                  disabled={!hydrated}
                  onClick={() => choose(p)}
                >
                  {selected ? "Selected" : "Select"}
                  <span className="sr-only"> {plotName(p)}</span>
                </button>
              </span>
            </div>
          );
        })}
      </div>
      <p className={styles.note}>
        Select a plot to send an enquiry or chat about it — we&apos;ll confirm availability.
      </p>
    </section>
  );
}

/** The offer note, hidden once offerEndsAt has passed (checked again in the browser). */
const noSubscribe = () => () => {};

export function OfferNote({ note, endsAt }: { note: string; endsAt: string | null }) {
  // In the browser: has it ended? On the server the cached data already dropped ended offers.
  const ended = useSyncExternalStore(
    noSubscribe,
    () => (endsAt ? !isOfferActive(endsAt, new Date()) : false),
    () => false,
  );
  if (ended) return null;
  return (
    <p className={styles.offer} data-testid="offer-note">
      <b>Offer:</b> {note}
      {endsAt ? (
        <small>
          {" "}
          · until{" "}
          {new Date(endsAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Africa/Lagos",
          })}
        </small>
      ) : null}
    </p>
  );
}
