// lib/scanPipeline.ts
// Pure browser canvas scan-enhancement pipeline — no Node.js APIs used.

export interface ScanParams {
  threshold: number;
  openIter: number;
  closeIter: number;
  inkBoost: number;
  cropPad: number;
  autoCrop: boolean;
  removeSpeckle: boolean;
  unsharp: boolean;
}

export const DEFAULT_SCAN_PARAMS: ScanParams = {
  threshold: 85,
  openIter: 2,
  closeIter: 1,
  inkBoost: 0.7,
  cropPad: 8,
  autoCrop: true,
  removeSpeckle: true,
  unsharp: true,
};

// Use a concrete buffer type alias to avoid SharedArrayBuffer ambiguity
type U8 = Uint8Array<ArrayBuffer>;

// ── Morphological helpers ────────────────────────────────────────────────────
function erode(mask: U8, w: number, h: number, r: number): U8 {
  const out = new Uint8Array(mask.length) as U8;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      let ok = true;
      outer: for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const ny = y + dy,
            nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && !mask[ny * w + nx]) {
            ok = false;
            break outer;
          }
        }
      if (ok) out[y * w + x] = 1;
    }
  return out;
}

function dilate(mask: U8, w: number, h: number, r: number): U8 {
  const out = new Uint8Array(mask.length) as U8;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let found = false;
      outer: for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const ny = y + dy,
            nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && mask[ny * w + nx]) {
            found = true;
            break outer;
          }
        }
      if (found) out[y * w + x] = 1;
    }
  return out;
}

function removeSpeckles(mask: U8, w: number, h: number, maxPx = 6): U8 {
  const out = new Uint8Array(mask) as U8;
  const visited = new Uint8Array(mask.length) as U8;
  const dirs = [-1, 1, -w, w];
  for (let start = 0; start < mask.length; start++) {
    if (visited[start] || !mask[start]) {
      visited[start] = 1;
      continue;
    }
    const blob: number[] = [],
      queue = [start];
    visited[start] = 1;
    while (queue.length) {
      const cur = queue.pop()!;
      blob.push(cur);
      if (blob.length > maxPx) break;
      const cy = Math.floor(cur / w),
        cx = cur % w;
      for (const d of dirs) {
        const nx = cx + (d === -1 ? -1 : d === 1 ? 1 : 0);
        const ny = cy + (d === -w ? -1 : d === w ? 1 : 0);
        const ni = cur + d;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h || visited[ni] || !mask[ni])
          continue;
        visited[ni] = 1;
        queue.push(ni);
      }
    }
    if (blob.length <= maxPx) for (const idx of blob) out[idx] = 0;
  }
  return out;
}

function unsharpMask(
  srcCanvas: HTMLCanvasElement,
  blurR = 1.2,
  amount = 1.4,
  thr = 2,
): HTMLCanvasElement {
  const { width: W, height: H } = srcCanvas;
  const blur = document.createElement("canvas");
  blur.width = W;
  blur.height = H;
  const bctx = blur.getContext("2d")!;
  bctx.filter = `blur(${blurR}px)`;
  bctx.drawImage(srcCanvas, 0, 0);
  const od = srcCanvas.getContext("2d")!.getImageData(0, 0, W, H);
  const bd = bctx.getImageData(0, 0, W, H);
  const o = od.data,
    b = bd.data;
  for (let i = 0; i < W * H * 4; i += 4)
    for (let c = 0; c < 3; c++) {
      const diff = o[i + c] - b[i + c];
      if (Math.abs(diff) >= thr)
        o[i + c] = Math.min(255, Math.max(0, o[i + c] + diff * amount));
    }
  srcCanvas.getContext("2d")!.putImageData(od, 0, 0);
  return srcCanvas;
}

function autoCropCanvas(
  srcCanvas: HTMLCanvasElement,
  pad = 8,
): HTMLCanvasElement {
  const { width: W, height: H } = srcCanvas;
  const px = srcCanvas.getContext("2d")!.getImageData(0, 0, W, H).data;
  let x0 = W,
    y0 = H,
    x1 = 0,
    y1 = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2] < 240) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  if (x1 <= x0 || y1 <= y0) return srcCanvas;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out
    .getContext("2d")!
    .drawImage(
      srcCanvas,
      x0,
      y0,
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height,
    );
  return out;
}

/**
 * Run the full scan pipeline on a File (browser-only).
 * Returns a new JPEG File.
 */
export async function runScanPipeline(
  file: File,
  params: Partial<ScanParams> = {},
): Promise<File> {
  const {
    threshold,
    openIter,
    closeIter,
    inkBoost,
    cropPad,
    autoCrop: doCrop,
    removeSpeckle: doSpeckle,
    unsharp: doUnsharp,
  } = { ...DEFAULT_SCAN_PARAMS, ...params };

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  URL.revokeObjectURL(url);

  const W = img.width,
    H = img.height;
  let canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.getContext("2d")!.drawImage(img, 0, 0);

  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, W, H);
  const src = imageData.data;
  const n = W * H;

  // 1. Ink mask
  let mask = new Uint8Array(n) as U8;
  for (let i = 0; i < n; i++) {
    const lum =
      0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
    mask[i] = lum < threshold ? 1 : 0;
  }

  // 2. Morphological open (noise removal)
  for (let k = 0; k < openIter; k++) mask = erode(mask, W, H, 1);
  for (let k = 0; k < openIter; k++) mask = dilate(mask, W, H, 1);

  // 3. Morphological close (stroke fill)
  for (let k = 0; k < closeIter; k++) mask = dilate(mask, W, H, 1);
  for (let k = 0; k < closeIter; k++) mask = erode(mask, W, H, 1);

  // 4. Speckle removal
  if (doSpeckle) mask = removeSpeckles(mask, W, H, 6);

  // 5. Compose
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    if (mask[i]) {
      out[i * 4] = Math.round(src[i * 4] * inkBoost);
      out[i * 4 + 1] = Math.round(src[i * 4 + 1] * inkBoost);
      out[i * 4 + 2] = Math.round(src[i * 4 + 2] * inkBoost);
    } else {
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 255;
    }
    out[i * 4 + 3] = 255;
  }
  ctx.putImageData(new ImageData(out, W, H), 0, 0);

  // 6. Unsharp
  if (doUnsharp) canvas = unsharpMask(canvas, 1.2, 1.4, 2);

  // 7. Auto-crop
  if (doCrop) canvas = autoCropCanvas(canvas, cropPad);

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob(res as BlobCallback, "image/jpeg", 0.95),
  );
  return new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_scanned.jpg", {
    type: "image/jpeg",
  });
}
