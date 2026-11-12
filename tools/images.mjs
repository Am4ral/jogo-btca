// Extrai as imagens embutidas de cada página, na resolução original.
// Uso: node images.mjs <pdf> <slug>
import * as mupdf from "mupdf";
import fs from "node:fs";
import path from "node:path";

const [, , pdfPath, slug] = process.argv;
const outDir = path.resolve("../extracted", slug, "images");
fs.mkdirSync(outDir, { recursive: true });
const doc = mupdf.Document.openDocument(fs.readFileSync(pdfPath), "application/pdf");
const index = [];
for (let i = 0; i < doc.countPages(); i++) {
  const page = doc.loadPage(i);
  const st = page.toStructuredText("preserve-images");
  let k = 0;
  st.walk({
    onImageBlock(bbox, transform, image) {
      const w = image.getWidth(), h = image.getHeight();
      if (w < 80 || h < 80) return; // ignora ícones e decorações pequenas
      k++;
      const name = `p${String(i + 1).padStart(3, "0")}_${k}.png`;
      try {
        const pix = image.toPixmap();
        const png = pix.getColorSpace()?.getNumberOfComponents() === 4
          ? pix.convertToColorSpace(mupdf.ColorSpace.DeviceRGB).asPNG()
          : pix.asPNG();
        fs.writeFileSync(path.join(outDir, name), png);
        index.push({ file: name, page: i + 1, w, h, bbox: bbox.map(Math.round) });
      } catch (e) { index.push({ file: name, page: i + 1, erro: String(e) }); }
    },
  });
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 1));
console.log(`${slug}: ${index.length} imagens`);
