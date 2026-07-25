// Generates an ORIGINAL Jimothy the Raccoon run-cycle sprite sheet.
// Inspired by the real "Jimothy Summer" Seattle raccoon: short-spine syndrome
// gives him a pronounced HUNCHED / humpbacked silhouette, a LOW head carried
// near the ground, dark grizzled charcoal fur, and a LOW stubby tail.
// 5 frames, 432x336 each, laid out horizontally -> 2160x336 sheet.
// He faces LEFT (the runtime flips him for rightward runs).
// All artwork below is drawn from scratch as parametric SVG.

const sharp = require("sharp");
const fs = require("fs");

const FW = 432;   // frame width
const FH = 336;   // frame height
const N = 5;      // frames

// Palette -- dark grizzled charcoal, like the real Jimothy.
const FUR = "#494846";        // main charcoal-grey fur
const FUR_DARK = "#2c2b2a";   // shaded fur / underside
const FUR_MID = "#5f5d59";    // mid tone
const GRIZZLE = "#928f86";    // frosted grizzle tips on the hump
const MASK = "#171615";       // near-black bandit mask
const FACE = "#c7c1b5";       // muted dirty-cream face
const EYE_WHITE = "#e9e4da";
const EYE = "#141312";
const LEG = "#242322";        // dark limbs
const LEG_DARK = "#161514";
const NOSE = "#0f0e0d";
const SHADOW = "rgba(40,38,35,0.22)";

// Per-frame gallop: vertical bob, body flex, and diagonal leg strides (deg).
function frameParams(i) {
  const phase = i / N;
  const t = phase * Math.PI * 2;
  return {
    bob: Math.sin(t) * 9,
    lean: Math.sin(t) * 3,
    frontFar: Math.sin(t) * 46 - 6,
    frontNear: Math.sin(t + Math.PI) * 46 - 6,
    backFar: Math.sin(t + Math.PI * 0.9) * 42 + 6,
    backNear: Math.sin(t + Math.PI * 1.9) * 42 + 6,
    stretch: Math.cos(t) * 5,
  };
}

