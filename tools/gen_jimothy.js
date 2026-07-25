// Generates an ORIGINAL Jimothy the Raccoon run-cycle sprite sheet.
// Jimothy has short-spine syndrome (a compact, stubby body) and a stub tail.
// 5 frames, 432x336 each, laid out horizontally -> 2160x336 sheet.
// All artwork below is drawn from scratch as parametric SVG.

const sharp = require("sharp");
const fs = require("fs");

const FW = 432;   // frame width
const FH = 336;   // frame height
const N = 5;      // frames

// Palette
const FUR = "#8d8277";        // main grey-brown fur
const FUR_DARK = "#6f665d";   // shaded fur
const FUR_LIGHT = "#a89e93";  // highlight fur
const MASK = "#232021";       // black bandit mask
const FACE = "#f2ede6";       // cream face
const EYE_WHITE = "#ffffff";
const EYE = "#232021";
const LEG = "#5b534b";        // darker limbs
const LEG_DARK = "#463f39";
const NOSE = "#2b2724";
const SHADOW = "rgba(60,55,50,0.22)";

// A gentle vertical "bounce" and body rotation per frame for the gallop feel.
function frameParams(i) {
  const phase = i / N; // 0..1
  const t = phase * Math.PI * 2;
  return {
    bob: Math.sin(t) * 10,            // body vertical bob
    lean: Math.sin(t) * 4,            // slight body rotation (deg)
    // Four legs, paired diagonally for a gallop. Values are stride angles (deg).
    frontFar: Math.sin(t) * 45 - 5,
    frontNear: Math.sin(t + Math.PI) * 45 - 5,
    backFar: Math.sin(t + Math.PI * 0.9) * 40 + 5,
    backNear: Math.sin(t + Math.PI * 1.9) * 40 + 5,
    stretch: Math.cos(t) * 6,         // body stretch/compress
  };
}

// Draw one leg as a two-segment limb from a hip anchor.
function leg(hipX, hipY, angle, len, color, width) {
  const a = (angle * Math.PI) / 180;
  const kneeX = hipX + Math.sin(a) * len * 0.55;
  const kneeY = hipY + Math.cos(a) * len * 0.55;
  const a2 = a + Math.sin(a) * 0.5;
  const footX = kneeX + Math.sin(a2) * len * 0.55;
  const footY = kneeY + Math.cos(a2) * len * 0.55;
  return `
    <g stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none">
      <path d="M ${hipX} ${hipY} L ${kneeX} ${kneeY} L ${footX} ${footY}" />
    </g>
    <ellipse cx="${footX}" cy="${footY}" rx="${width * 0.62}" ry="${width * 0.42}" fill="${LEG_DARK}" />
  `;
}

