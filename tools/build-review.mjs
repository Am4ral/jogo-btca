// Gera revisao-conteudo.html: todas as fichas com a fonte e a situação de cada atributo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(AQUI, "..");
const C = path.join(ROOT, "content");
const load = (f) => JSON.parse(fs.readFileSync(path.join(C, f), "utf8"));
const fios = load("fios.json");
const instr = load("instrumentos.json");
const termos = load("termos.json").itens;
const conf = load("confusoes.json").itens;
const blocos = load("blocos.json");
const fontes = load("fontes.json");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ROT = {
  origem: "Origem", composicao: "Composição", absorcao: "Absorção", mecanismoAbsorcao: "Mecanismo de absorção",
  tempoAbsorcao: "Tempo de absorção", resistenciaTensil: "Resistência tênsil", estrutura: "Estrutura",
  reacaoTecidual: "Reação tecidual", capilaridade: "Capilaridade", memoria: "Memória", manuseio: "Manuseio",
  segurancaNo: "Segurança do nó", indicacoes: "Indicações", limitacoes: "Limitações",
  grupo: "Grupo", funcao: "Função", ponta: "Ponta / mandíbula", dentes: "Dentes", serrilha: "Serrilha",
  versoes: "Versões", traumatico: "Traumático", cabo: "Cabo", usos: "Usos", afastadorTipo: "Tipo de afastador",
};
const VAL = {
  natural: "natural", sintetico: "sintético", absorvivel: "absorvível", inabsorvivel: "inabsorvível",
  mono: "monofilamentar", multi_trancado: "multifilamentar trançado", multi_torcido: "multifilamentar torcido", ambos: "mono ou multifilamentar",
  hidrolise: "hidrólise", proteolise_fagocitose: "proteólise / fagocitose",
  muito_baixa: "muito baixa", baixa: "baixa", moderada: "moderada", alta: "alta", muito_alta: "muito alta",
  dierese: "diérese", hemostasia: "hemostasia", preensao: "preensão", sintese: "síntese", afastamento: "afastamento", auxiliar: "auxiliar",
  total: "em toda a extensão", dois_tercos: "até 2/3 da mandíbula", ausente: "ausente", cruzada: "cruzada", na: "não se aplica",
  argolas_cremalheira: "argolas + cremalheira", argolas: "argolas", pinca_mola: "de pinça (mola)", reto: "reto", manual: "manual (segurado)",
  cremalheira_manivela: "barra dentada + manivela", outro: "outro", dinamico: "dinâmico", autoestatico: "autoestático",
};
const fmt = (v, a) => {
  if (v === null || v === undefined) return "—";
  if (v === true) return "sim";
  if (v === false) return "não";
  if (Array.isArray(v)) return v.length ? v.map((x) => VAL[x] ?? x).join("; ") : "—";
  let s = VAL[v] ?? v;
  if (a?.detalhe) s += ` (${a.detalhe})`;
  return s;
};
const SIT = { material: "No material", externa: "Fonte externa", divergente: "Divergente", lacuna: "Lacuna" };
const isAttr = (v) => v && typeof v === "object" && !Array.isArray(v) && "s" in v;

function card(it, tipo) {
  const linhas = Object.entries(it).filter(([, a]) => isAttr(a)).map(([k, a]) => `
      <tr class="s-${a.s}">
        <th>${esc(ROT[k] ?? k)}</th>
        <td>${esc(fmt(a.v, a))}${a.extra ? `<div class="extra">+ ${esc(a.extra.join("; "))}</div>` : ""}${a.nota ? `<div class="nota">${esc(a.nota)}</div>` : ""}</td>
        <td><span class="tag tag-${a.s}">${SIT[a.s]}</span><div class="fonte">${esc((a.f || []).join(", "))}</div></td>
      </tr>`).join("");
  const imgs = (it.imagens || []).map((im) => `
      <figure class="q-${im.qualidade}"><img src="content/${esc(im.src)}" alt="${esc(it.nome)}" loading="lazy">
        <figcaption><b>${esc(im.qualidade)}</b> · ${esc(im.fonte)}${im.nota ? `<br>${esc(im.nota)}` : ""}</figcaption></figure>`).join("");
  const alertas = [it.alerta, it.alertaMaterial, it.alertaVisual].filter(Boolean).map((a) => `<p class="alerta">${esc(a)}</p>`).join("");
  return `
  <article class="card" id="${it.id}">
    <header><h3>${esc(it.nome)}</h3><span class="sub">${esc([...(it.comerciais || []), ...(it.sinonimos || [])].join(" · "))} · bloco ${esc(it.bloco)}</span></header>
    ${alertas}
    ${imgs ? `<div class="imgs">${imgs}</div>` : `<p class="semfoto">Sem fotografia nos materiais.</p>`}
    <table>${linhas}</table>
    <p><b>Diferencial:</b> ${esc(it.diferencial ?? it.reconhecimento)}</p>
    ${it.estrutura && tipo === "instr" ? "" : ""}
    <p><b>Não confundir com:</b> ${(it.confundeCom || []).map((c) => `<a href="#${c}">${esc(c)}</a>`).join(", ")}</p>
  </article>`;
}

