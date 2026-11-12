// Valida o conteúdo do jogo. Uso: node validate-content.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const C = path.resolve(AQUI, "../content");
const load = (f) => JSON.parse(fs.readFileSync(path.join(C, f), "utf8"));
const fios = load("fios.json").itens;
const instr = load("instrumentos.json").itens;
const termos = load("termos.json").itens;
const conf = load("confusoes.json").itens;
const blocos = load("blocos.json");
const fontes = Object.keys(load("fontes.json").documentos);

const erros = [], avisos = [];
const all = [...fios, ...instr];
const ids = new Set(all.map((i) => i.id));

// 1. contagem e ids únicos
if (fios.length !== 14) erros.push(`Esperados 14 fios, há ${fios.length}`);
if (instr.length !== 28) erros.push(`Esperados 28 instrumentos, há ${instr.length}`);
if (ids.size !== all.length) erros.push("IDs duplicados");

// 2. atributos: status válido, fonte válida, valor coerente com o status
const STATUS = ["material", "externa", "divergente", "lacuna"];
const isAttr = (v) => v && typeof v === "object" && !Array.isArray(v) && "s" in v;
const contagem = { material: 0, externa: 0, divergente: 0, lacuna: 0 };
for (const it of all) {
  for (const [k, a] of Object.entries(it)) {
    if (!isAttr(a)) continue;
    if (!STATUS.includes(a.s)) erros.push(`${it.id}.${k}: status inválido '${a.s}'`);
    contagem[a.s]++;
    for (const f of a.f || []) {
      const doc = f.split(" ")[0];
      if (!fontes.includes(doc)) erros.push(`${it.id}.${k}: fonte desconhecida '${f}'`);
    }
    if (a.s === "lacuna" && a.v !== null && !(Array.isArray(a.v) && a.v.length === 0)) avisos.push(`${it.id}.${k}: marcado como lacuna mas tem valor`);
    if (["externa", "divergente"].includes(a.s) && !(a.f || []).length) erros.push(`${it.id}.${k}: '${a.s}' sem fonte`);
    if (a.s === "divergente" && !a.nota) erros.push(`${it.id}.${k}: divergente sem nota explicando`);
  }
  for (const c of it.confundeCom || []) if (!ids.has(c)) erros.push(`${it.id}.confundeCom → '${c}' não existe`);
  for (const im of it.imagens || []) if (!fs.existsSync(path.join(C, im.src))) erros.push(`${it.id}: imagem ausente ${im.src}`);
}

// 3. confusões e blocos referenciam itens existentes
const confIds = new Set(conf.map((c) => c.id));
for (const c of conf) {
  for (const i of c.itens) if (!ids.has(i)) erros.push(`confusão ${c.id} → '${i}' não existe`);
  if (c.imagemComparacao && !fs.existsSync(path.join(C, c.imagemComparacao))) erros.push(`confusão ${c.id}: imagem ausente`);
}
const termoIds = new Set(termos.map((t) => t.id));
const usados = new Set();
for (const camp of blocos.campanhas) for (const b of camp.blocos) {
  for (const i of Array.isArray(b.itens) ? b.itens : []) { if (!ids.has(i)) erros.push(`bloco ${b.id} → '${i}' não existe`); usados.add(i); }
  for (const t of b.termos || []) if (!termoIds.has(t)) erros.push(`bloco ${b.id} → termo '${t}' não existe`);
  for (const c of b.confusoes || []) if (!confIds.has(c)) erros.push(`bloco ${b.id} → confusão '${c}' não existe`);
  for (const i of Array.isArray(b.itens) ? b.itens : []) {
    const it = all.find((x) => x.id === i);
    if (it && it.bloco !== b.id) erros.push(`${i}: campo bloco='${it.bloco}' mas está no bloco ${b.id}`);
  }
}
for (const it of all) if (!usados.has(it.id)) erros.push(`${it.id} não está em nenhum bloco`);

