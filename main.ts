// main.ts — "THE WORLD IN ONE DAY" — news-image-20261119.
// Design language: EDITORIAL (epic-infographics). Composition: BIG OBJECT.
// The object is the Shenzhen summit scene: three flags, three leaders,
// one table, dominating the top ~40% under a giant serif date masthead.
// Support forms (hero + 3 different forms): (a) UTC-free sequence timeline
// strip, (b) world map with numbered pins, (c) numbered "also today" list.
// Deterministic procedural TypeScript, Node stdlib only. One seeded PRNG
// (seed 20261119) with named sub-streams, fixed consumption order.
// No clock, no network, no input files, no Math.random.

import { mkdirSync, writeFileSync } from "node:fs";
import { createFB, fillRect, setPx, encodePNG, type FB } from "./png.ts";
import { drawText, textWidth, wrapText, type RGB } from "./font.ts";

// ---------------------------------------------------------------- palette
// Editorial tokens (epic-infographics editorial.md), 60-30-10:
// 60% warm paper, 30% deep ink (hero panel + type), 10% oxblood accent
// plus one muted accent per region (emerald, ochre). WCAG: ink on paper
// ~15:1, oxblood on paper ~7:1, paper on ink ~15:1 — all pass AA/AAA.
const PAPER: RGB = [0xfa, 0xf7, 0xf2];
const SURFACE: RGB = [0xf1, 0xec, 0xe2];
const SURFACE2: RGB = [0xe3, 0xdc, 0xcc];
const INK: RGB = [0x20, 0x24, 0x2c];
const INK_SOFT: RGB = [0x2f, 0x35, 0x42]; // skyline on the ink panel
const SUIT: RGB = [0x3a, 0x41, 0x52];
const MUTED: RGB = [0x6b, 0x6f, 0x76];
const OXBLOOD: RGB = [0xa3, 0x20, 0x35];
const EMERALD: RGB = [0x0d, 0x7f, 0x63];
const OCHRE: RGB = [0xb0, 0x7c, 0x1f];
const GRAIN: RGB = [0xef, 0xe9, 0xdc]; // paper grain specks
const FLOW: RGB = [0xe9, 0xe2, 0xd2]; // flow-field strokes on paper
const GRATICULE: RGB = [0xdd, 0xd5, 0xc2];
const SKIN: RGB = [0xeb, 0xc9, 0xa0];
const HAIR: RGB = [0x14, 0x16, 0x1c];
const FLAG_RED: RGB = [0xb2, 0x22, 0x34];
const FLAG_BLUE: RGB = [0x1f, 0x3a, 0x5f];
const FLAG_BLUE2: RGB = [0x2e, 0x5a, 0xac];
const CHINA_RED: RGB = [0xc0, 0x39, 0x2b];
const STAR_YELLOW: RGB = [0xf4, 0xd0, 0x3f];

// ------------------------------------------------------------------- PRNG
// mulberry32. Sub-streams are derived from the day seed by XOR with a
// fixed constant each; consumption order is fixed: grain, flow, skyline,
// windows. Same seed => byte-identical render, every run.
const DAY_SEED = 20261119;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rngGrain = mulberry32(DAY_SEED ^ 0x51ab);
const rngFlow = mulberry32(DAY_SEED ^ 0x77c1);
const rngSky = mulberry32(DAY_SEED ^ 0x2f9d);
const rngWin = mulberry32(DAY_SEED ^ 0x0bad);

// ------------------------------------------------------------ draw helpers
function hline(fb: FB, x0: number, x1: number, y: number, color: RGB, thick = 1): void {
  fillRect(fb, x0, y, x1 - x0, thick, color);
}

function vline(fb: FB, x: number, y0: number, y1: number, color: RGB, thick = 1): void {
  fillRect(fb, x, y0, thick, y1 - y0, color);
}

function line(fb: FB, x0: number, y0: number, x1: number, y1: number, color: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(fb, x, y, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillCircle(fb: FB, cx: number, cy: number, r: number, color: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) {
      setPx(fb, cx + x, cy + y, color);
    }
  }
}