// Two-segment limb from a hip anchor. angle in degrees (0 = straight down).
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
    <ellipse cx="${footX}" cy="${footY}" rx="${width * 0.6}" ry="${width * 0.4}" fill="${LEG_DARK}" />
  `;
}

// A few short frosted strokes to fake grizzled fur over the hump.
function grizzle(cx, cy) {
  const tufts = [
    [-40, -78, -22], [-8, -88, -8], [18, -84, 8], [46, -70, 22],
    [-58, -52, -30], [62, -48, 30], [4, -70, 0], [-24, -84, -14], [34, -78, 14],
  ];
  return tufts
    .map(([dx, dy, rot]) => {
      const x = cx + dx, y = cy + dy;
      return `<g transform="rotate(${rot} ${x} ${y})">
        <rect x="${x - 1}" y="${y - 11}" width="2" height="22" rx="1" fill="${GRIZZLE}" opacity="0.3"/>
      </g>`;
    })
    .join("");
}

function frameSVG(i) {
  const p = frameParams(i);
  const cx = FW / 2 + 24;             // shift right a touch (head hangs off left)
  const cy = FH / 2 + 10 + p.bob;     // body sits low; head goes lower still
  const ground = FH - 34;

  const shadowScale = 1 - (p.bob + 9) / 60;
  const shadow = `
    <ellipse cx="${cx - 20}" cy="${ground + 4}" rx="${118 * shadowScale}" ry="${17 * shadowScale}" fill="${SHADOW}" />
  `;

  // Leg anchors. Short, stubby limbs (dwarf proportions) kept in-frame.
  const shoulderX = cx - 78;
  const hipX = cx + 74;
  const limbY = cy + 40;

  const farLegs = `
    ${leg(shoulderX, limbY, p.frontFar, 70, LEG_DARK, 22)}
    ${leg(hipX, limbY, p.backFar, 74, LEG_DARK, 24)}
  `;
  const nearLegs = `
    ${leg(shoulderX + 12, limbY + 4, p.frontNear, 74, LEG, 26)}
    ${leg(hipX + 8, limbY + 4, p.backNear, 78, LEG, 28)}
  `;

  // Low stubby tail: a short fluffy puff at the lower rear (right), dropped down.
  const tx = hipX + 66;
  const ty = cy + 40;
  const tail = `
    <g>
      <ellipse cx="${tx}" cy="${ty}" rx="42" ry="34" fill="${FUR}"/>
      <ellipse cx="${tx + 6}" cy="${ty + 6}" rx="34" ry="26" fill="${FUR_DARK}" opacity="0.55"/>
      <ellipse cx="${tx - 6}" cy="${ty - 8}" rx="26" ry="18" fill="${GRIZZLE}" opacity="0.35"/>
      <path d="M ${tx + 26} ${ty + 4} q 18 6 26 -6" fill="none" stroke="${MASK}" stroke-width="9" stroke-linecap="round" opacity="0.7"/>
    </g>
  `;

  // HUNCHED body silhouette (facing LEFT). Big hump over the shoulders,
  // back sloping down to the rump on the right, head hanging low on the left.
  const s = p.stretch;
  const body = `
    <g transform="rotate(${p.lean} ${cx} ${cy})">
      <path d="
        M ${hipX + 96} ${cy + 30}
        C ${hipX + 96} ${cy - 34}, ${hipX + 30} ${cy - 96}, ${cx - 6} ${cy - 98 - s}
        C ${cx - 70} ${cy - 100}, ${cx - 116} ${cy - 54}, ${cx - 150} ${cy - 6}
        C ${cx - 182} ${cy + 40}, ${cx - 150} ${cy + 78}, ${cx - 96} ${cy + 76}
        L ${hipX + 30} ${cy + 74}
        C ${hipX + 76} ${cy + 74}, ${hipX + 96} ${cy + 64}, ${hipX + 96} ${cy + 30}
        Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="3"/>

      <!-- underside shading -->
      <path d="
        M ${cx - 120} ${cy + 40}
        C ${cx - 70} ${cy + 82}, ${hipX + 20} ${cy + 82}, ${hipX + 84} ${cy + 52}
        C ${hipX + 40} ${cy + 78}, ${cx - 40} ${cy + 80}, ${cx - 120} ${cy + 40}
        Z" fill="${FUR_DARK}" opacity="0.5"/>

      <!-- lighter frosted crest along the top of the hump -->
      <path d="
        M ${cx - 130} ${cy - 20}
        C ${cx - 96} ${cy - 74}, ${cx - 30} ${cy - 96}, ${cx + 20} ${cy - 88}
        C ${cx + 60} ${cy - 80}, ${hipX + 60} ${cy - 30}, ${hipX + 80} ${cy + 6}
        C ${hipX + 40} ${cy - 46}, ${cx} ${cy - 78}, ${cx - 40} ${cy - 74}
        C ${cx - 84} ${cy - 68}, ${cx - 110} ${cy - 40}, ${cx - 130} ${cy - 20}
        Z" fill="${FUR_MID}" opacity="0.7"/>

      ${grizzle(cx, cy)}
    </g>
  `;

  // Head: low and forward at front-left, snout dropping toward the ground.
  const hx = cx - 150;
  const hy = cy + 6 - p.bob * 0.2;
  const head = `
    <g transform="rotate(${8 + p.lean * 0.5} ${hx} ${hy})">
      <!-- ears (small, low-set) -->
      <path d="M ${hx + 6} ${hy - 40} l -10 -26 l 26 12 Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2"/>
      <path d="M ${hx + 44} ${hy - 40} l 10 -24 l -26 12 Z" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="2"/>
      <path d="M ${hx + 6} ${hy - 40} l -5 -13 l 13 6 Z" fill="${FACE}" opacity="0.6"/>
      <path d="M ${hx + 44} ${hy - 40} l 5 -12 l -13 6 Z" fill="${FACE}" opacity="0.6"/>

      <!-- head mass -->
      <ellipse cx="${hx + 22}" cy="${hy}" rx="54" ry="50" fill="${FUR}"/>
      <ellipse cx="${hx + 30}" cy="${hy + 14}" rx="44" ry="36" fill="${FUR_DARK}" opacity="0.35"/>

      <!-- cream forehead blaze -->
      <path d="M ${hx + 22} ${hy - 40}
               q -22 26 -13 58
               q 15 15 30 0
               q 9 -32 -17 -58 Z" fill="${FACE}"/>

      <!-- snout: cream wedge dropping to the nose tip at lower-left -->
      <path d="M ${hx - 12} ${hy + 4}
               q -40 8 -50 30
               q -4 15 16 20
               q 34 8 58 -4
               q 10 -34 -24 -46 Z" fill="${FACE}" stroke="${FUR_DARK}" stroke-width="1.5"/>

      <!-- bandit mask, both eyes -->
      <path d="M ${hx - 6} ${hy - 4}
               q 16 -16 34 -5
               q 8 8 2 17
               q -16 11 -34 3
               q -9 -8 -2 -15 Z" fill="${MASK}"/>
      <path d="M ${hx + 56} ${hy - 4}
               q -16 -16 -34 -5
               q -8 8 -2 17
               q 16 11 34 3
               q 9 -8 2 -15 Z" fill="${MASK}"/>

      <circle cx="${hx + 10}" cy="${hy + 2}" r="9" fill="${EYE_WHITE}"/>
      <circle cx="${hx + 38}" cy="${hy + 2}" r="9" fill="${EYE_WHITE}"/>
      <circle cx="${hx + 8}" cy="${hy + 3}" r="4.6" fill="${EYE}"/>
      <circle cx="${hx + 36}" cy="${hy + 3}" r="4.6" fill="${EYE}"/>
      <circle cx="${hx + 9}" cy="${hy + 1}" r="1.5" fill="#fff"/>
      <circle cx="${hx + 37}" cy="${hy + 1}" r="1.5" fill="#fff"/>

      <!-- nose at the snout tip -->
      <ellipse cx="${hx - 40}" cy="${hy + 30}" rx="10" ry="8" fill="${NOSE}"/>
      <path d="M ${hx - 40} ${hy + 38} q 0 8 -8 10" fill="none" stroke="${NOSE}" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  `;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}" viewBox="0 0 ${FW} ${FH}">
      ${shadow}
      ${tail}
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