function frameSVG(i) {
  const p = frameParams(i);
  const cx = FW / 2 + 10;
  const cy = FH / 2 - 4 + p.bob;

  const shadowScale = 1 - (p.bob + 10) / 60;
  const shadow = `
    <ellipse cx="${cx - 4}" cy="${FH - 30}" rx="${104 * shadowScale}" ry="${18 * shadowScale}" fill="${SHADOW}" />
  `;

  // Short-spine syndrome: compact, near-round torso (not long).
  const bodyW = 168 + p.stretch;
  const bodyH = 148;
  const shoulderX = cx - bodyW * 0.26;
  const hipX = cx + bodyW * 0.26;
  const limbY = cy + bodyH * 0.30;

  const farLegs = `
    ${leg(shoulderX, limbY, p.frontFar, 74, LEG_DARK, 24)}
    ${leg(hipX, limbY, p.backFar, 78, LEG_DARK, 26)}
  `;
  const nearLegs = `
    ${leg(shoulderX + 10, limbY + 4, p.frontNear, 78, LEG, 28)}
    ${leg(hipX + 6, limbY + 4, p.backNear, 82, LEG, 30)}
  `;

  const body = `
    <g transform="rotate(${p.lean} ${cx} ${cy})">
      <g>
        <path d="M ${hipX + bodyW * 0.14} ${cy - 4}
                 q 44 -4 48 30
                 q 2 32 -32 36
                 q -28 2 -30 -22 Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="3"/>
        <path d="M ${hipX + bodyW * 0.16} ${cy + 28}
                 q 26 8 36 -6" fill="none" stroke="${MASK}" stroke-width="11" stroke-linecap="round" opacity="0.8"/>
        <path d="M ${hipX + bodyW * 0.26} ${cy + 40}
                 q 14 4 20 -4" fill="none" stroke="${MASK}" stroke-width="8" stroke-linecap="round" opacity="0.65"/>
      </g>

      <ellipse cx="${cx}" cy="${cy}" rx="${bodyW / 2}" ry="${bodyH / 2}" fill="${FUR}"/>
      <ellipse cx="${cx}" cy="${cy + 12}" rx="${bodyW / 2 - 12}" ry="${bodyH / 2 - 16}" fill="${FUR_DARK}" opacity="0.32"/>
      <ellipse cx="${cx - 14}" cy="${cy - 28}" rx="${bodyW / 2 - 34}" ry="${bodyH / 2 - 42}" fill="${FUR_LIGHT}" opacity="0.5"/>
    </g>
  `;

  const hx = shoulderX - 62;
  const hy = cy - 30 - p.bob * 0.3;
  const head = `
    <g transform="rotate(${p.lean * 0.6} ${hx} ${hy})">
      <path d="M ${hx - 4} ${hy - 42} l -12 -30 l 30 12 Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2"/>
      <path d="M ${hx + 40} ${hy - 42} l 12 -30 l -30 12 Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2"/>
      <path d="M ${hx - 4} ${hy - 42} l -6 -16 l 15 7 Z" fill="${FACE}" opacity="0.7"/>
      <path d="M ${hx + 40} ${hy - 42} l 6 -16 l -15 7 Z" fill="${FACE}" opacity="0.7"/>

      <ellipse cx="${hx + 18}" cy="${hy}" rx="60" ry="54" fill="${FUR}"/>

      <!-- snout: cream, tapering to the nose tip at lower-left -->
      <path d="M ${hx - 30} ${hy + 2}
               q -34 4 -40 24
               q -3 14 18 18
               q 34 6 56 -6
               q 6 -30 -34 -36 Z" fill="${FACE}" stroke="${FUR_DARK}" stroke-width="1.5"/>

      <path d="M ${hx + 18} ${hy - 42}
               q -26 28 -16 66
               q 18 18 34 0
               q 10 -38 -18 -66 Z" fill="${FACE}"/>

      <path d="M ${hx - 18} ${hy - 4}
               q 16 -18 36 -6
               q 8 8 2 18
               q -16 12 -36 4
               q -10 -8 -2 -10 Z" fill="${MASK}"/>
      <path d="M ${hx + 52} ${hy - 4}
               q -16 -18 -36 -6
               q -8 8 -2 18
               q 16 12 36 4
               q 10 -8 2 -10 Z" fill="${MASK}"/>

      <circle cx="${hx + 2}" cy="${hy + 2}" r="10" fill="${EYE_WHITE}"/>
      <circle cx="${hx + 32}" cy="${hy + 2}" r="10" fill="${EYE_WHITE}"/>
      <circle cx="${hx - 1}" cy="${hy + 3}" r="5" fill="${EYE}"/>
      <circle cx="${hx + 29}" cy="${hy + 3}" r="5" fill="${EYE}"/>
      <circle cx="${hx + 1}" cy="${hy + 1}" r="1.6" fill="#fff"/>
      <circle cx="${hx + 31}" cy="${hy + 1}" r="1.6" fill="#fff"/>

      <!-- nose at the snout tip -->
      <ellipse cx="${hx - 52}" cy="${hy + 24}" rx="10" ry="7.5" fill="${NOSE}"/>
      <path d="M ${hx - 52} ${hy + 31} q 0 7 -7 9" fill="none" stroke="${NOSE}" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  `;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}" viewBox="0 0 ${FW} ${FH}">
      ${shadow}
      ${farLegs}
      ${body}
      ${nearLegs}
      ${head}
    </svg>`
  );
}

async function main() {
  const sheet = sharp({
    create: {
      width: FW * N,
      height: FH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const composites = [];
  for (let i = 0; i < N; i++) {
    const png = await sharp(frameSVG(i)).png().toBuffer();
    composites.push({ input: png, left: i * FW, top: 0 });
    fs.writeFileSync(`C:/Temp/jimothy-raccoon/tools/frame_${i}.png`, png);
  }

  const sheetBuf = await sheet.composite(composites).png().toBuffer();
  fs.writeFileSync("C:/Temp/jimothy-raccoon/assets/jimothy_run.png", sheetBuf);

  console.log("Wrote assets/jimothy_run.png (" + FW * N + "x" + FH + ")");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
