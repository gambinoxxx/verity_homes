"use client";

// "Choose your package" on /invest/[slug] (Unit 17c): You invest / You receive / Gain / Per
// year / Select. Reuses the Unit 17b plot table (property.module.css): a table on wide screens,
// stacked cards on phones. Select → the enquiry form below gets the package (plan, amount,
// message, packageId), the WhatsApp button names it, and the page scrolls to the form.
import { useState } from "react";
import type { PackageView } from "@/lib/db/queries/invest";
import { formatNaira, nairaInputFromKobo } from "@/lib/format";
import { annualisedPercent, formatPercent, packageGainKobo } from "@/lib/invest";
import { selectPackage } from "@/lib/package-select";
import { packageEnquiryMessage, packageName, packageWhatsappMessage } from "@/lib/packages";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "../property/property.module.css";

type Props = { planId: string; planName: string; url: string; packages: PackageView[] };

const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

export function PackageOptions({ planId, planName, url, packages }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const hydrated = useHydrated();

  const choose = (p: PackageView) => {
    setChosen(p.id);
    selectPackage({
      planId,
      packageId: p.id,
      amount: nairaInputFromKobo(BigInt(p.amountKobo)),
      message: packageEnquiryMessage(p, planName),
      whatsappText: packageWhatsappMessage(p, planName, url),
    });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("start")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={styles.plotTable} role="table" aria-label="Investment packages">
      <div className={styles.plotHead} role="row">
        <span role="columnheader">You invest</span>
        <span role="columnheader">You receive (expected)</span>
        <span role="columnheader">Gain</span>
        <span role="columnheader">Per year</span>
        <span role="columnheader">
          <span className="sr-only">Choose</span>
        </span>
      </div>
      {packages.map((p) => {
        const selected = chosen === p.id;
        const pct = annualisedPercent(p);
        return (
          <div
            key={p.id}
            role="row"
            className={`${styles.plotRow} ${selected ? styles.plotChosen : ""}`}
            data-package-amount={p.amountKobo / 100}
          >
            <span role="cell" className={styles.plotSize}>
              <small>You invest</small>
              <b className={styles.plotPrice}>{formatNaira(p.amountKobo)}</b>
              {p.label ? <> · {p.label}</> : null}
            </span>
            <span role="cell">
              <small>You receive (expected)</small>
              <b>{formatNaira(p.returnAmountKobo)}</b> after {months(p.tenureMonths)}
            </span>
            <span role="cell" data-cell="gain">
              <small>Gain</small>
              {formatNaira(packageGainKobo(p))}
            </span>
            <span role="cell" data-cell="per-year">
              <small>Per year</small>
              {pct === null ? "—" : formatPercent(pct)}
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
                <span className="sr-only"> {packageName(p)}</span>
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
