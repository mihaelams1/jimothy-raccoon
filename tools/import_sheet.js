// Imports an external raccoon run-cycle image (e.g. a Gemini-generated sheet with
// a baked-in checkerboard "transparent" background) and normalizes it into the
// extension's sprite sheet: 5 frames x 432x336 -> 2160x336, facing LEFT,
// on a common baseline, with a real alpha channel.
//
// Usage: node tools/import_sheet.js <source.png>
//   (defaults to the Gemini image in C:/Temp if no arg given)

const sharp = require("sharp");
const fs = require("fs");

const FW = 432, FH = 336, N = 5;
const SRC = process.argv[2] || "C:/Temp/Gemini_Generated_Image_q4324nq4324nq432.png";
const OUT = "C:/Temp/jimothy-raccoon/assets/jimothy_run.png";

// Background classifier thresholds (see isBg): neutral + bright checker.
const SAT_BG = 12, LO_A = 160, HI_A = 255;     // strict, for the flood seed/interior
const SAT_FR = 16, LO_FR = 150, HI_FR = 255;   // looser, for the defringe edge pass

// Background = the baked checkerboard: neutral (low saturation) and mid-brightness.
// The olive fur is saturated; the outline is very dark; the face is bright.
// Flood fill from the borders stops at those, and interior low-sat highlights are
// protected because the outline ring encloses them.
function isBg(r, g, b, satMax, loA, hiA) {
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  return sat <= satMax && avg >= loA && avg <= hiA;
}

