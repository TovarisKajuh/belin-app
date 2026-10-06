"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { OPEN_CAMERA_EVENT } from "@/lib/crew-events";

const MAX_PHOTOS = 12;
const MAX_DIM = 1600;
const QUALITY = 0.8;

// Decode via createImageBitmap when the browser supports the format, and fall
// back to an <img> element decode otherwise (Safari hands over HEIC from the
// camera roll, which createImageBitmap rejects but <img> decodes natively).
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function downscale(file: File): Promise<Blob> {
  const source = await decode(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.drawImage(source, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", QUALITY);
    });
  } finally {
    // Release the decoded bitmap and the canvas backing store immediately so a
    // burst of large phone photos cannot pile up hundreds of MB (audit finding H7).
    if ("close" in source) source.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function PhotoCapture({
  blobs,
  onChange,
  addLabel,
  cameraTarget = false,
}: {
  blobs: Blob[];
  onChange: (blobs: Blob[]) => void;
  addLabel: string;
  /** The report's photo card: the gold camera tab opens this input. */
  cameraTarget?: boolean;
}) {
  const t = useTranslations("crew");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  // The latest list, for the undo: by the time it is tapped, more photos may
  // have been added or removed, and a stale closure would drop them.
  const blobsRef = useRef(blobs);
  useEffect(() => {
    blobsRef.current = blobs;
  }, [blobs]);
  const [removed, setRemoved] = useState<{ blob: Blob; at: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );

  useEffect(() => {
    const urls = blobs.map((b) => URL.createObjectURL(b));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);

  useEffect(() => {
    if (!cameraTarget) return;
    const onOpen = (event: Event) => {
      event.preventDefault();
      wrapRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      // Synchronous inside the tab's click, so the browser still counts it as
      // the user's gesture and opens the camera.
      inputRef.current?.click();
    };
    window.addEventListener(OPEN_CAMERA_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CAMERA_EVENT, onOpen);
  }, [cameraTarget]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = MAX_PHOTOS - blobs.length;
    // Sequential, so at most one full-size bitmap is alive at a time (audit
    // finding H7). Each file is still isolated: one undecodable file must never
    // discard the rest (the bug the founder's phone test found).
    const good: Blob[] = [];
    let failed = 0;
    for (const file of files.slice(0, room)) {
      try {
        good.push(await downscale(file));
      } catch {
        failed += 1;
      }
    }
    setFailedCount(failed);
    if (failed > 0) console.error(`PhotoCapture: ${failed} photo(s) could not be processed`);
    if (good.length > 0) onChange([...blobsRef.current, ...good]);
  }

  // A tap on the photo itself used to delete it, with no way back: on a roof,
  // a thumb that meant to scroll lost a picture. Now only the corner button
  // removes, and the next four seconds can undo it.
  function removeAt(i: number) {
    const current = blobsRef.current;
    const blob = current[i];
    if (!blob) return;
    onChange(current.filter((_, idx) => idx !== i));
    setRemoved({ blob, at: i });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 4000);
  }

  function undoRemove() {
    if (!removed) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const now = blobsRef.current;
    setRemoved(null);
    if (now.length >= MAX_PHOTOS) return;
    const at = Math.min(removed.at, now.length);
    onChange([...now.slice(0, at), removed.blob, ...now.slice(at)]);
  }

  return (
    <div ref={wrapRef}>
      <div className="b-photos">
        {previews.map((src, i) => (
          <div key={src} className="b-photo">
            <img src={src} alt="" />
            <button type="button" className="b-photo-x" aria-label={t("report.removePhoto")} onClick={() => removeAt(i)}>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </span>
            </button>
          </div>
        ))}
        {blobs.length < MAX_PHOTOS && (
          <button type="button" className="b-photo-add" onClick={() => inputRef.current?.click()} aria-label={addLabel}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .8-.4l1-1.3a1 1 0 0 1 .8-.4h5.4a1 1 0 0 1 .8.4l1 1.3a1 1 0 0 0 .8.4h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={onPick}
        />
      </div>
      {removed && (
        <div className="b-photo-undo" role="status">
          <span>{t("report.photoRemoved")}</span>
          <button type="button" onClick={undoRemove}>
            {t("report.undo")}
          </button>
        </div>
      )}
      {failedCount > 0 && (
        <p className="b-sub" style={{ color: "var(--warn)", marginTop: 8 }}>
          {t("photoFailed", { count: failedCount })}
        </p>
      )}
    </div>
  );
}
