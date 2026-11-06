// Small images made in the browser: a square crop of a photo (for club logos) and a JPEG copy on
// white (for the hand-written PDFs, which embed JPEG only).

async function bitmapOf(src: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(src);
  const url = URL.createObjectURL(src);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const sizeOf = (img: ImageBitmap | HTMLImageElement): [number, number] =>
  'naturalWidth' in img ? [img.naturalWidth, img.naturalHeight] : [img.width, img.height];

/** Draws the centre square of `src` at size × size, on white when `background` is set. */
async function squareCanvas(src: Blob, size: number, background?: string): Promise<HTMLCanvasElement> {
  const img = await bitmapOf(src);
  const [w, h] = sizeOf(img);
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode the image'))), type, quality),
  );

/**
 * A square logo (the centre of the image) of size × size, as WebP where the browser can encode it
 * and PNG otherwise (Safari), keeping transparency.
 */
export async function squareLogo(file: Blob, size = 256): Promise<Blob> {
  const canvas = await squareCanvas(file, size);
  const webp = await toBlob(canvas, 'image/webp', 0.9);
  return webp.type === 'image/webp' ? webp : toBlob(canvas, 'image/png');
}

/** A JPEG copy on a white background (transparent parts become white), as a data URL. */
export async function jpegOnWhite(src: Blob, size = 256): Promise<string> {
  const canvas = await squareCanvas(src, size, '#ffffff');
  return canvas.toDataURL('image/jpeg', 0.9);
}

export const dataUrlOf = (b: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('could not read the image'));
    r.readAsDataURL(b);
  });

/** The bytes of a base64 data URL. */
export function dataUrlBytes(url: string): Uint8Array {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
