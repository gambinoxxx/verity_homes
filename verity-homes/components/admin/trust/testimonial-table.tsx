"use client";

// /admin/testimonials list (Unit 19b), in the plans-table pattern: drag or ↑↓ to set the home
// carousel order; consent marker; edit / delete (the dialog names the client).
import Image from "next/image";
import Link from "next/link";
import { deleteTestimonial, reorderTestimonials } from "@/lib/actions/testimonial";
import type { AdminTestimonialRow } from "@/lib/db/queries/admin-trust";
import { DeleteButton } from "../delete-button";
import { AdminIcon } from "../icons";
import table from "../properties/properties.module.css";
import { MoveButtons, useReorder } from "../reorder";
import ui from "../ui.module.css";
import styles from "./trust.module.css";

export function TestimonialTable({ rows }: { rows: AdminTestimonialRow[] }) {
  const { order, move, dragProps, pending } = useReorder(rows, reorderTestimonials);
  return (
    <div className={table.tableWrap} role="region" aria-label="Testimonials" tabIndex={0}>
      <table className={table.table}>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Order</span>
            </th>
            <th scope="col">Client</th>
            <th scope="col">Rating</th>
            <th scope="col">Status</th>
            <th scope="col">Permission</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {order.map((t, i) => (
            <tr key={t.id} data-testimonial-id={t.id} {...dragProps(i)}>
              <td>
                <span className={table.handle} aria-hidden="true">
                  ⠿ {i + 1}
                </span>
              </td>
              <td>
                <div className={table.thumb}>
                  <span className={styles.thumbAvatar}>
                    {t.avatarUrl ? (
                      <Image
                        src={t.avatarUrl}
                        alt=""
                        fill
                        sizes="40px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className={styles.initial} aria-hidden="true">
                        {t.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span>
                    <b>
                      <Link href={`/admin/testimonials/${t.id}`} prefetch={false}>
                        {t.name}
                      </Link>
                    </b>
                    <small>{t.serviceUsed}</small>
                  </span>
                </div>
              </td>
              <td>
                {t.rating ? (
                  <span className={styles.stars} aria-label={`${t.rating} out of 5`}>
                    {"★".repeat(t.rating)}
                  </span>
                ) : (
                  <span className={table.muted}>—</span>
                )}
              </td>
              <td>
                <span className={`${ui.badge} ${t.status === "PUBLISHED" ? ui.pub : ui.draft}`}>
                  {t.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </td>
              <td>
                {t.consentConfirmed ? (
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
                    label={t.name}
                    onMove={move}
                    disabled={pending}
                  />
                  <Link
                    className={ui.iconBtn}
                    href={`/admin/testimonials/${t.id}`}
                    prefetch={false}
                    aria-label={`Edit ${t.name}`}
                  >
                    <AdminIcon name="pen" />
                  </Link>
                  <DeleteButton
                    id={t.id}
                    title={t.name}
                    what="testimonial"
                    action={deleteTestimonial}
                    body="It disappears from the home page, with its photo. This can't be undone."
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