function fillPoly(fb: FB, pts: [number, number][], color: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.ceil(xs[k]);
      const x1 = Math.floor(xs[k + 1]);
      for (let x = x0; x <= x1; x++) setPx(fb, x, y, color);
    }
  }
}

function strokePoly(fb: FB, pts: [number, number][], color: RGB): void {
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    line(fb, x0, y0, x1, y1, color);
  }
}

function drawTextCentered(fb: FB, text: string, cx: number, y: number, scale: number, color: RGB): void {
  drawText(fb, text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, color);
}

// ------------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;
const M = 48; // margin
const R = W - M; // right edge
const fb = createFB(W, H, PAPER);

// ------------------------------------------------- seeded paper texture
// (1) grain: sparse darker specks over the whole sheet.
for (let i = 0; i < 3500; i++) {
  const x = Math.floor(rngGrain() * W);
  const y = Math.floor(rngGrain() * H);
  setPx(fb, x, y, GRAIN);
}
// (2) flow field: short strokes following a fixed analytic angle field,
// seeded start points — the algorithmic-art motif, kept faint on paper.
for (let i = 0; i < 420; i++) {
  let x = Math.floor(rngFlow() * W);
  let y = Math.floor(rngFlow() * H);
  for (let s = 0; s < 6; s++) {
    const a = Math.sin(x * 0.011 + 1.7) + Math.cos(y * 0.013 - 0.6);
    const nx = Math.round(x + Math.cos(a) * 4);
    const ny = Math.round(y + Math.sin(a) * 4);
    line(fb, x, y, nx, ny, FLOW);
    x = nx;
    y = ny;
  }
}

// ------------------------------------------------------------- masthead
drawText(fb, "THE WORLD IN ONE DAY · NO. 19 · THURSDAY 19 NOVEMBER 2026", M, 26, 1, MUTED);
hline(fb, M, R, 40, INK, 1);
drawText(fb, "THE WORLD IN ONE DAY", M, 52, 2, MUTED);
drawText(fb, "THURSDAY 19 NOVEMBER 2026", M, 70, 5, INK);
hline(fb, M, R, 112, OXBLOOD, 3);
drawText(fb, "THREE MEN, ONE TABLE", M, 124, 5, INK);
drawText(fb, "FIRST-EVER US-CHINA-RUSSIA SUMMIT IN SHENZHEN", M, 168, 2, INK);
drawText(
  fb,
  "THEY DISCUSSED NUCLEAR ARMS CONTROL, UKRAINE AND IRAN. THE DECLARATION MENTIONED NEITHER.",
  M,
  190,
  1,
  MUTED,
);
hline(fb, M, R, 204, INK, 1);

// ------------------------------------------------------- hero: the summit
// BIG OBJECT: the Shenzhen summit scene fills the ink panel, top ~40%.
const PANEL_X0 = M;
const PANEL_X1 = R;
const PANEL_Y0 = 212;
const PANEL_Y1 = 446;
fillRect(fb, PANEL_X0, PANEL_Y0, PANEL_X1 - PANEL_X0, PANEL_Y1 - PANEL_Y0, INK);

// Rising sun disc behind the skyline (oxblood, the one decorative accent).
fillCircle(fb, 840, 300, 44, OXBLOOD);

// Seeded Shenzhen skyline along the panel floor.
{
  let x = 60;
  while (x < 960) {
    const bw = 18 + Math.floor(rngSky() * 26);
    const bh = 26 + Math.floor(rngSky() * 78);
    fillRect(fb, x, PANEL_Y1 - bh, bw, bh, INK_SOFT);
    // Aerial spire on a few towers.
    if (rngSky() < 0.22) {
      fillRect(fb, x + Math.floor(bw / 2) - 1, PANEL_Y1 - bh - 12, 2, 12, INK_SOFT);
    }
    x += bw + 2 + Math.floor(rngSky() * 8);
  }
  // Lit windows, seeded, ochre — sparse so the panel stays dark.
  for (let i = 0; i < 90; i++) {
    const wx = 62 + Math.floor(rngWin() * 896);
    const wy = PANEL_Y1 - 14 - Math.floor(rngWin() * 96);
    fillRect(fb, wx, wy, 2, 3, OCHRE);
  }
}

