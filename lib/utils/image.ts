/**
 * Reads an image File, downscales it so the longest edge is at most `maxEdge`
 * px, and returns base64 JPEG data (no data: prefix) plus its media type.
 *
 * Downscaling keeps the upload small (receipts don't need full resolution to
 * be read) and re-encoding to JPEG normalizes the format for the AI provider.
 */
export async function downscaleImageToBase64(
  file: File,
  maxEdge = 1500,
  quality = 0.85,
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process the image. Please try another photo.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = jpegDataUrl.split(",")[1] ?? "";
  return { base64, mediaType: "image/jpeg" };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Could not load the image. Please try another photo."));
    img.src = src;
  });
}
