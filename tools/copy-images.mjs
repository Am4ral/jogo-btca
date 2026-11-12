// Copia as imagens extraídas dos PDFs para content/img com nomes estáveis.
// O mapeamento foi feito olhando cada página renderizada (legendas e posição).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const X = path.resolve(AQUI, "../extracted");
const OUT = path.resolve(AQUI, "../content/img");
const map = {
  // fios (embalagens/ilustrações)
  "fios/categute-embalagem.png": "slides-fios/images/p014_2.png",
  "fios/categute-fio.png": "slides-fios/images/p014_3.png",
  "fios/pga-embalagem.png": "slides-fios/images/p013_2.png",
  "fios/nylon-embalagem.png": "slides-fios/images/p013_5.png",
  "fios/polipropileno-embalagem.png": "slides-fios/images/p013_4.png",
  "fios/poliglecaprone-embalagem.png": "slides-fios/images/p013_3.png",
  // diérese
  "instr/cabos-3-4-produto.png": "resumo-instr/images/p001_1.png",
  "instr/cabos-3-4-foto.png": "slides-instr/images/p008_5.png",
  "instr/cabo-4.png": "instr-cirurgica/images/p001_12.png",
  "instr/laminas-numeradas.png": "slides-instr/images/p008_4.png",
  "instr/laminas-produto.png": "resumo-instr/images/p001_2.png",
  "instr/bisturi-eletrico.png": "resumo-instr/images/p001_3.png",
  "instr/metzenbaum-reta.png": "resumo-instr/images/p001_6.png",
  "instr/metzenbaum-curva.png": "resumo-instr/images/p001_7.png",
  "instr/mayo-reta.png": "resumo-instr/images/p002_1.png",
  "instr/mayo-curva.png": "resumo-instr/images/p002_2.png",
  "instr/metzenbaum-x-mayo.png": "slides-instr/images/p010_4.png",
  // hemostasia
  "instr/kelly-reta.png": "resumo-instr/images/p003_5.png",
  "instr/kelly-curva.png": "resumo-instr/images/p003_6.png",
  "instr/kelly-x-crile.png": "slides-instr/images/p014_4.png",
  "instr/crile-reta.png": "resumo-instr/images/p004_1.png",
  "instr/crile-curva.png": "resumo-instr/images/p004_2.png",
  "instr/mixter.png": "resumo-instr/images/p004_3.png",
  "instr/halsted-reta.png": "resumo-instr/images/p004_4.png",
  "instr/halsted-curva.png": "resumo-instr/images/p004_5.png",
  "instr/halsted-x-kelly.png": "slides-instr/images/p015_4.png",
  // preensão
  "instr/anatomica.png": "resumo-instr/images/p002_3.png",
  "instr/anatomica-2.png": "slides-instr/images/p023_4.png",
  "instr/dente-de-rato.png": "resumo-instr/images/p002_4.png",
  "instr/dente-de-rato-2.png": "slides-instr/images/p023_5.png",
  "instr/allis.png": "resumo-instr/images/p002_5.png",
  "instr/kocher-reta.png": "resumo-instr/images/p003_1.png",
  "instr/kocher-curva.png": "resumo-instr/images/p003_2.png",
  "instr/backhaus.png": "resumo-instr/images/p003_3.png",
  "instr/backhaus-2.png": "instr-cirurgica/images/p001_3.png",
  "instr/babcock.png": "resumo-instr/images/p003_4.png",
  // afastamento
  "instr/maleavel.png": "resumo-instr/images/p005_2.png",
  "instr/doyen-2.png": "resumo-instr/images/p005_4.png",
  "instr/finochietto-2.png": "resumo-instr/images/p006_4.png",
  "instr/gosset.png": "resumo-instr/images/p006_5.png",
  "instr/farabeuf.png": "resumo/images/p009_1.png",
  "instr/doyen.png": "resumo/images/p009_2.png",
  "instr/finochietto.png": "resumo/images/p009_3.png",
  "instr/gosset-2.png": "resumo/images/p009_4.png",
  "instr/farabeuf-par.png": "instr-cirurgica/images/p001_1.png",
  // auxiliar
  "instr/cheron.png": "resumo-instr/images/p007_2.png",
  "instr/cheron-2.png": "instr-cirurgica/images/p001_4.png",
  // síntese
  "instr/mayo-hegar.png": "resumo-instr/images/p008_1.png",
  "instr/mayo-hegar-2.png": "slides-instr/images/p021_4.png",
  "instr/mathieu.png": "resumo-instr/images/p008_2.png",
  "instr/mathieu-2.png": "slides-instr/images/p021_5.png",
  "instr/adson-sem-dentes.png": "resumo-instr/images/p008_3.png",
  "instr/adson-com-dentes.png": "resumo-instr/images/p008_5.png",
};
for (const [dst, src] of Object.entries(map)) {
  const to = path.join(OUT, dst);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(X, src), to);
}
console.log(`${Object.keys(map).length} imagens copiadas para content/img`);
