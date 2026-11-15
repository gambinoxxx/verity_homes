"use client";

// Testimonial avatar / partner logo (Unit 19b), in the post cover's pattern (Unit 18): resized in
// the browser (Unit 15 resize; logos keep transparency and are never upscaled), uploaded to Blob
// through /api/blob/upload into `testimonials/<id>/` or `partners/<id>/`, and kept in the form
// until saved. Replace uploads a new file; Remove clears the field; unused files are deleted on
// save (lib/actions/trust-images.ts).
import Image from "next/image";
import { useRef, useState } from "react";
import { UnsupportedPhotoError, resizeForUpload } from "@/lib/image-resize";
import { MAX_PHOTO_BYTES } from "@/lib/property-photos";
import { uploadPhotoFile } from "@/lib/storage/client";
import {
  AVATAR_MAX_SIDE,
  LOGO_MAX_SIDE,
  type TrustKind,
  isLogoContentType,
  trustImagePathname,
} from "@/lib/trust-images";
import { AdminIcon } from "../icons";
import editor from "../properties/editor.module.css";
import ui from "../ui.module.css";
import styles from "./trust.module.css";

type Props = {
  kind: TrustKind;
  recordId: string | null;
  uploadPrefix: string;
  url: string;
  onChange: (image: { url: string; pathname: string } | null) => void;
  /** id for the drop zone / save-first box (error links focus it). */
  id: string;
  /** "photo" / "logo" — used in the button texts. */
  noun: string;
  error?: string;
};

const ACCEPT = {
  testimonials: "image/jpeg,image/png,image/webp,image/heic,image/heif",
  partners: "image/png,image/jpeg,image/webp",
} as const;

export function TrustImageField({
  kind,
  recordId,
  uploadPrefix,
  url,
  onChange,
  id,
  noun,
  error,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ busy: boolean; progress: number; error?: string }>({
    busy: false,
    progress: 0,
  });
  const logo = kind === "partners";

  if (!recordId) {
    return (
      <div className={editor.comingNext} id={id} tabIndex={-1} data-testid="image-save-first">
        <b>Save the draft first to add a {noun}.</b> Images are stored with the record, so it needs
        to exist before they can be uploaded.
      </div>
    );
  }

  async function choose(files: FileList | null) {
    const file = files?.[0];
    if (!file || !recordId) return;
    if (logo && !isLogoContentType(file.type)) {
      setStatus({ busy: false, progress: 0, error: "Logos must be PNG, JPEG or WebP." });
      return;
    }
    setStatus({ busy: true, progress: 0 });
    try {
      if (file.size > MAX_PHOTO_BYTES * 4) throw new Error("This file is too large (over 40 MB).");
      const resized = await resizeForUpload(
        file,
        logo ? LOGO_MAX_SIDE : AVATAR_MAX_SIDE,
        logo ? 0.9 : 0.82,
        { keepAlpha: logo },
      );
      const pathname = trustImagePathname(
        uploadPrefix,
        kind,
        recordId,
        file.name,
        resized.contentType,
      );
      const img = await uploadPhotoFile(pathname, resized.blob, {
        contentType: resized.contentType,
        onProgress: (p) => setStatus({ busy: true, progress: Math.min(99, Math.round(p)) }),
      });
      onChange(img);
      setStatus({ busy: false, progress: 100 });
    } catch (e) {
      const message =
        e instanceof UnsupportedPhotoError
          ? e.message
          : e instanceof Error && e.message
            ? e.message
            : "The upload failed. Please try again.";
      setStatus({ busy: false, progress: 0, error: message });
    }
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT[kind]}
      hidden
      data-testid="image-file-input"
      onChange={(e) => {
        void choose(e.target.files);
        e.target.value = "";
      }}
    />
  );
  const progress = status.busy ? (
    <p className={editor.hint} role="status">
      Uploading {noun}… {status.progress}%
    </p>
  ) : status.error ? (
    <p className={editor.err} role="alert">
      {status.error}
    </p>
  ) : null;

  return (
    <div data-testid="image-field">
      {url ? (
        <div className={styles.imageRow}>
          <div className={logo ? styles.logoBox : styles.avatarBox}>
            <Image
              src={url}
              alt=""
              fill
              sizes={logo ? "240px" : "96px"}
              style={{ objectFit: logo ? "contain" : "cover" }}
            />
          </div>
          <div className={styles.imageActions}>
            <button
              type="button"
              id={id}
              className={`${ui.btn} ${ui.ghost}`}
              onClick={() => input.current?.click()}
              disabled={status.busy}
            >
              Replace {noun}
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.danger}`}
              onClick={() => onChange(null)}
              disabled={status.busy}
            >
              <AdminIcon name="trash" />
              Remove {noun}
            </button>
          </div>
        </div>
      ) : (
        <div
          id={id}
          className={editor.drop}
          role="button"
          tabIndex={0}
          aria-describedby={`${id}-hint`}
          onClick={() => !status.busy && input.current?.click()}
          onKeyDown={(e) => {
            if (status.busy) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              input.current?.click();
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            void choose(e.dataTransfer.files);
          }}
        >
          <AdminIcon name="plus" />
          <div>
            <b>Add a {noun}</b> — drag it here or click to upload
          </div>
          <div id={`${id}-hint`} className={editor.dropHint}>
            {logo
              ? "PNG (transparent is fine), JPEG or WebP · small logos are never enlarged"
              : "JPG, PNG or WebP · optional · resized automatically"}
          </div>
        </div>
      )}
      {fileInput}
      {progress}
      {error ? <span className={editor.err}>{error}</span> : null}
    </div>
  );
}