// Panel labels, top-left, paper on ink.
drawText(fb, "SHENZHEN, CHINA", 64, 226, 2, PAPER);
drawText(fb, "90 MINUTES · ONE TABLE · A PEACE DECLARATION", 64, 246, 1, PAPER);
// CONFIRMED chip, top-right.
fillRect(fb, 868, 224, 92, 20, OXBLOOD);
drawText(fb, "CONFIRMED", 888, 229, 1, PAPER);

// Three flags on poles above the table.
function drawUSFlag(x: number, y: number): void {
  for (let s = 0; s < 13; s++) {
    fillRect(fb, x, y + s * 3, 64, 3, s % 2 === 0 ? FLAG_RED : PAPER);
  }
  fillRect(fb, x, y, 26, 21, FLAG_BLUE);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      setPx(fb, x + 3 + c * 5, y + 3 + r * 5, PAPER);
    }
  }
}
function drawChinaFlag(x: number, y: number): void {
  fillRect(fb, x, y, 64, 40, CHINA_RED);
  // One large star (plus-form) + four small stars.
  fillRect(fb, x + 10, y + 8, 3, 9, STAR_YELLOW);
  fillRect(fb, x + 7, y + 11, 9, 3, STAR_YELLOW);
  const small: [number, number][] = [
    [28, 6],
    [34, 10],
    [36, 17],
    [29, 21],
  ];
  for (const [sx, sy] of small) fillRect(fb, x + sx, y + sy, 3, 3, STAR_YELLOW);
}
function drawRussiaFlag(x: number, y: number): void {
  fillRect(fb, x, y, 64, 13, PAPER);
  fillRect(fb, x, y + 13, 64, 14, FLAG_BLUE2);
  fillRect(fb, x, y + 27, 64, 13, FLAG_RED);
}

const FLAG_CENTERS = [360, 512, 664];
const FLAG_FNS = [drawUSFlag, drawChinaFlag, drawRussiaFlag];
for (let i = 0; i < 3; i++) {
  const cx = FLAG_CENTERS[i];
  vline(fb, cx - 1, 272, 392, PAPER, 3);
  FLAG_FNS[i](cx - 32, 272);
}

// Three seated leaders behind the table, name-plated.
// Table first (top + front face), then the leaders above it, then the
// name plates on the front face — plates must be drawn LAST or the
// front face paints over them.
fillRect(fb, 288, 392, 448, 12, PAPER);
fillRect(fb, 288, 404, 448, 42, SURFACE2);
hline(fb, 288, 736, 404, INK, 1);

const NAMES = ["TRUMP", "XI", "PUTIN"];
const TIES: RGB[] = [OXBLOOD, FLAG_BLUE2, OCHRE];
for (let i = 0; i < 3; i++) {
  const cx = FLAG_CENTERS[i];
  // Shoulders (suit) as a trapezoid, shirt wedge, tie.
  fillPoly(
    fb,
    [
      [cx - 34, 392],
      [cx - 26, 366],
      [cx + 26, 366],
      [cx + 34, 392],
    ],
    SUIT,
  );
  fillPoly(
    fb,
    [
      [cx - 6, 366],
      [cx + 6, 366],
      [cx, 380],
    ],
    PAPER,
  );
  fillRect(fb, cx - 2, 372, 4, 20, TIES[i]);
  // Head: skin, dark hair cap.
  fillCircle(fb, cx, 352, 13, SKIN);
  for (let yy = -13; yy <= -2; yy++) {
    const half = Math.floor(Math.sqrt(13 * 13 - yy * yy));
    for (let xx = -half; xx <= half; xx++) setPx(fb, cx + xx, 352 + yy, HAIR);
  }
  // Water glass on the tabletop in front of each leader.
  fillRect(fb, cx + 18, 380, 6, 12, PAPER);
  hline(fb, cx + 18, cx + 24, 380, INK, 1);
  // Name plate on the table front.
  const pw = 62;
  fillRect(fb, cx - pw / 2, 412, pw, 18, PAPER);
  drawTextCentered(fb, NAMES[i], cx, 417, 1, INK);
}

