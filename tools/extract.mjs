// Extrai texto por página e renderiza cada página em PNG.
// Uso: node extract.mjs <pdf> <slug>
import * as mupdf from "mupdf";
import fs from "node:fs";
import path from "node:path";

const [, , pdfPath, slug, dpiArg] = process.argv;
const dpi = Number(dpiArg || 110);
const outDir = path.resolve("../extracted", slug);
fs.mkdirSync(path.join(outDir, "pages"), { recursive: true });

const doc = mupdf.Document.openDocument(fs.readFileSync(pdfPath), "application/pdf");
const n = doc.countPages();
let allText = "";
for (let i = 0; i < n; i++) {
  const page = doc.loadPage(i);
  const text = page.toStructuredText("preserve-whitespace").asText();
  allText += `\n\n===== PÁGINA ${i + 1} =====\n${text}`;
  const scale = dpi / 72;
  const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  fs.writeFileSync(path.join(outDir, "pages", `p${String(i + 1).padStart(3, "0")}.png`), pix.asPNG());
}
fs.writeFileSync(path.join(outDir, "text.txt"), allText);
console.log(`${slug}: ${n} páginas, ${allText.length} caracteres de texto`);
