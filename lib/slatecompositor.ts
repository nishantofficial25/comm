/**
 * slateCompositor.ts
 *
 * Browser-only canvas utility that composites a realistic chalk-slate
 * held by a hand onto a photo, with name + DOP written in chalk.
 *
 * Usage:
 *   const { blob, url } = await compositeSlate({ photoFile, name, dop });
 */

"use client";

export interface SlateCompositeOptions {
  photoFile: File;
  name: string;
  dop: string; // e.g. "25/01/2026"
}

export interface SlateCompositeResult {
  blob: Blob;
  url: string;
  /** Width of the composited canvas */
  width: number;
  /** Height of the composited canvas */
  height: number;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/** Draw stylised hand gripping the bottom edge of the slate */
function drawHand(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  canvasH: number,
): void {
  const fingerCount = 4;
  const gripY = sy + sh * 0.7;
  const palmX = sx + sw * 0.07;
  const palmW = sw * 0.86;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;

  // Palm / lower hand
  ctx.fillStyle = "#b87a52";
  ctx.beginPath();
  (ctx as any).roundRect(
    palmX,
    gripY,
    palmW,
    canvasH - gripY + 20,
    [10, 10, 0, 0],
  );
  ctx.fill();

  // Four fingers peeking above grip line
  const fingerW = palmW / (fingerCount * 1.7);
  const fingerSpacing = palmW / fingerCount;
  const knuckleH = fingerW * 0.85;
  const fingerColors = ["#a86e48", "#b87a52", "#b87a52", "#a86e48"] as const;

  for (let i = 0; i < fingerCount; i++) {
    const fx = palmX + i * fingerSpacing + fingerSpacing * 0.12;
    const fw = fingerSpacing * 0.76;
    ctx.fillStyle = fingerColors[i];
    ctx.beginPath();
    (ctx as any).roundRect(
      fx,
      gripY - knuckleH,
      fw,
      knuckleH + 4,
      [8, 8, 2, 2],
    );
    ctx.fill();

    // Knuckle highlight
    ctx.fillStyle = "rgba(255,210,170,0.28)";
    ctx.beginPath();
    ctx.ellipse(
      fx + fw / 2,
      gripY - knuckleH * 0.45,
      fw * 0.28,
      knuckleH * 0.22,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Knuckle crease line
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(fx + fw * 0.2, gripY - knuckleH * 0.35);
    ctx.quadraticCurveTo(
      fx + fw * 0.5,
      gripY - knuckleH * 0.28,
      fx + fw * 0.8,
      gripY - knuckleH * 0.35,
    );
    ctx.stroke();
  }

  // Thumb on the left side
  ctx.fillStyle = "#a06040";
  ctx.beginPath();
  (ctx as any).roundRect(
    sx - sw * 0.055,
    sy + sh * 0.5,
    sw * 0.11,
    sh * 0.5,
    [12, 4, 4, 12],
  );
  ctx.fill();

  // Grip shadow cast onto slate surface
  ctx.restore();
  ctx.save();
  const gripGrad = ctx.createLinearGradient(sx, gripY - 14, sx, gripY + 18);
  gripGrad.addColorStop(0, "rgba(0,0,0,0)");
  gripGrad.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = gripGrad;
  ctx.fillRect(sx, gripY - 14, sw, 32);
  ctx.restore();
}

/** Draw the wooden-framed slate board */
function drawSlateBoard(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): void {
  ctx.save();

  // Overall shadow
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 14;

  // Very slight perspective skew so it feels held, not pasted
  ctx.transform(1, -0.025, 0.015, 1, sx, sy);

  // ── Wood frame ────────────────────────────────────────────────────────────
  const frameGrad = ctx.createLinearGradient(0, 0, sw, sh);
  frameGrad.addColorStop(0, "#6b4226");
  frameGrad.addColorStop(0.35, "#8b5a34");
  frameGrad.addColorStop(0.65, "#7a4e2a");
  frameGrad.addColorStop(1, "#4e2e14");
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  (ctx as any).roundRect(0, 0, sw, sh, [7, 7, 7, 7]);
  ctx.fill();

  // Wood grain
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "#e8c080";
  ctx.lineWidth = 0.8;
  for (let i = 4; i < sw; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.bezierCurveTo(i + 1.5, sh * 0.3, i - 1, sh * 0.7, i + 1, sh);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Frame bevel — highlight top-left
  ctx.strokeStyle = "rgba(255,215,140,0.30)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3, sh - 5);
  ctx.lineTo(3, 3);
  ctx.lineTo(sw - 3, 3);
  ctx.stroke();

  // Frame bevel — shadow bottom-right
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sw - 3, 3);
  ctx.lineTo(sw - 3, sh - 3);
  ctx.lineTo(3, sh - 3);
  ctx.stroke();

  // ── Slate surface (inner) ─────────────────────────────────────────────────
  const pad = Math.round(sw * 0.048);
  const iw = sw - pad * 2;
  const ih = sh - pad * 2;

  const slateGrad = ctx.createLinearGradient(pad, pad, pad + iw, pad + ih);
  slateGrad.addColorStop(0, "#27303f");
  slateGrad.addColorStop(0.5, "#1d2430");
  slateGrad.addColorStop(1, "#232b38");
  ctx.fillStyle = slateGrad;
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  (ctx as any).roundRect(pad, pad, iw, ih, [3, 3, 3, 3]);
  ctx.fill();

  // Slate texture — subtle noise streaks
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 200; i++) {
    const tx = pad + Math.random() * iw;
    const ty = pad + Math.random() * ih;
    ctx.fillRect(tx, ty, Math.random() * 4 + 1, 0.8);
  }
  ctx.globalAlpha = 1;

  // Inner frame inset shadow
  const insetGrad = ctx.createLinearGradient(pad, pad, pad + iw, pad + ih);
  insetGrad.addColorStop(0, "rgba(0,0,0,0.4)");
  insetGrad.addColorStop(0.15, "rgba(0,0,0,0)");
  insetGrad.addColorStop(0.85, "rgba(0,0,0,0)");
  insetGrad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = insetGrad;
  ctx.beginPath();
  (ctx as any).roundRect(pad, pad, iw, ih, [3, 3, 3, 3]);
  ctx.fill();

  ctx.restore();
}

/** Write name + DOP in chalk style on the slate */
function drawChalkText(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  name: string,
  dop: string,
): void {
  ctx.save();
  // Mirror the same skew from drawSlateBoard
  ctx.transform(1, -0.025, 0.015, 1, sx, sy);

  const pad = Math.round(sw * 0.048);
  const iw = sw - pad * 2;
  const ih = sh - pad * 2;
  const tx0 = pad + 8;

  // Divider line between name and DOP sections
  const divY = pad + ih * 0.51;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 10, divY);
  ctx.lineTo(pad + iw - 10, divY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── NAME section ──────────────────────────────────────────────────────────
  const labelFontSize = Math.round(ih * 0.125);
  const valueFontSize = Math.round(ih * 0.195);

  // "NAME -" label
  ctx.shadowColor = "rgba(255,255,255,0.4)";
  ctx.shadowBlur = 1.5;
  ctx.fillStyle = "rgba(180,210,255,0.65)";
  ctx.font = `600 ${labelFontSize}px 'Courier New', 'Lucida Console', monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("NAME -", tx0, pad + 6);

  // Name value — auto-truncate if too wide
  ctx.shadowBlur = 3;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = `bold ${valueFontSize}px 'Courier New', 'Lucida Console', monospace`;
  const maxNameW = iw - 18;
  let displayName = (name || "YOUR NAME").toUpperCase();
  while (
    ctx.measureText(displayName).width > maxNameW &&
    displayName.length > 2
  ) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== (name || "YOUR NAME").toUpperCase()) displayName += "…";
  ctx.fillText(displayName, tx0, pad + labelFontSize + 10);

  // ── DOP section ───────────────────────────────────────────────────────────
  // "DOP -" label
  ctx.shadowBlur = 1.5;
  ctx.fillStyle = "rgba(180,210,255,0.65)";
  ctx.font = `600 ${labelFontSize}px 'Courier New', 'Lucida Console', monospace`;
  ctx.fillText("DOP -", tx0, divY + 6);

  // DOP value
  ctx.shadowBlur = 3;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = `bold ${valueFontSize}px 'Courier New', 'Lucida Console', monospace`;
  ctx.fillText(dop || "DD/MM/YYYY", tx0, divY + labelFontSize + 10);

  // ── Chalk dust / smudge (realism) ────────────────────────────────────────
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(
    pad + iw * 0.68,
    pad + ih * 0.28,
    iw * 0.14,
    ih * 0.09,
    -0.25,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Composites a chalk slate (with name + DOP) held by a hand
 * onto the supplied photo file. Returns a JPEG blob + object URL.
 */
export async function compositeSlate(
  opts: SlateCompositeOptions,
): Promise<SlateCompositeResult> {
  const { photoFile, name, dop } = opts;

  const photo = await loadImageFromFile(photoFile);
  const W = photo.width;
  const H = photo.height;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Draw photo background
  ctx.drawImage(photo, 0, 0, W, H);

  // Slate sizing — proportional to image, centred horizontally
  const slateW = Math.round(W * 0.54);
  const slateH = Math.round(slateW * 0.42);
  const slateX = Math.round((W - slateW) / 2 + W * 0.03);
  const slateY = Math.round(H - slateH - H * 0.035);

  // Draw layers: hand behind slate, slate board, chalk text
  drawHand(ctx, slateX, slateY, slateW, slateH, H);
  drawSlateBoard(ctx, slateX, slateY, slateW, slateH);
  drawChalkText(ctx, slateX, slateY, slateW, slateH, name, dop);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        resolve({ blob, url: URL.createObjectURL(blob), width: W, height: H });
      },
      "image/jpeg",
      0.93,
    );
  });
}
