import fs from "node:fs"; import { execFileSync } from "node:child_process";
const map = [["Instrumentação Cirúrgica e Material","slides-instr"],["INSTRUMENTAÇÃO CIRÚRGICA.pdf","instr-cirurgica"],["Resumo Instrumentação","resumo-instr"],["Apostila Prática Sutura","apostila-sutura"],["Apostila Prática Mesa","apostila-mesa"]];
const files = fs.readdirSync("..");
for (const [k,slug] of map) {
  const f = files.find(x => x.normalize("NFC").includes(k.normalize("NFC")));
  console.log(execFileSync("node",["extract.mjs","../"+f,slug]).toString().trim());
}