async function main() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const idx = (x, y) => (y * W + x) * C;

  // 1) Flood-fill background transparency from every border pixel (8-connected).
  const alpha = new Uint8Array(W * H).fill(255);   // 255 = keep, 0 = transparent
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const a = y * W + x;
    if (alpha[a] === 0) return;
    const o = idx(x, y);
    if (isBg(data[o], data[o + 1], data[o + 2], SAT_BG, LO_A, HI_A)) { alpha[a] = 0; stack.push(a); }
  };
  for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1); }
  for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y); }
  while (stack.length) {
    const a = stack.pop();
    const x = a % W, y = (a - x) / W;
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
    pushIf(x + 1, y + 1); pushIf(x - 1, y - 1); pushIf(x + 1, y - 1); pushIf(x - 1, y + 1);
  }

  // 2) Defringe: clear loose-bg pixels that touch transparency (kills checker halo).
  const toClear = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = y * W + x;
    if (alpha[a] === 0) continue;
    const o = idx(x, y);
    if (!isBg(data[o], data[o + 1], data[o + 2], SAT_FR, LO_FR, HI_FR)) continue;
    if ((x > 0 && alpha[a - 1] === 0) || (x < W - 1 && alpha[a + 1] === 0) ||
        (y > 0 && alpha[a - W] === 0) || (y < H - 1 && alpha[a + W] === 0)) toClear.push(a);
  }
  for (const a of toClear) alpha[a] = 0;

  // 2b) Drop small detached blobs (Gemini sparkle watermark, stray specks):
  //     keep only connected components large enough to be a raccoon.
  const MIN_AREA = 3000;
  const seen = new Uint8Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (alpha[start] === 0 || seen[start]) continue;
    const comp = [start];
    seen[start] = 1;
    for (let qi = 0; qi < comp.length; qi++) {
      const a = comp[qi], x = a % W, y = (a - x) / W;
      const nb = [];
      if (x > 0) nb.push(a - 1);
      if (x < W - 1) nb.push(a + 1);
      if (y > 0) nb.push(a - W);
      if (y < H - 1) nb.push(a + W);
      for (const n of nb) if (alpha[n] && !seen[n]) { seen[n] = 1; comp.push(n); }
    }
    if (comp.length < MIN_AREA) for (const a of comp) alpha[a] = 0;
  }

  // 2c) The mask is clean, but Gemini drew a light "glow" rim around each raccoon
  //     that reads as a faint white outline. Trim it with a LIGHT-ONLY erosion:
  //     only bright, low-saturation edge pixels are shaved. The dark outline, the
  //     dark legs/feet, the fur, and the saturated cream face are all left intact,
  //     so nothing thin gets severed or lost.
  const isRim = (r, g, b) => {
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const avg = (r + g + b) / 3;
    return sat <= 48 && avg >= 112;
  };
  const RIM_PASSES = Number(process.env.RIM || 3);
  for (let pass = 0; pass < RIM_PASSES; pass++) {
    const edge = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = y * W + x;
      if (alpha[a] === 0) continue;
      const o = idx(x, y);
      if (!isRim(data[o], data[o + 1], data[o + 2])) continue;
      if ((x > 0 && alpha[a - 1] === 0) || (x < W - 1 && alpha[a + 1] === 0) ||
          (y > 0 && alpha[a - W] === 0) || (y < H - 1 && alpha[a + W] === 0)) edge.push(a);
    }
    if (!edge.length) break;
    for (const a of edge) alpha[a] = 0;
  }

  // Write alpha back into the RGBA buffer.
  for (let i = 0; i < W * H; i++) data[i * C + 3] = alpha[i];

  // 3) Segment into raccoons by columns of "ink" (opaque pixels).
  const colInk = new Uint8Array(W);
  const rowMinY = new Int32Array(W).fill(H);
  const rowMaxY = new Int32Array(W).fill(-1);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (alpha[y * W + x]) { colInk[x] = 1; if (y < rowMinY[x]) rowMinY[x] = y; if (y > rowMaxY[x]) rowMaxY[x] = y; }
    }
  }
  const segs = [];
  let s = -1;
  const GAP = 6; // allow tiny gaps within a body
  let gap = 0;
  for (let x = 0; x < W; x++) {
    if (colInk[x]) { if (s < 0) s = x; gap = 0; }
    else if (s >= 0) { if (++gap > GAP) { segs.push([s, x - gap]); s = -1; } }
  }
  if (s >= 0) segs.push([s, W - 1]);

  // Keep the 5 widest segments (drops the Gemini sparkle watermark, specks).
  segs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const picked = segs.slice(0, N).sort((a, b) => a[0] - b[0]);
  if (picked.length !== N) throw new Error(`expected ${N} raccoons, found ${picked.length}: ${JSON.stringify(segs)}`);

  // 4) Extract each frame's tight bounding box.
  const src = sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } });
  const boxes = picked.map(([x0, x1]) => {
    let minY = H, maxY = -1;
    for (let x = x0; x <= x1; x++) { if (rowMaxY[x] >= 0) { if (rowMinY[x] < minY) minY = rowMinY[x]; if (rowMaxY[x] > maxY) maxY = rowMaxY[x]; } }
    return { x: x0, y: minY, w: x1 - x0 + 1, h: maxY - minY + 1 };
  });

  // 5) Scale so frame #4 (the cleanest walking pose) fills the cell; apply that
  //    same uniform scale to all frames and align them on a common baseline so
  //    every frame reads at the same size and vertical position (no jitter).
  const PAD = 0.92;                 // fraction of the cell frame #4 fills
  const ref = boxes[3];             // frame #4 (0-indexed 3) is the reference
  // Cap so even the widest/tallest pose (the mid-air leap) still fits the cell.
  const fitAll = Math.min(...boxes.map(b => Math.min(FW / b.w, FH / b.h))) * 0.98;
  const scale = Math.min((FW * PAD) / ref.w, (FH * PAD) / ref.h, fitAll);
  const baseline = Math.round(FH * 0.95);   // feet sit here in every cell

  const cells = [];
  for (let k = 0; k < N; k++) {
    const b = boxes[k];
    const crop = await src.clone().extract({ left: b.x, top: b.y, width: b.w, height: b.h })
      .flop()                                   // faces right -> face LEFT
      .resize({ width: Math.max(1, Math.round(b.w * scale)), height: Math.max(1, Math.round(b.h * scale)) })
      .toBuffer({ resolveWithObject: true });
    const cw = crop.info.width, ch = crop.info.height;
    const left = Math.round((FW - cw) / 2);
    const top = Math.round(baseline - ch);
    const cell = await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: crop.data, raw: { width: cw, height: ch, channels: 4 }, left, top }])
      .png().toBuffer();
    cells.push({ input: cell, left: k * FW, top: 0 });
    fs.writeFileSync(`C:/Temp/jimothy-raccoon/tools/frame_${k}.png`, cell);
  }

  const sheet = await sharp({ create: { width: FW * N, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cells).png().toBuffer();
  fs.writeFileSync(OUT, sheet);
  console.log("segments:", picked.map(p => p.join("-")).join(", "));
  console.log("boxes:", boxes.map(b => `${b.w}x${b.h}`).join(", "), "scale:", scale.toFixed(3));
  console.log("Wrote", OUT, `(${FW * N}x${FH})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
