"use client";

export interface ResizedPhoto {
  blob: Blob;
  base64: string; // no data: prefix
  previewUrl: string; // data URL, safe to use as <img src>
}

export const PHOTO_DECODE_MESSAGE =
  "We couldn't open that photo. Some phone formats (like HEIC) don't work in every browser. Try a JPG or PNG, or take a screenshot of the photo and use that.";

/** Shrink a photo in the browser so uploads and the diagnosis request stay small. Always outputs JPEG. */
export async function resizePhoto(file: File, maxEdge = 1568, quality = 0.85): Promise<ResizedPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(PHOTO_DECODE_MESSAGE));
      el.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error(PHOTO_DECODE_MESSAGE);
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(PHOTO_DECODE_MESSAGE);
    // JPEG has no transparency; put white behind PNGs so they don't turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const previewUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = previewUrl.slice(previewUrl.indexOf(",") + 1);
    if (!base64) throw new Error(PHOTO_DECODE_MESSAGE);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return { blob: new Blob([bytes], { type: "image/jpeg" }), base64, previewUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}