hline(fb, M, R, 454, INK, 1);

// ------------------------------------------- (a) timeline strip: sequence
drawText(fb, "THE DAY UNFOLDS - IN SEQUENCE", M, 462, 2, INK);
hline(fb, M, R, 492, INK, 2);
const TIMELINE: string[] = [
  "SUMMIT OPENS IN SHENZHEN",
  "KERCH BRIDGE HIT 3RD TIME IN A WEEK",
  "HOUTHI MISSILE HITS PIF TOWER, RIYADH",
  "ISRAELI PUSH NEAR NUSEIRAT CAMP, GAZA",
  "ICJ: MYANMAR GENOCIDE 9-6 RULING",
  "ANTHROPIC IPO $83, RECORD $81.3B",
];
{
  const colW = (R - M) / 6;
  for (let i = 0; i < 6; i++) {
    const cx = Math.round(M + i * colW + colW / 2);
    const num = String(i + 1).padStart(2, "0");
    fillCircle(fb, cx, 492, 9, OXBLOOD);
    drawText(fb, num, cx - 5, 489, 1, PAPER);
    const lines = wrapText(TIMELINE[i], colW - 10, 1);
    for (let li = 0; li < lines.length; li++) {
      drawTextCentered(fb, lines[li], cx, 508 + li * 11, 1, INK);
    }
  }
}
hline(fb, M, R, 542, INK, 1);

// ------------------------------------------------ (b) world map with pins
drawText(fb, "WHERE IT HAPPENED", M, 550, 2, INK);
const MAP_X0 = M;
const MAP_X1 = 620;
const MAP_Y0 = 572;
const MAP_Y1 = 772;
const MAP_W = MAP_X1 - MAP_X0;
const MAP_H = MAP_Y1 - MAP_Y0;
function project(lon: number, lat: number): [number, number] {
  const x = MAP_X0 + ((lon + 180) / 360) * MAP_W;
  const y = MAP_Y0 + ((75 - lat) / 130) * MAP_H;
  return [Math.round(x), Math.round(y)];
}
// Graticule first, then land.
for (const lon of [-120, -60, 0, 60, 120]) {
  const [x] = project(lon, 0);
  vline(fb, x, MAP_Y0, MAP_Y1, GRATICULE, 1);
}
for (const lat of [60, 30, 0, -30]) {
  const [, y] = project(0, lat);
  hline(fb, MAP_X0, MAP_X1, y, GRATICULE, 1);
}

