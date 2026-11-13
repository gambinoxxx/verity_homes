"use client";

// /admin/plans table (Unit 17), in the properties-list pattern (same styles). Client-side so
// rows can be dragged; up/down buttons do the same for keyboard users. Order = /invest order.
import Link from "next/link";
import { deletePlan, reorderPlans } from "@/lib/actions/plan";
import type { AdminPlanRow } from "@/lib/db/queries/admin-plans";
import { PAYOUT_LABEL, formatNaira } from "@/lib/format";
import { DeleteButton } from "../delete-button";
import { AdminIcon } from "../icons";
import propStyles from "../properties/properties.module.css";
import { MoveButtons, useReorder } from "../reorder";
import ui from "../ui.module.css";

export function rateLabel(rate: number): string {
  return rate === 0 ? "Not set" : `${rate}% p.a.`;
}

const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

function deleteBody(p: AdminPlanRow) {
  return (
    <>
      <p>It disappears from /invest and the home page. This can&apos;t be undone.</p>
      <p>
        {p.enquiryCount === 0
          ? "No enquiries mention this plan."
          : `${p.enquiryCount} ${p.enquiryCount === 1 ? "enquiry mentions" : "enquiries mention"} this plan. They stay in your inbox (without the plan link).`}
      </p>
    </>
  );
}

export function PlanTable({ plans }: { plans: AdminPlanRow[] }) {
  const { order, move, dragProps, pending } = useReorder(plans, reorderPlans);
  return (
    <div className={propStyles.tableWrap} role="region" aria-label="Investment plans" tabIndex={0}>
      <table className={propStyles.table}>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Order</span>
            </th>
            <th scope="col">Plan</th>
            <th scope="col">Minimum</th>
            <th scope="col">Return</th>
            <th scope="col">Tenure</th>
            <th scope="col">Payout</th>
            <th scope="col">Status</th>
            <th scope="col">Gold card</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {order.map((p, i) => (
            <tr key={p.id} data-plan-id={p.id} {...dragProps(i)}>
              <td>
                <span className={propStyles.handle} aria-hidden="true">
                  ⠿ {i + 1}
                </span>
              </td>
              <td>
                <div className={propStyles.thumb}>
                  <span>
                    <b>
                      <Link href={`/admin/plans/${p.id}`} prefetch={false}>
                        {p.name}
                      </Link>
                    </b>
                    {p.badge ? <small>{p.badge}</small> : null}
                  </span>
                </div>
              </td>
              <td>{formatNaira(BigInt(p.minimumKobo))}</td>
              <td className={p.returnRatePercent === 0 ? propStyles.muted : undefined}>
                {rateLabel(p.returnRatePercent)}
              </td>
              <td>{months(p.tenureMonths)}</td>
              <td>{PAYOUT_LABEL[p.payoutFrequency]}</td>
              <td>
                <span className={`${ui.badge} ${p.status === "PUBLISHED" ? ui.pub : ui.draft}`}>
                  {p.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </td>
              <td>
                {p.highlighted ? (
                  <span className={propStyles.feat}>★ Highlighted</span>
                ) : (
                  <span className={propStyles.muted}>—</span>
                )}
              </td>
              <td>
                <div className={propStyles.rowActions}>
                  <MoveButtons
                    index={i}
                    count={order.length}
                    label={p.name}
                    onMove={move}
                    disabled={pending}
                  />
                  <Link
                    className={ui.iconBtn}
                    href={`/admin/plans/${p.id}`}
                    prefetch={false}
                    aria-label={`Edit ${p.name}`}
                  >
                    <AdminIcon name="pen" />
                  </Link>
                  <DeleteButton
                    id={p.id}
                    title={p.name}
                    what="plan"
                    action={deletePlan}
                    body={deleteBody(p)}
                    variant="icon"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
