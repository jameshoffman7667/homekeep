// v2.2: shrink photos in the browser before upload (and before they are queued
// offline) so a phone camera's 4-8 MB JPEG doesn't fill the data volume or the
// backup. Long edge is capped at MAX_EDGE, re-encoded as JPEG at QUALITY with
// the camera orientation applied (so it displays upright without EXIF).
// Anything already small, not decodable here (e.g. HEIC on most desktops) or
// where re-encoding wouldn't help is returned unchanged.
export const MAX_EDGE = 1600;
export const QUALITY = 0.8;
const SKIP_BELOW_BYTES = 250 * 1024;

export async function shrinkImage(file) {
  try {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const longEdge = Math.max(bmp.width, bmp.height);
    if (longEdge <= MAX_EDGE && file.size <= SKIP_BELOW_BYTES) { bmp.close && bmp.close(); return file; }
    const scale = Math.min(1, MAX_EDGE / longEdge);
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close && bmp.close(); return file; }
    ctx.fillStyle = "#fff"; // PNG transparency -> white, JPEG has no alpha
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close && bmp.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch (e) {
    return file;
  }
}