type LonLat = [number, number][];
const CONTINENTS: LonLat[] = [
  // North America
  [
    [-168, 66], [-145, 70], [-125, 71], [-110, 73], [-95, 80], [-85, 76],
    [-75, 73], [-65, 62], [-55, 60], [-60, 52], [-65, 45], [-70, 42],
    [-75, 35], [-81, 26], [-84, 30], [-90, 21], [-97, 26], [-105, 20],
    [-110, 23], [-117, 33], [-124, 40], [-125, 49], [-135, 58], [-150, 60],
    [-165, 60],
  ],
  // South America
  [
    [-80, 9], [-72, 11], [-62, 10], [-52, 5], [-50, 0], [-44, -3],
    [-35, -8], [-38, -15], [-40, -22], [-48, -28], [-57, -35], [-65, -41],
    [-68, -50], [-70, -54], [-73, -44], [-73, -37], [-70, -30], [-77, -20],
    [-80, -12], [-81, -5],
  ],
  // Europe
  [
    [-10, 36], [-9, 43], [-2, 44], [-1, 46], [-4, 48], [0, 50], [3, 51],
    [5, 53], [8, 57], [10, 59], [12, 56], [18, 56], [21, 55], [24, 58],
    [28, 59], [30, 62], [25, 65], [20, 70], [25, 71], [30, 70], [28, 66],
    [23, 65], [18, 62], [12, 60], [6, 58], [5, 60], [0, 58], [-3, 55],
    [-5, 53], [-8, 51], [-10, 54], [-10, 48], [-10, 43],
  ],
  // Africa
  [
    [-17, 15], [-16, 20], [-13, 27], [-10, 31], [-5, 35], [0, 36],
    [10, 37], [15, 32], [20, 32], [25, 31], [30, 31], [34, 28],
    [36, 22], [39, 15], [43, 12], [48, 11], [51, 11], [51, 2],
    [48, -5], [44, -10], [40, -15], [36, -20], [33, -26], [30, -29],
    [26, -34], [20, -35], [16, -32], [14, -25], [12, -18], [12, -10],
    [9, -1], [9, 4], [4, 6], [-8, 5], [-13, 8],
  ],
  // Asia
  [
    [30, 70], [35, 68], [40, 68], [48, 70], [55, 72], [65, 72], [75, 73],
    [85, 75], [95, 76], [105, 77], [115, 74], [125, 72], [135, 72],
    [145, 72], [155, 70], [162, 68], [170, 67], [178, 66], [175, 64],
    [170, 60], [163, 60], [158, 53], [155, 55], [150, 59], [145, 59],
    [142, 54], [142, 50], [140, 45], [138, 40], [135, 34], [130, 33],
    [127, 35], [126, 38], [122, 39], [120, 35], [118, 30], [115, 23],
    [110, 20], [108, 18], [106, 10], [104, 9], [101, 7], [98, 10],
    [97, 16], [94, 17], [92, 21], [89, 22], [86, 20], [82, 17],
    [80, 13], [77, 8], [75, 12], [73, 18], [70, 21], [66, 25],
    [62, 25], [58, 26], [54, 27], [52, 29], [50, 29], [48, 30],
    [44, 29], [42, 31], [39, 34], [36, 36], [33, 36], [30, 36],
    [28, 38], [27, 41], [28, 45], [30, 50], [30, 55], [30, 60],
    [30, 66],
  ],
  // Australia
  [
    [113, -22], [114, -28], [115, -34], [118, -35], [124, -33], [129, -32],
    [132, -32], [135, -35], [138, -35], [140, -38], [144, -38], [147, -39],
    [150, -37], [153, -32], [153, -27], [150, -22], [146, -19], [144, -14],
    [142, -11], [140, -17], [137, -12], [135, -12], [132, -12], [130, -13],
    [127, -14], [124, -16], [121, -18], [117, -20], [114, -21],
  ],
  // Greenland (its own polygon: it carries a story today — the Denmark
  // defence deal — so it must be drawn, not dropped for space).
  [
    [-58, 64], [-53, 68], [-48, 71], [-42, 74], [-36, 76], [-30, 75],
    [-25, 72], [-22, 70], [-25, 67], [-30, 64], [-32, 60], [-40, 60],
    [-48, 60], [-55, 61],
  ],
];
for (const continent of CONTINENTS) {
  const pts = continent.map(([lon, lat]) => project(lon, lat));
  fillPoly(fb, pts, SURFACE2);
}
for (const continent of CONTINENTS) {
  const pts = continent.map(([lon, lat]) => project(lon, lat));
  strokePoly(fb, pts, INK);
}

// Pins: numbered oxblood badges; crowded ones offset with leader lines.
type Pin = { num: string; lon: number; lat: number; bx: number; by: number };
const PINS: Pin[] = [
  { num: "01", lon: 114, lat: 22.5, bx: 0, by: 0 }, // Shenzhen
  { num: "02", lon: 36.5, lat: 45.3, bx: 0, by: -18 }, // Kerch Bridge
  { num: "03", lon: 46.7, lat: 24.6, bx: 20, by: 14 }, // Riyadh
  { num: "04", lon: 34.4, lat: 31.4, bx: -24, by: -12 }, // Nuseirat, Gaza
  { num: "05", lon: 96, lat: 21, bx: 0, by: 0 }, // Myanmar
  { num: "09", lon: 126, lat: 39.8, bx: 0, by: 0 }, // Yongbyon, N. Korea
];
for (const pin of PINS) {
  const [tx, ty] = project(pin.lon, pin.lat);
  const bx = tx + pin.bx;
  const by = ty + pin.by;
  fillCircle(fb, tx, ty, 4, OXBLOOD);
  if (pin.bx !== 0 || pin.by !== 0) {
    line(fb, tx, ty, bx, by, INK);
  }
  fillCircle(fb, bx, by, 9, OXBLOOD);
  drawText(fb, pin.num, bx - 5, by - 3, 1, PAPER);
}

