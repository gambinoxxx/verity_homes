"use client";

// Article body (Unit 18): a plain Markdown textarea with Write / Preview tabs and a small
// toolbar (heading, bold, italic, link, bullet list, quote, Insert image). Preview uses the
// public post page's renderer (components/site/blog/markdown.tsx), so it follows the same safety
// rules: no raw HTML, no javascript: links, images only from known hosts.
// Insert image: resize + upload to Blob (posts/<id>/inline/…), ask for alt text, then insert
// ![alt](url) where the cursor was. Reading time updates as she types (200 wpm, minimum 1).
import { useEffect, useRef, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Markdown } from "@/components/site/blog/markdown";
import { type Edit, type MarkdownAction, applyMarkdown, insertBlock } from "@/lib/markdown-format";
import { MIN_PUBLISH_WORDS, markdownImage, readingMinutes, wordCount } from "@/lib/post-content";
import { POST_LIMITS } from "@/lib/validation/post";
import { AdminIcon } from "../icons";
import editor from "../properties/editor.module.css";
import ui from "../ui.module.css";
import { type UploadedImage, uploadErrorMessage, uploadPostImage } from "./cover-field";
import styles from "./posts.module.css";

export type BodyTab = "write" | "preview";

type Props = {
  id: string;
  value: string;
  register: UseFormRegisterReturn<"content">;
  aria: { "aria-invalid"?: true; "aria-describedby"?: string };
  /** Writes the new body into the form (dirty). */
  onChange: (value: string) => void;
  tab: BodyTab;
  onTab: (tab: BodyTab) => void;
  postId: string | null;
  uploadPrefix: string;
  siteUrl: string;
  error?: string;
};

const TOOLS: { action: MarkdownAction; label: string; text: React.ReactNode; key?: string }[] = [
  { action: "heading", label: "Heading", text: "H2" },
  { action: "bold", label: "Bold", text: <b>B</b>, key: "b" },
  { action: "italic", label: "Italic", text: <span className={styles.italic}>I</span>, key: "i" },
  { action: "link", label: "Link", text: "Link", key: "k" },
  { action: "bullets", label: "Bullet list", text: "• List" },
  { action: "quote", label: "Quote", text: "“ Quote" },
];

