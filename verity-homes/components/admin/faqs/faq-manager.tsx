"use client";

// /admin/faqs (Unit 17): one list per page (Invest / General) with inline add + edit,
// publish/unpublish, reorder (drag + ↑↓) and delete with confirm. Reuses the properties table,
// the editor field styles and the shared delete/reorder components. Plain text; line breaks kept.
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { createFaq, deleteFaq, reorderFaqs, setFaqStatus, updateFaq } from "@/lib/actions/faq";
import type { AdminFaq } from "@/lib/db/queries/admin-plans";
import { FAQ_LIMITS, FAQ_PAGE_LABEL, type FaqPageKey } from "@/lib/validation/faq";
import { DeleteButton } from "../delete-button";
import { AdminIcon } from "../icons";
import editor from "../properties/editor.module.css";
import propStyles from "../properties/properties.module.css";
import { MoveButtons, useReorder } from "../reorder";
import ui from "../ui.module.css";

type Errors = Partial<Record<"question" | "answer", string>>;

/** Question + answer fields with errors under each (used to add and to edit). */
function FaqForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  idPrefix,
}: {
  initial: { question: string; answer: string };
  submitLabel: string;
  onSubmit: (v: { question: string; answer: string }) => Promise<Errors | null>;
  onCancel: () => void;
  idPrefix: string;
}) {
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const qId = `${idPrefix}-question`;
  const aId = `${idPrefix}-answer`;

  return (
    <form
      className={editor.rows}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await onSubmit({ question, answer });
          setErrors(res ?? {});
          if (res?.question) document.getElementById(qId)?.focus();
          else if (res?.answer) document.getElementById(aId)?.focus();
        });
      }}
    >
      <div className={editor.f}>
        <label htmlFor={qId}>Question</label>
        <input
          id={qId}
          value={question}
          maxLength={FAQ_LIMITS.question}
          aria-invalid={errors.question ? true : undefined}
          aria-describedby={errors.question ? `${qId}-err` : undefined}
          onChange={(e) => setQuestion(e.target.value)}
        />
        {errors.question ? (
          <span id={`${qId}-err`} className={editor.err}>
            {errors.question}
          </span>
        ) : null}
      </div>
      <div className={editor.f}>
        <label htmlFor={aId}>Answer</label>
        <textarea
          id={aId}
          className={editor.short}
          value={answer}
          maxLength={FAQ_LIMITS.answer}
          aria-invalid={errors.answer ? true : undefined}
          aria-describedby={`${aId}-hint${errors.answer ? ` ${aId}-err` : ""}`}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <span id={`${aId}-hint`} className={editor.hint}>
          Plain text. Line breaks are kept; leave a blank line between paragraphs.
        </span>
        {errors.answer ? (
          <span id={`${aId}-err`} className={editor.err}>
            {errors.answer}
          </span>
        ) : null}
      </div>
      <div className={propStyles.rowActions} style={{ justifyContent: "flex-start" }}>
        <button type="submit" className={`${ui.btn} ${ui.navy}`} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function FaqGroup({ page, faqs }: { page: FaqPageKey; faqs: AdminFaq[] }) {
  const router = useRouter();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { order, move, dragProps, pending } = useReorder(faqs, (ids) => reorderFaqs(page, ids));
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, start] = useTransition();
  const headingId = `${uid}-h`;

  const afterSave = (
    res:
      | { ok: true; message: string }
      | { ok: false; error: string; fieldErrors?: Record<string, string> },
  ) => {
    if (!res.ok) {
      toast.error(res.error);
      return (res.fieldErrors ?? {}) as Errors;
    }
    toast.success(res.message);
    router.refresh();
    return null;
  };

  return (
    <section className={ui.panel} aria-labelledby={headingId} data-faq-page={page}>
      <h2 id={headingId}>
        {FAQ_PAGE_LABEL[page]}
        <span className={ui.panelNote}>
          {order.length} {order.length === 1 ? "FAQ" : "FAQs"} ·{" "}
          {order.filter((f) => f.status === "PUBLISHED").length} published
        </span>
      </h2>
      {order.length ? (
        <div
          className={propStyles.tableWrap}
          role="region"
          aria-label={`${FAQ_PAGE_LABEL[page]} FAQs`}
          tabIndex={0}
        >
          <table className={propStyles.table} style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Order</span>
                </th>
                <th scope="col">Question</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {order.map((f, i) =>
                editing === f.id ? (
                  <tr key={f.id} data-faq-id={f.id}>
                    <td colSpan={4}>
                      <FaqForm
                        idPrefix={`${uid}-${f.id}`}
                        initial={f}
                        submitLabel="Save"
                        onCancel={() => setEditing(null)}
                        onSubmit={async (v) => {
                          const errors = afterSave(await updateFaq(f.id, { page, ...v }));
                          if (!errors) setEditing(null);
                          return errors;
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id} data-faq-id={f.id} {...dragProps(i)}>
                    <td>
                      <span className={propStyles.handle} aria-hidden="true">
                        ⠿ {i + 1}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "normal", minWidth: 260 }}>
                      <b>{f.question}</b>
                      <span className={propStyles.clamp}>{f.answer}</span>
                    </td>
                    <td>
                      <span
                        className={`${ui.badge} ${f.status === "PUBLISHED" ? ui.pub : ui.draft}`}
                      >
                        {f.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className={propStyles.rowActions}>
                        <MoveButtons
                          index={i}
                          count={order.length}
                          label={`“${f.question}”`}
                          onMove={move}
                          disabled={pending}
                        />
                        <button
                          type="button"
                          className={ui.iconBtn}
                          aria-label={`Edit “${f.question}”`}
                          onClick={() => setEditing(f.id)}
                        >
                          <AdminIcon name="pen" />
                        </button>
                        <button
                          type="button"
                          className={`${ui.btn} ${ui.ghost}`}
                          style={{ minHeight: 38, padding: "0 12px" }}
                          disabled={busy}
                          onClick={() =>
                            start(async () => {
                              afterSave(
                                await setFaqStatus(
                                  f.id,
                                  f.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                                ),
                              );
                            })
                          }
                        >
                          {f.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          <span className="sr-only"> “{f.question}”</span>
                        </button>
                        <DeleteButton
                          id={f.id}
                          title={f.question}
                          what="FAQ"
                          action={deleteFaq}
                          variant="icon"
                          body={<p>It disappears from the website. This can&apos;t be undone.</p>}
                        />
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={editor.emptyRows}>No FAQs here yet.</p>
      )}
      <div style={{ marginTop: 14 }}>
        {adding ? (
          <FaqForm
            idPrefix={`${uid}-new`}
            initial={{ question: "", answer: "" }}
            submitLabel="Add FAQ"
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              const errors = afterSave(await createFaq({ page, ...v }));
              if (!errors) setAdding(false);
              return errors;
            }}
          />
        ) : (
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={() => setAdding(true)}>
            <AdminIcon name="plus" />
            Add an FAQ{page === "GENERAL" ? " (general)" : ""}
          </button>
        )}
      </div>
    </section>
  );
}

export function FaqManager({ faqs }: { faqs: AdminFaq[] }) {
  return (
    <>
      {(["INVEST", "GENERAL"] as const).map((page) => {
        const group = faqs.filter((f) => f.page === page);
        return (
          <FaqGroup
            // re-sync the group's own order state whenever the server data changes
            key={`${page}:${group.map((f) => `${f.id}:${f.status}:${f.question}:${f.answer.length}`).join()}`}
            page={page}
            faqs={group}
          />
        );
      })}
    </>
  );
}
