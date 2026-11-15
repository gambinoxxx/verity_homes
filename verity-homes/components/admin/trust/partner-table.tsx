"use client";

// /admin/partners list (Unit 19b), in the plans-table pattern: drag or ↑↓ to set the marquee
// order; permission marker; edit / delete (the dialog names the partner).
import Image from "next/image";
import Link from "next/link";
import { deletePartner, reorderPartners } from "@/lib/actions/partner";
import type { AdminPartnerRow } from "@/lib/db/queries/admin-trust";
import { DeleteButton } from "../delete-button";
import { AdminIcon } from "../icons";
import table from "../properties/properties.module.css";
import { MoveButtons, useReorder } from "../reorder";
import ui from "../ui.module.css";
import styles from "./trust.module.css";

export function PartnerTable({ rows }: { rows: AdminPartnerRow[] }) {
  const { order, move, dragProps, pending } = useReorder(rows, reorderPartners);
  return (
    <div className={table.tableWrap} role="region" aria-label="Partners" tabIndex={0}>
      <table className={table.table}>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Order</span>
            </th>
            <th scope="col">Partner</th>
            <th scope="col">Status</th>
            <th scope="col">Permission</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {order.map((p, i) => (
            <tr key={p.id} data-partner-id={p.id} {...dragProps(i)}>
              <td>
                <span className={table.handle} aria-hidden="true">
                  ⠿ {i + 1}
                </span>
              </td>
              <td>
                <div className={table.thumb}>
                  <span className={styles.thumbLogo}>
                    {p.logoUrl ? (
                      <Image
                        src={p.logoUrl}
                        alt=""
                        fill
                        sizes="72px"
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <span className={styles.initial} aria-hidden="true">
                        {p.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span>
                    <b>
                      <Link href={`/admin/partners/${p.id}`} prefetch={false}>
                        {p.name}
                      </Link>
                    </b>
                    <small>{p.website ? new URL(p.website).host : "No website"}</small>
                  </span>
                </div>
              </td>
              <td>
                <span className={`${ui.badge} ${p.status === "PUBLISHED" ? ui.pub : ui.draft}`}>
                  {p.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </td>
              <td>
                {p.consentConfirmed ? (
                  <span className={styles.consentOk}>✓ Given</span>
                ) : (
                  <span className={styles.consentMissing}>Not yet — can&apos;t publish</span>
                )}
              </td>
              <td>
                <div className={table.rowActions}>
                  <MoveButtons
                    index={i}
                    count={order.length}
                    label={p.name}
                    onMove={move}
                    disabled={pending}
                  />
                  <Link
                    className={ui.iconBtn}
                    href={`/admin/partners/${p.id}`}
                    prefetch={false}
                    aria-label={`Edit ${p.name}`}
                  >
                    <AdminIcon name="pen" />
                  </Link>
                  <DeleteButton
                    id={p.id}
                    title={p.name}
                    what="partner"
                    action={deletePartner}
                    body="It disappears from the partner strip, with its logo. This can't be undone."
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
