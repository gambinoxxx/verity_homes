"use client";

// Post cover (Unit 18): resized in the browser and uploaded to Blob under posts/<id>/ with the
// Unit 15 upload route + resize logic, then kept in the form (coverUrl/coverPathname) until the
// post is saved. Replace uploads a new file; Remove clears the field. Files the post no longer
// uses are deleted on save (lib/actions/post.ts), so leaving without saving loses nothing.
import Image from "next/image";
import { useRef, useState } from "react";
import { UnsupportedPhotoError, resizeForUpload } from "@/lib/image-resize";
import { postImagePathname } from "@/lib/post-images";
import { MAX_PHOTO_BYTES } from "@/lib/property-photos";
import { uploadPhotoFile } from "@/lib/storage/client";
import { AdminIcon } from "../icons";
import editor from "../properties/editor.module.css";
import ui from "../ui.module.css";
import styles from "./posts.module.css";

export type UploadedImage = { url: string; pathname: string };

/** Resize + upload one image into the post's folder (cover or inline). */
export async function uploadPostImage(
  file: File,
  opts: {
    postId: string;
    prefix: string;
    kind: "cover" | "inline";
    onProgress?: (percent: number) => void;
  },
): Promise<UploadedImage> {
  if (file.size > MAX_PHOTO_BYTES * 4) throw new Error("This file is too large (over 40 MB).");
  const resized = await resizeForUpload(file);
  if (resized.blob.size > MAX_PHOTO_BYTES)
    throw new Error("This image is still over 10 MB after resizing.");
  const pathname = postImagePathname(
    opts.prefix,
    opts.postId,
    opts.kind,
    file.name,
    resized.contentType,
  );
  return uploadPhotoFile(pathname, resized.blob, {
    contentType: resized.contentType,
    onProgress: opts.onProgress,
  });
}

export function uploadErrorMessage(e: unknown): string {
  if (e instanceof UnsupportedPhotoError) return e.message;
  return e instanceof Error && e.message ? e.message : "The upload failed. Please try again.";
}

type Props = {
  postId: string | null;
  uploadPrefix: string;
  coverUrl: string;
  onChange: (image: UploadedImage | null) => void;
  /** id for the drop zone / save-first box, so error links can focus it. */
  id: string;
  error?: string;
};

export function CoverField({ postId, uploadPrefix, coverUrl, onChange, id, error }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ busy: boolean; progress: number; error?: string }>({
    busy: false,
    progress: 0,
  });

  if (!postId) {
    return (
      <div className={editor.comingNext} id={id} tabIndex={-1} data-testid="cover-save-first">
        <b>Save the draft first to add a cover image.</b> Images are stored with the post, so it
        needs to exist before they can be uploaded.
      </div>
    );
  }

  async function choose(files: FileList | null) {
    const file = files?.[0];
    if (!file || !postId) return;
    setStatus({ busy: true, progress: 0 });
    try {
      const img = await uploadPostImage(file, {
        postId,
        prefix: uploadPrefix,
        kind: "cover",
        onProgress: (p) => setStatus({ busy: true, progress: Math.min(99, Math.round(p)) }),
      });
      onChange(img);
      setStatus({ busy: false, progress: 100 });
    } catch (e) {
      setStatus({ busy: false, progress: 0, error: uploadErrorMessage(e) });
    }
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      hidden
      data-testid="cover-file-input"
      onChange={(e) => {
        void choose(e.target.files);
        e.target.value = "";
      }}
    />
  );

  const progress = status.busy ? (
    <p className={styles.status} role="status">
      Uploading cover… {status.progress}%
    </p>
  ) : status.error ? (
    <p className={editor.err} role="alert">
      {status.error}
    </p>
  ) : null;

  if (coverUrl) {
    return (
      <div data-testid="cover-field">
        <div className={styles.coverBox}>
          <Image src={coverUrl} alt="" fill sizes="(max-width: 1100px) 90vw, 640px" />
        </div>
        <div className={styles.coverActions}>
          <button
            type="button"
            id={id}
            className={`${ui.btn} ${ui.ghost}`}
            onClick={() => input.current?.click()}
            disabled={status.busy}
          >
            Replace cover
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.danger}`}
            onClick={() => onChange(null)}
            disabled={status.busy}
          >
            <AdminIcon name="trash" />
            Remove cover
          </button>
        </div>
        {fileInput}
        {progress}
      </div>
    );
  }

  return (
    <div data-testid="cover-field">
      <div
        id={id}
        className={editor.drop}
        role="button"
        tabIndex={0}
        aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
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
          <b>Add a cover image</b> — drag it here or click to upload
        </div>
        <div id={`${id}-hint`} className={editor.dropHint}>
          JPG, PNG or WebP · up to 10 MB · resized automatically · shown at the top of the article
        </div>
      </div>
      {fileInput}
      {progress}
      {error ? (
        <span id={`${id}-err`} className={editor.err}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
