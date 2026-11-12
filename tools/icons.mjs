// Gera os ícones PNG do app (o iPad não aceita SVG como ícone da Tela de Início).
// Desenha a mesma figura de content/icon.svg (viewBox 512) com um rasterizador simples. Uso: node tools/icons.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const FUNDO = [0x1f, 0x5e, 0x4a], TRACO = [0xe9, 0xf2, 0xee], DESTAQUE = [0x9f, 0xd8, 0xbf];
const distSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
// curva do destaque (quadrática M330 110 q40 40 60 80... aproximada por pontos)
const curva = []; for (let t = 0; t <= 1; t += 0.02) { const x = (1 - t) ** 2 * 330 + 2 * (1 - t) * t * 370 + t * t * 382, y = (1 - t) ** 2 * 110 + 2 * (1 - t) * t * 150 + t * t * 230; curva.push([x, y]); }
function cor(x, y) {
  // canto arredondado (raio 112)
  const r = 112, cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r);
  if (Math.hypot(x - cx, y - cy) > r) return null;
  let c = FUNDO;
  for (let i = 1; i < curva.length; i++) if (distSeg(x, y, ...curva[i - 1], ...curva[i]) <= 7) c = DESTAQUE;
  const anel = (ax, ay) => Math.abs(Math.hypot(x - ax, y - ay) - 46) <= 13;
  if (anel(176, 372) || anel(300, 372) || distSeg(x, y, 200, 334, 330, 110) <= 13 || distSeg(x, y, 276, 334, 206, 190) <= 13) c = TRACO;
  return c;
}
function png(tam) {
  const SS = 4, linhas = [];
  for (let j = 0; j < tam; j++) {
    const l = Buffer.alloc(1 + tam * 4); l[0] = 0;
    for (let i = 0; i < tam; i++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = cor(((i + (sx + 0.5) / SS) / tam) * 512, ((j + (sy + 0.5) / SS) / tam) * 512);
        if (c) { rr += c[0]; gg += c[1]; bb += c[2]; aa++; }
      }
      const o = 1 + i * 4, n = SS * SS;
      // ícone da Tela de Início: fundo opaco (o iOS não aceita transparência); cantos ficam na cor do fundo
      l[o] = aa ? Math.round(rr / aa) : FUNDO[0]; l[o + 1] = aa ? Math.round(gg / aa) : FUNDO[1]; l[o + 2] = aa ? Math.round(bb / aa) : FUNDO[2]; l[o + 3] = 255;
      void n;
    }
    linhas.push(l);
  }
  const crc = (buf) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const b of buf) x = t[(x ^ b) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (tipo, dados) => { const len = Buffer.alloc(4); len.writeUInt32BE(dados.length); const td = Buffer.concat([Buffer.from(tipo), dados]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))), chunk("IEND", Buffer.alloc(0))]);
}
for (const t of [180, 192, 512]) { fs.writeFileSync(path.resolve(AQUI, `../content/icon-${t}.png`), png(t)); console.log(`content/icon-${t}.png`); }