// 3b. falas do cirurgião (modo Instrumentando)
const pedidos = load("pedidos.json").pedidos;
for (const p of pedidos) for (const a of p.aceita) { if (!ids.has(a)) erros.push(`pedido "${p.texto}" → '${a}' não existe`); else if (all.find((x) => x.id === a).tipo === "fio" || fios.some((f) => f.id === a)) erros.push(`pedido "${p.texto}" aceita um fio`); }
const textos = new Set(); for (const p of pedidos) { if (textos.has(p.texto)) erros.push(`pedido duplicado: ${p.texto}`); textos.add(p.texto); }

// 3c. situações de aplicação (fios)
for (const a of load("aplicacoes.json").aplicacoes) for (const id of a.aceita) { if (!fios.some((f) => f.id === id)) erros.push(`aplicação "${a.texto.slice(0, 40)}…" → '${id}' não é um fio`); }

// 4. "Quem sou eu?": dentro de cada bloco, todo par precisa diferir em pelo menos
//    um atributo classificável e não-lacuna; senão a eliminação nunca chega a 1.
const CLASSIF_FIO = ["origem", "absorcao", "estrutura", "mecanismoAbsorcao", "reacaoTecidual", "capilaridade", "memoria", "segurancaNo", "composicao"];
const CLASSIF_INS = ["grupo", "dentes", "serrilha", "versoes", "cabo", "afastadorTipo", "traumatico", "ponta", "funcao"];
const val = (a) => (isAttr(a) && a.s !== "lacuna" ? JSON.stringify(a.v) : undefined);
const indistinguiveis = [];
function checarGrupo(lista, campos, rotulo) {
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const a = lista[i], b = lista[j];
    const difere = campos.some((k) => val(a[k]) !== undefined && val(b[k]) !== undefined && val(a[k]) !== val(b[k]));
    if (!difere) indistinguiveis.push(`${rotulo}: ${a.id} × ${b.id}`);
  }
}
for (const camp of blocos.campanhas) for (const b of camp.blocos) {
  if (!Array.isArray(b.itens)) continue;
  const lista = b.itens.map((i) => all.find((x) => x.id === i));
  checarGrupo(lista, camp.id === "fios" ? CLASSIF_FIO : CLASSIF_INS, b.id);
}
// também na revisão geral (todos contra todos da mesma campanha)
checarGrupo(fios, CLASSIF_FIO, "revisão fios");
checarGrupo(instr, CLASSIF_INS, "revisão instrumentos");
for (const x of indistinguiveis) erros.push(`Quem sou eu? impossível — ${x} não diferem em nenhum atributo cadastrado`);

// 5. imagens: itens sem nenhuma foto utilizável para identificação visual
for (const it of instr) {
  const boas = (it.imagens || []).filter((im) => im.qualidade === "boa" && im.tipo === "inteiro");
  if (!boas.length) avisos.push(`${it.id}: sem foto 'boa' do instrumento inteiro → fora dos modos visuais`);
}

console.log("Atributos por situação:", contagem);
console.log(`\n${avisos.length} avisos:`); avisos.forEach((a) => console.log("  ⚠ " + a));
console.log(`\n${erros.length} erros:`); erros.forEach((e) => console.log("  ✗ " + e));

// 6. (informativo) pares que só se distinguem por texto livre (composição/ponta/função):
//    no "Quem sou eu?", a pista final desses pares precisa ser a característica distintiva.
const CAT_FIO = CLASSIF_FIO.filter((k) => k !== "composicao");
const CAT_INS = ["grupo", "dentes", "serrilha", "versoes", "cabo", "afastadorTipo", "traumatico"];
const soTexto = [];
for (const camp of blocos.campanhas) for (const b of camp.blocos) {
  if (!Array.isArray(b.itens)) continue;
  const lista = b.itens.map((i) => all.find((x) => x.id === i));
  const campos = camp.id === "fios" ? CAT_FIO : CAT_INS;
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const a = lista[i], c = lista[j];
    if (!campos.some((k) => val(a[k]) !== undefined && val(c[k]) !== undefined && val(a[k]) !== val(c[k]))) soTexto.push(`${b.id}: ${a.id} × ${c.id}`);
  }
}
console.log(`\n${soTexto.length} pares que só se separam pela pista final (composição ou traço distintivo):`);
soTexto.forEach((x) => console.log("  · " + x));
process.exit(erros.length ? 1 : 0);