// Pin legend, right of the map.
const LEGEND: [string, string][] = [
  ["01", "SHENZHEN - THE SUMMIT"],
  ["02", "KERCH BRIDGE, BLACK SEA"],
  ["03", "RIYADH - PIF TOWER"],
  ["04", "NUSEIRAT CAMP, GAZA"],
  ["05", "MYANMAR - ICJ RULING"],
  ["09", "YONGBYON, N. KOREA"],
];
for (let i = 0; i < LEGEND.length; i++) {
  const y = 580 + i * 24;
  drawText(fb, LEGEND[i][0], 648, y, 1, OXBLOOD);
  drawText(fb, LEGEND[i][1], 668, y, 1, INK);
}
drawText(fb, "PINS MARK WHERE EACH", 648, 736, 1, MUTED);
drawText(fb, "STORY HAPPENED.", 648, 748, 1, MUTED);

hline(fb, M, R, 782, INK, 1);

// -------------------------------------------- (c) numbered "also today" list
drawText(fb, "ALSO ON THURSDAY 19 NOVEMBER", M, 790, 2, INK);
const ALSO: string[] = [
  "07 US SENATE REJECTS IRAN WAR-POWERS VOTE 51-48",
  "08 DENMARK BACKS GREENLAND DEFENCE DEAL 109-0",
  "09 IAEA: N. KOREA EXPANDING URANIUM ENRICHMENT",
  "10 APEC ADOPTS SHENZHEN OUTLOOK ON TRADE, DATA, AI",
  "11 LPG TANKER GAS HUSKY SINKS OFF BULGARIA",
  "12 COP31: FOSSIL PHASE-OUT LANGUAGE UNRESOLVED",
  "13 BANGLADESH SHUTDOWN; YUNUS HOME ATTACKED",
  "14 BITCOIN DIPS BELOW $63,000, THEN RECOVERS",
  "15 CARNEY WRAPS APEC WITH CHINA TRADE GAINS",
  "16 JAPAN PM TAKAICHI HOLDS TALKS WITH PUTIN",
];
for (let i = 0; i < ALSO.length; i++) {
  const col = i < 5 ? M : 528;
  const row = i % 5;
  const y = 812 + row * 18;
  const num = ALSO[i].slice(0, 2);
  const rest = ALSO[i].slice(3);
  drawText(fb, num, col, y, 1, OXBLOOD);
  drawText(fb, rest, col + 16, y, 1, INK);
}

hline(fb, M, R, 900, INK, 1);

// ------------------------------------------------------- date-check footer
fillRect(fb, M, 910, R - M, 48, PAPER);
{
  // Oxblood border, 2px.
  const x0 = M;
  const y0 = 910;
  const x1 = R;
  const y1 = 958;
  hline(fb, x0, x1, y0, OXBLOOD, 2);
  hline(fb, x0, x1, y1 - 2, OXBLOOD, 2);
  vline(fb, x0, y0, y1, OXBLOOD, 2);
  vline(fb, x1 - 2, y0, y1, OXBLOOD, 2);
}
drawText(
  fb,
  "DATE CHECK - EVERY STORY ABOVE IS VERIFIED FOR THURSDAY 19 NOVEMBER 2026.",
  M + 12,
  920,
  1,
  OXBLOOD,
);
drawText(
  fb,
  "EXCLUDED: GTA VI GLOBAL ROLLOUT (18 NOV) - NOT THIS DAY'S NEWS.",
  M + 12,
  936,
  1,
  INK,
);
drawText(
  fb,
  "SOURCES: AP · REUTERS · AFP · NYT · IAEA · HANSEN INTEL · JUST SECURITY · BANGLADESH CHRONICLE · OPEN CHRONICLE",
  M,
  972,
  1,
  MUTED,
);
drawText(fb, "THE WORLD IN ONE DAY · SET IN SHENZHEN · RENDERED BY CODE, NO PHOTOS", M, 992, 1, MUTED);

// ------------------------------------------------------------------- output
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, encodePNG(fb));
