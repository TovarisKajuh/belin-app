"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", QUALITY);
  });
}

export function PhotoCapture({
  blobs,
  onChange,
  addLabel,
}: {
  blobs: Blob[];
  onChange: (blobs: Blob[]) => void;
  addLabel: string;
}) {
  const t = useTranslations("crew");
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const urls = blobs.map((b) => URL.createObjectURL(b));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = MAX_PHOTOS - blobs.length;
    // Each file is processed independently: one undecodable file must never
    // silently discard the rest (the bug the founder's phone test found).
    const results = await Promise.allSettled(files.slice(0, room).map(downscale));
    const good = results
      .filter((r): r is PromiseFulfilledResult<Blob> => r.status === "fulfilled")
      .map((r) => r.value);
    const failed = results.length - good.length;
    setFailedCount(failed);
    if (failed > 0) console.error(`PhotoCapture: ${failed} photo(s) could not be processed`);
    if (good.length > 0) onChange([...blobs, ...good]);
  }

  function removeAt(i: number) {
    onChange(blobs.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="b-photos">
        {previews.map((src, i) => (
          <div key={src} className="b-photo" onClick={() => removeAt(i)}>
            <img src={src} alt="" />
          </div>
        ))}
        {blobs.length < MAX_PHOTOS && (
          <button type="button" className="b-photo-add" onClick={() => inputRef.current?.click()} aria-label={addLabel}>
            +
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
      {failedCount > 0 && (
        <p className="b-sub" style={{ color: "var(--warn)", marginTop: 8 }}>
          {t("photoFailed", { count: failedCount })}
        </p>
      )}
    </div>
  );
}