const todos = [...fios.itens, ...instr.itens];
const pend = [];
for (const it of todos) for (const [k, a] of Object.entries(it)) if (isAttr(a) && a.s === "divergente") pend.push({ it, k, a });
const alertasItens = todos.filter((i) => i.alerta || i.alertaMaterial);

const secao = (camp, tipo, lista) => camp.blocos.filter((b) => Array.isArray(b.itens)).map((b) => `
  <h2 id="b-${b.id}">${esc(b.id)} · ${esc(b.titulo)}</h2>${b.nota ? `<p class="sub">${esc(b.nota)}</p>` : ""}
  <div class="grid">${b.itens.map((id) => card(lista.find((x) => x.id === id), tipo)).join("")}</div>`).join("");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisão do conteúdo BTCA</title>
<style>
:root{--bg:#f6f7f5;--card:#fff;--fg:#1d2420;--mut:#5d6b64;--line:#dfe4e1;--ok:#2f7d55;--ext:#2f62a8;--div:#b5651d;--lac:#8a8f8c;--warn-bg:#fff4e5;--warn:#8a4b00}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121614;--card:#1b211e;--fg:#e6ece8;--mut:#9aa8a1;--line:#2c3430;--ok:#5cc28c;--ext:#7aa7ea;--div:#e39a55;--lac:#8d948f;--warn-bg:#3a2a12;--warn:#f3c27a}}
:root[data-theme="dark"]{--bg:#121614;--card:#1b211e;--fg:#e6ece8;--mut:#9aa8a1;--line:#2c3430;--ok:#5cc28c;--ext:#7aa7ea;--div:#e39a55;--lac:#8d948f;--warn-bg:#3a2a12;--warn:#f3c27a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1200px;margin:auto;padding:24px 16px 80px}h1{font-size:1.7rem;margin:0 0 4px}h2{margin:40px 0 12px;border-bottom:2px solid var(--line);padding-bottom:6px}
.sub{color:var(--mut);font-size:.88rem}nav{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}nav a{padding:4px 10px;border:1px solid var(--line);border-radius:99px;text-decoration:none;color:var(--fg);font-size:.85rem;background:var(--card)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;overflow:hidden}.card h3{margin:0;font-size:1.15rem}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:.88rem}th,td{text-align:left;vertical-align:top;padding:6px 6px;border-top:1px solid var(--line)}th{width:28%;color:var(--mut);font-weight:600}td:last-child{width:26%}
tr.s-lacuna td:nth-child(2){color:var(--lac)}.nota{color:var(--mut);font-size:.82rem;margin-top:3px}.extra{color:var(--mut);font-size:.82rem}.fonte{color:var(--mut);font-size:.75rem;margin-top:2px}
.tag{display:inline-block;font-size:.72rem;font-weight:700;padding:1px 7px;border-radius:99px;color:#fff}.tag-material{background:var(--ok)}.tag-externa{background:var(--ext)}.tag-divergente{background:var(--div)}.tag-lacuna{background:var(--lac)}
.imgs{display:flex;gap:8px;overflow-x:auto;padding:4px 0}figure{margin:0;flex:0 0 160px}figure img{width:160px;height:120px;object-fit:contain;background:#fff;border-radius:8px;border:2px solid var(--line)}
figure.q-boa img{border-color:var(--ok)}figure.q-aceitavel img{border-color:var(--div)}figure.q-insuficiente img{border-color:#c0392b;opacity:.7}figcaption{font-size:.72rem;color:var(--mut)}
.alerta,.box{background:var(--warn-bg);color:var(--warn);border-radius:8px;padding:8px 12px;font-size:.88rem}.semfoto{color:var(--div);font-weight:600}
.legend span{margin-right:10px}@media (max-width:640px){table,tbody,tr,th,td{display:block;width:auto!important}tr{border-top:1px solid var(--line);padding:6px 0}th,td{border:0;padding:2px 0}}ul.pend li{margin-bottom:6px}a{color:var(--ext)}
</style></head><body><main>
<h1>Revisão do conteúdo — Jogo BTCA</h1>
<p class="sub">Gerado a partir de <code>content/*.json</code>. 14 fios · 28 instrumentos · ${termos.length} termos · ${conf.length} pares de confusão. Confira cada ficha antes de jogar.</p>
<p class="legend"><span class="tag tag-material">No material</span> consta nos PDFs da disciplina
<span class="tag tag-externa">Fonte externa</span> não consta; valor de referência a conferir
<span class="tag tag-divergente">Divergente</span> materiais discordam (ver nota)
<span class="tag tag-lacuna">Lacuna</span> não consta e não foi preenchido</p>
<p class="box"><b>Banco de provas:</b> ${esc(fontes.bancoDeProvas)}<br><b>Regra adotada:</b> ${esc(fontes.regra)}</p>

<h2>O que precisa da sua conferência</h2>
<h3>Itens com alerta</h3><ul class="pend">${alertasItens.map((i) => `<li><a href="#${i.id}">${esc(i.nome)}</a>: ${esc(i.alerta || i.alertaMaterial)}</li>`).join("")}</ul>
<h3>Divergências (${pend.length})</h3><ul class="pend">${pend.map(({ it, k, a }) => `<li><a href="#${it.id}">${esc(it.nome)}</a> · ${esc(ROT[k] ?? k)}: ${esc(a.nota)}</li>`).join("")}</ul>
<h3>Termos com observação</h3><ul class="pend">${termos.filter((t) => t.nota).map((t) => `<li><b>${esc(t.termo)}</b>: ${esc(t.nota)}</li>`).join("")}</ul>

<nav>${blocos.campanhas.flatMap((c) => c.blocos.filter((b) => Array.isArray(b.itens))).map((b) => `<a href="#b-${b.id}">${b.id} ${esc(b.titulo)}</a>`).join("")}<a href="#termos">Termos</a><a href="#confusoes">Semelhantes</a></nav>

<h1 style="margin-top:32px">Fios de sutura</h1>
<p class="box">Ordem de resistência (slides p8) — inabsorvíveis: ${fios._rankingResistencia.inabsorviveis.join(" > ")} · absorvíveis: ${fios._rankingResistencia.absorviveis.join(" > ")}</p>
${secao(blocos.campanhas[0], "fio", fios.itens)}
<h1 style="margin-top:32px">Instrumentação</h1>
${secao(blocos.campanhas[1], "instr", instr.itens)}

<h2 id="termos">Termos que podem ser abertos</h2>
<div class="grid">${termos.map((t) => `<div class="card"><h3>${esc(t.termo)}</h3><p>${esc(t.definicao)}</p><p><b>Na prática:</b> ${esc(t.consequencia)}</p>${t.nota ? `<p class="alerta">${esc(t.nota)}</p>` : ""}<p class="fonte">${esc(t.f.join(", "))}</p></div>`).join("")}</div>

<h2 id="confusoes">Pares que confundem</h2>
<div class="grid">${conf.map((c) => `<div class="card"><h3>${c.itens.map((i) => `<a href="#${i}">${esc(todos.find((x) => x.id === i).nome)}</a>`).join(" × ")}</h3><p>${esc(c.chave)}</p>${c.imagemComparacao ? `<figure class="q-${c.qualidadeComparacao}"><img src="content/${c.imagemComparacao}" alt=""><figcaption>${esc(c.qualidadeComparacao)}</figcaption></figure>` : ""}${c.alerta ? `<p class="alerta">${esc(c.alerta)}</p>` : ""}</div>`).join("")}</div>
</main></body></html>`;

fs.writeFileSync(path.join(ROOT, "revisao-conteudo.html"), html);
console.log("revisao-conteudo.html gerado");
