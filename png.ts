// png.ts — RGB framebuffer + from-scratch PNG encoder (hand-rolled CRC-32).
// Node stdlib only (node:zlib for the deflate stream). Deterministic: no
// clock, no randomness, no input files. Every byte of output is a pure
// function of the framebuffer contents.

import { deflateSync } from "node:zlib";

export type FB = {
  w: number;
  h: number;
  data: Uint8Array; // row-major RGB, 3 bytes per pixel
};

export function createFB(w: number, h: number, rgb: [number, number, number]): FB {
  const data = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    data[i * 3] = rgb[0];
    data[i * 3 + 1] = rgb[1];
    data[i * 3 + 2] = rgb[2];
  }
  return { w, h, data };
}

export function setPx(fb: FB, x: number, y: number, rgb: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= fb.w || y >= fb.h) return;
  const i = (y * fb.w + x) * 3;
  fb.data[i] = rgb[0];
  fb.data[i + 1] = rgb[1];
  fb.data[i + 2] = rgb[2];
}

export function getPx(fb: FB, x: number, y: number): [number, number, number] {
  const i = (y * fb.w + x) * 3;
  return [fb.data[i], fb.data[i + 1], fb.data[i + 2]];
}

export function fillRect(fb: FB, x: number, y: number, w: number, h: number, rgb: [number, number, number]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(fb.w, x + w);
  const y1 = Math.min(fb.h, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * fb.w + xx) * 3;
      fb.data[i] = rgb[0];
      fb.data[i + 1] = rgb[1];
      fb.data[i + 2] = rgb[2];
    }
  }
}

// --- CRC-32 (IEEE 802.3, polynomial 0xEDB88320), built at load time. ---
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export function encodePNG(fb: FB): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(fb.w, 0);
  ihdr.writeUInt32BE(fb.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Filter 0 (None) on every scanline: raw RGB rows, fully deterministic.
  const raw = Buffer.alloc(fb.h * (1 + fb.w * 3));
  for (let y = 0; y < fb.h; y++) {
    raw[y * (1 + fb.w * 3)] = 0;
    const src = fb.data.subarray(y * fb.w * 3, (y + 1) * fb.w * 3);
    raw.set(src, y * (1 + fb.w * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