export function BodyField({
  id,
  value,
  register,
  aria,
  onChange,
  tab,
  onTab,
  postId,
  uploadPrefix,
  siteUrl,
  error,
}: Props) {
  const ta = useRef<HTMLTextAreaElement | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const altInput = useRef<HTMLInputElement>(null);
  const saved = useRef<Edit | null>(null);
  const [upload, setUpload] = useState<{ busy: boolean; text: string; error?: boolean } | null>(
    null,
  );
  const [pending, setPending] = useState<UploadedImage | null>(null);
  const [alt, setAlt] = useState("");
  const [altError, setAltError] = useState<string | null>(null);
  const { ref, ...reg } = register;

  const selection = (): Edit => {
    const el = ta.current;
    return {
      value: el?.value ?? value,
      start: el?.selectionStart ?? value.length,
      end: el?.selectionEnd ?? value.length,
    };
  };

  const commit = (edit: Edit) => {
    onChange(edit.value);
    requestAnimationFrame(() => {
      const el = ta.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(edit.start, edit.end);
    });
  };

  const apply = (action: MarkdownAction) => {
    if (tab !== "write") onTab("write");
    commit(applyMarkdown(action, selection()));
  };

  // The alt-text dialog opens once an upload is waiting for its description.
  useEffect(() => {
    if (pending && !dialog.current?.open) dialog.current?.showModal();
  }, [pending]);

  async function chooseImage(files: FileList | null) {
    const f = files?.[0];
    if (!f || !postId) return;
    setUpload({ busy: true, text: "Uploading image… 0%" });
    try {
      const img = await uploadPostImage(f, {
        postId,
        prefix: uploadPrefix,
        kind: "inline",
        onProgress: (p) =>
          setUpload({ busy: true, text: `Uploading image… ${Math.min(99, Math.round(p))}%` }),
      });
      setUpload(null);
      setAlt("");
      setAltError(null);
      setPending(img);
    } catch (e) {
      setUpload({ busy: false, text: uploadErrorMessage(e), error: true });
    }
  }

  const insert = () => {
    const text = alt.replace(/\s+/g, " ").trim();
    if (!text) {
      setAltError("Describe the image — it's read out to people who can't see it.");
      altInput.current?.focus();
      return;
    }
    if (!pending) return;
    const at = saved.current ?? { value, start: value.length, end: value.length };
    // The body may have changed since the cursor was saved (only via this field): use its
    // current value with the saved position, clamped.
    const current = ta.current?.value ?? value;
    const start = Math.min(at.start, current.length);
    const end = Math.min(Math.max(at.end, start), current.length);
    dialog.current?.close();
    setPending(null);
    commit(insertBlock({ value: current, start, end }, markdownImage(text, pending.url)));
    setUpload({ busy: false, text: "Image inserted." });
  };

  const cancel = () => {
    dialog.current?.close();
    setPending(null);
    setUpload({
      busy: false,
      text: "Image not inserted. The uploaded file is removed when you save.",
    });
  };

  const words = wordCount(value);
  const minutes = readingMinutes(value);
  const tabId = (t: BodyTab) => `${id}-tab-${t}`;
  const panelId = (t: BodyTab) => `${id}-panel-${t}`;

  return (
    <div className={editor.f} data-testid="body-field">
      <div className={styles.bodyHead}>
        <div className={styles.tabs} role="tablist" aria-label="Article editor">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={tabId(t)}
              aria-selected={tab === t}
              aria-controls={panelId(t)}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => onTab(t)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const next = t === "write" ? "preview" : "write";
                  onTab(next);
                  document.getElementById(tabId(next))?.focus();
                }
              }}
            >
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
        <div className={styles.toolbar} role="toolbar" aria-label="Formatting" aria-controls={id}>
          {TOOLS.map((t) => (
            <button
              key={t.action}
              type="button"
              className={styles.tool}
              aria-label={t.label}
              title={t.key ? `${t.label} (Ctrl+${t.key.toUpperCase()})` : t.label}
              onMouseDown={(e) => e.preventDefault()} // keep the textarea's selection
              onClick={() => apply(t.action)}
            >
              {t.text}
            </button>
          ))}
          <button
            type="button"
            className={styles.tool}
            disabled={!postId || upload?.busy}
            title={postId ? "Insert image" : "Save the draft first to add images"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              saved.current = selection();
              file.current?.click();
            }}
          >
            <AdminIcon name="plus" />
            Insert image
          </button>
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            hidden
            data-testid="inline-file-input"
            onChange={(e) => {
              void chooseImage(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <label htmlFor={id} className="sr-only">
        Article (Markdown)
      </label>
      <div
        role="tabpanel"
        id={panelId("write")}
        aria-labelledby={tabId("write")}
        hidden={tab !== "write"}
      >
        <textarea
          {...reg}
          {...aria}
          id={id}
          ref={(el) => {
            ref(el);
            ta.current = el;
          }}
          className={styles.body}
          maxLength={POST_LIMITS.content}
          placeholder={
            "Write the article in Markdown.\n\n## A heading\n\nA paragraph with **bold** and a [link](https://example.com)."
          }
          onKeyDown={(e) => {
            if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
            const tool = TOOLS.find((t) => t.key === e.key.toLowerCase());
            if (tool) {
              e.preventDefault();
              apply(tool.action);
            }
          }}
        />
      </div>
      <div
        role="tabpanel"
        id={panelId("preview")}
        aria-labelledby={tabId("preview")}
        hidden={tab !== "preview"}
        className={styles.preview}
        data-testid="post-preview"
      >
        {tab === "preview" ? (
          value.trim() ? (
            <Markdown source={value} siteUrl={siteUrl} />
          ) : (
            <p className={styles.previewEmpty}>Nothing to preview yet.</p>
          )
        ) : null}
      </div>

      <div className={styles.bodyMeta}>
        <span data-testid="reading-time">
          <b>{minutes} min read</b> · {words.toLocaleString("en-NG")}{" "}
          {words === 1 ? "word" : "words"}
          {words < MIN_PUBLISH_WORDS ? ` (at least ${MIN_PUBLISH_WORDS} to publish)` : ""}
        </span>
        {upload ? (
          <span
            className={upload.error ? editor.err : styles.status}
            role={upload.error ? "alert" : "status"}
          >
            {upload.text}
          </span>
        ) : (
          <span>
            Markdown: ## heading, **bold**, _italic_, [link](https://…), - list, &gt; quote
          </span>
        )}
      </div>
      {error ? (
        <span id={`${id}-err`} className={editor.err}>
          {error}
        </span>
      ) : null}

      <dialog
        ref={dialog}
        className={ui.dialog}
        aria-labelledby={`${id}-alt-h`}
        onCancel={(e) => {
          e.preventDefault();
          cancel();
        }}
      >
        <h2 id={`${id}-alt-h`}>Describe this image</h2>
        <div className={ui.dialogBody}>
          <p>Alt text is read out by screen readers and shown if the image can&apos;t load.</p>
          <div className={editor.f}>
            <label htmlFor={`${id}-alt`}>Alt text</label>
            <input
              ref={altInput}
              id={`${id}-alt`}
              value={alt}
              maxLength={POST_LIMITS.coverAlt}
              aria-invalid={altError ? true : undefined}
              aria-describedby={altError ? `${id}-alt-err` : undefined}
              autoFocus
              onChange={(e) => {
                setAlt(e.target.value);
                if (altError) setAltError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // never submits the editor
                  insert();
                }
              }}
            />
            {altError ? (
              <span id={`${id}-alt-err`} className={editor.err}>
                {altError}
              </span>
            ) : null}
          </div>
        </div>
        <div className={ui.dialogActions}>
          <button type="button" className={`${ui.btn} ${ui.ghost}`} onClick={cancel}>
            Don&apos;t insert
          </button>
          <button type="button" className={`${ui.btn} ${ui.navy}`} onClick={insert}>
            Insert image
          </button>
        </div>
      </dialog>
    </div>
  );
}
