// 生成 PWA 图标（无第三方依赖，纯 Node + zlib 手写 PNG 编码）
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------- PNG 编码 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- 绘制 ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function makeIcon(size, maskable) {
  const S = 3; // 超采样倍率（抗锯齿）
  const rgba = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.22 : 0;          // maskable 需留安全边距
  const box = size - pad * 2;
  const r = box * 0.235;                            // 圆角
  // 勾形路径
  const A = [pad + box * 0.285, pad + box * 0.525];
  const B = [pad + box * 0.435, pad + box * 0.665];
  const C = [pad + box * 0.725, pad + box * 0.345];
  const sw = box * 0.105;                           // 笔画粗细

  const top = [91, 91, 214], bot = [139, 92, 246];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0, cr = 0, cg = 0, cb = 0, n = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S, py = y + (sy + 0.5) / S;
          let a = 0, col;
          // 圆角矩形
          const cx = Math.min(Math.max(px, pad + r), pad + box - r);
          const cy = Math.min(Math.max(py, pad + r), pad + box - r);
          const d = Math.hypot(px - cx, py - cy);
          if (d < r) a = 1;
          else if (d < r + 1) a = r + 1 - d;
          if (a > 0) {
            // 渐变 + 顶部柔光
            let t = py / size;
            col = mix(top, bot, Math.pow(t, 0.85));
            const hl = Math.max(0, 1 - Math.hypot(px / size - 0.28, py / size - 0.18) / 0.55);
            col = mix(col, [255, 255, 255], hl * 0.28);
          }
          // 勾形
          const gd = Math.min(distSeg(px, py, A[0], A[1], B[0], B[1]),
                              distSeg(px, py, B[0], B[1], C[0], C[1]));
          const ga = Math.max(0, Math.min(1, sw / 2 + 0.7 - gd));
          if (ga > a) { a = ga; col = [255, 255, 255]; }
          acc += a; cr += (col ? col[0] : 0) * a; cg += (col ? col[1] : 0) * a; cb += (col ? col[2] : 0) * a; n++;
        }
      }
      const alpha = Math.max(0, Math.min(1, acc / n));
      const i = (y * size + x) * 4;
      if (alpha <= 0.001) { rgba[i] = 0; rgba[i+1] = 0; rgba[i+2] = 0; rgba[i+3] = 0; }
      else {
        rgba[i] = Math.round(cr / n / alpha);
        rgba[i+1] = Math.round(cg / n / alpha);
        rgba[i+2] = Math.round(cb / n / alpha);
        rgba[i+3] = Math.round(alpha * 255);
      }
    }
  }
  return encodePNG(size, size, rgba);
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
for (const s of [192, 512]) {
  fs.writeFileSync(path.join(out, `icon-${s}.png`), makeIcon(s, false));
  console.log(`icon-${s}.png ok`);
}
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), makeIcon(512, true));
console.log('icon-maskable-512.png ok');
fs.writeFileSync(path.join(out, 'apple-touch-icon-180.png'), makeIcon(180, false));
console.log('apple-touch-icon-180.png ok');
