import fs from "node:fs"; import { execFileSync } from "node:child_process";
const map = [["Fios de Sutura","slides-fios"],["Instrumentação Cirúrgica e Material","slides-instr"],["INSTRUMENTAÇÃO CIRÚRGICA.pdf","instr-cirurgica"],["Resumo Instrumentação","resumo-instr"],["Apostila Prática Sutura","apostila-sutura"],["Apostila Prática Mesa","apostila-mesa"],["BTCA roteiro","roteiro"],["BTCA resumo","resumo"]];
const files = fs.readdirSync("..");
for (const [k,slug] of map) {
  const f = files.find(x => x.normalize("NFC").includes(k.normalize("NFC")));
  try { console.log(execFileSync("node",["images.mjs","../"+f,slug]).toString().trim()); } catch(e){ console.log(slug, String(e.stderr||e).slice(0,400)); }
}
