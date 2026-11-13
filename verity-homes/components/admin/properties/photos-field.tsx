"use client";

// Photos panel (design/admin-property-edit.html, Unit 15). Each file is resized in the
// browser, uploaded to Vercel Blob (token from /api/blob/upload), then saved as a row by
// addPropertyPhoto — so an upload is kept even if the editor is left without saving.
// Order, alt text and removals are form state, saved with the property: removing a photo and
// leaving without saving loses nothing (its row and Blob file are deleted only on save).
import Image from "next/image";
import { useRef, useState } from "react";
import {
  type Control,
  type UseFormGetFieldState,
  type UseFormGetValues,
  type UseFormResetField,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { addPropertyPhoto } from "@/lib/actions/property-photos";
import { UnsupportedPhotoError, resizeForUpload } from "@/lib/image-resize";
import {
  ALT_MAX,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  photoPathname,
  photosMissingAlt,
} from "@/lib/property-photos";
import { uploadPhotoFile } from "@/lib/storage/client";
import type { PropertyData, PropertyFormValues } from "@/lib/validation/property";
import { AdminIcon } from "../icons";
import ui from "../ui.module.css";
import styles from "./editor.module.css";

export type PhotoInfo = { url: string; width: number | null; height: number | null };

type Upload = {
  key: string;
  name: string;
  progress: number;
  status: "resizing" | "uploading" | "saving" | "done" | "error";
  error?: string;
};

type Props = {
  /** null on /new: the property must be saved once before photos can be added. */
  propertyId: string | null;
  /** Blob folder prefix ("" or "e2e/"), from lib/storage blobPathPrefix(). */
  uploadPrefix: string;
  initialInfo: Record<string, PhotoInfo>;
  control: Control<PropertyFormValues, unknown, PropertyData>;
  register: UseFormRegister<PropertyFormValues>;
  setValue: UseFormSetValue<PropertyFormValues>;
  getValues: UseFormGetValues<PropertyFormValues>;
  getFieldState: UseFormGetFieldState<PropertyFormValues>;
  resetField: UseFormResetField<PropertyFormValues>;
  /** Id prefix of this editor instance. */
  scope: string;
};

const STATUS_TEXT: Record<Upload["status"], string> = {
  resizing: "Preparing…",
  uploading: "Uploading…",
  saving: "Saving…",
  done: "Uploaded",
  error: "Not uploaded",
};

export function PhotosField({
  propertyId,
  uploadPrefix,
  initialInfo,
  control,
  register,
  setValue,
  getValues,
  getFieldState,
  resetField,
  scope,
}: Props) {
  const photos = useFieldArray({ control, name: "photos", keyName: "key" });
  const watched = useWatch({ control, name: "photos" }) ?? [];
  const [info, setInfo] = useState<Record<string, PhotoInfo>>(initialInfo);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = uploads.some((u) => u.status !== "done" && u.status !== "error");

  const patch = (key: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));

  async function uploadOne(file: File, key: string, id: string) {
    try {
      if (file.size > MAX_PHOTO_BYTES * 4) throw new Error("This file is too large (over 40 MB).");
      const resized = await resizeForUpload(file);
      if (resized.blob.size > MAX_PHOTO_BYTES)
        throw new Error("This photo is still over 10 MB after resizing.");
      patch(key, { status: "uploading", progress: 0 });
      const pathname = photoPathname(uploadPrefix, id, file.name, resized.contentType);
      const blob = await uploadPhotoFile(pathname, resized.blob, {
        contentType: resized.contentType,
        onProgress: (p) => patch(key, { progress: Math.min(99, Math.round(p)) }),
      });
      patch(key, { status: "saving", progress: 99 });
      const saved = await addPropertyPhoto({
        propertyId: id,
        url: blob.url,
        pathname: blob.pathname,
        width: resized.width,
        height: resized.height,
        alt: "",
      });
      if (!saved.ok) throw new Error(saved.error);
      setInfo((m) => ({
        ...m,
        [saved.data.id]: {
          url: saved.data.url,
          width: saved.data.width,
          height: saved.data.height,
        },
      }));
      // The row is already saved, so the new photo alone isn't an unsaved change: if the list
      // wasn't edited yet, the new list becomes the saved baseline.
      const edited = getFieldState("photos").isDirty;
      photos.append({ id: saved.data.id, alt: "" }, { shouldFocus: false });
      if (!edited) resetField("photos", { defaultValue: getValues("photos") ?? [] });
      patch(key, { status: "done", progress: 100 });
    } catch (e) {
      const message =
        e instanceof UnsupportedPhotoError
          ? e.message
          : e instanceof Error && e.message
            ? e.message
            : "The upload failed. Please try again.";
      patch(key, { status: "error", error: message });
    }
  }

  async function addFiles(files: FileList | File[]) {
    if (!propertyId) return;
    const list = Array.from(files);
    if (!list.length) return;
    const room = MAX_PHOTOS - (getValues("photos") ?? []).length;
    const batch = list.map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      file: f,
      skip: i >= room,
    }));
    setUploads(
      batch.map(({ key, file, skip }) => ({
        key,
        name: file.name,
        progress: 0,
        status: skip ? "error" : "resizing",
        error: skip ? `A property can have up to ${MAX_PHOTOS} photos.` : undefined,
      })),
    );
    // One at a time: steadier on mobile data, and the order matches the files chosen.
    for (const b of batch) {
      if (!b.skip) await uploadOne(b.file, b.key, propertyId);
    }
  }

  const removePhoto = (index: number) => {
    const id = getValues(`photos.${index}.id`);
    photos.remove(index);
    if (!id) return;
    setValue("removedPhotoIds", [...(getValues("removedPhotoIds") ?? []), id], {
      shouldDirty: true,
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.fields.length || from === to) return;
    photos.move(from, to);
  };

  const missing = photosMissingAlt(watched.map((p) => ({ alt: p?.alt ?? "" })));
  const full = photos.fields.length >= MAX_PHOTOS;

  if (!propertyId) {
    return (
      <div className={styles.comingNext} data-testid="photos-save-first">
        <b>Save the draft first to add photos.</b> Photos are stored with the property, so it needs
        to exist before they can be uploaded.
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.drop} ${dragOver ? styles.dropOver : ""}`}
        role="button"
        tabIndex={full ? -1 : 0}
        aria-disabled={full || undefined}
        aria-describedby={`${scope}drop-hint`}
        onClick={() => !full && input.current?.click()}
        onKeyDown={(e) => {
          if (full) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragOver(false);
          if (!full) void addFiles(e.dataTransfer.files);
        }}
      >
        <AdminIcon name="plus" />
        <div>
          {full ? (
            <b>{MAX_PHOTOS} photos added — remove one to add another</b>
          ) : (
            <>
              <b>Drag photos here</b> or click to upload
            </>
          )}
        </div>
        <div id={`${scope}drop-hint`} className={styles.dropHint}>
          JPG, PNG or WebP · up to 10 MB each · resized automatically
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        hidden
        data-testid="photo-file-input"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = ""; // choosing the same file again still triggers a change
        }}
      />

      {uploads.length ? (
        <ul className={styles.uploads} aria-label="Uploads" aria-live="polite" aria-busy={busy}>
          {uploads.map((u) => (
            <li key={u.key} data-status={u.status}>
              <span className={styles.uploadName}>{u.name}</span>
              {u.status === "error" ? (
                <span className={styles.err}>{u.error}</span>
              ) : (
                <>
                  <progress
                    max={100}
                    value={u.progress}
                    aria-label={`Upload progress for ${u.name}`}
                  />
                  <span className={styles.uploadStatus}>
                    {STATUS_TEXT[u.status]}
                    {u.status === "uploading" ? ` ${u.progress}%` : ""}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {photos.fields.length ? (
        <ul className={styles.photos} aria-label="Photos">
          {photos.fields.map((field, i) => {
            const meta = info[field.id];
            const altId = `${scope}photo-alt-${i}`;
            return (
              <li
                key={field.key}
                className={`${styles.photo} ${dragFrom === i ? styles.dragging : ""}`}
                data-photo-id={field.id}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  move(dragFrom, i);
                  setDragFrom(null);
                }}
                onDragEnd={() => setDragFrom(null)}
              >
                {i === 0 ? <span className={styles.cover}>Cover</span> : null}
                {meta ? (
                  <Image
                    src={meta.url}
                    alt=""
                    width={meta.width ?? 240}
                    height={meta.height ?? 160}
                    sizes="(max-width: 860px) 45vw, 200px"
                    draggable={false}
                  />
                ) : (
                  <span className={styles.photoMissing} aria-hidden="true" />
                )}
                <div className={styles.ops}>
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    <AdminIcon name="up" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} down`}
                    disabled={i === photos.fields.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <AdminIcon name="down" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => removePhoto(i)}
                  >
                    <AdminIcon name="x" />
                  </button>
                </div>
                <span className={styles.dragHandle} aria-hidden="true">
                  ⠿ {i + 1}
                </span>
                <label className="sr-only" htmlFor={altId}>
                  Alt text for photo {i + 1}
                </label>
                <input
                  id={altId}
                  placeholder="Describe this photo"
                  maxLength={ALT_MAX}
                  {...register(`photos.${i}.alt`)}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      {missing.length ? (
        <div className={`${ui.alert} ${ui.warn} ${styles.altWarn}`} role="note">
          {missing.length === 1
            ? "One photo has no description. Add one — it helps Google and screen-reader users."
            : `${missing.length} photos have no description. Add them — it helps Google and screen-reader users.`}
        </div>
      ) : null}
    </>
  );
}
