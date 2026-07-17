"use client";
import { useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 12;
const MAX_DIM = 1600;
const QUALITY = 0.8;

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", QUALITY);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = blobs.map((b) => URL.createObjectURL(b));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = MAX_PHOTOS - blobs.length;
    const scaled = await Promise.all(files.slice(0, room).map(downscale));
    onChange([...blobs, ...scaled]);
  }

  function removeAt(i: number) {
    onChange(blobs.filter((_, idx) => idx !== i));
  }

  return (
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
  );
}
