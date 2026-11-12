// Frases de ficha (Encontre o erro) e afirmações de comparação.
// Cada atributo vira um "segmento" com um domínio fechado de valores possíveis,
// para que a adulteração troque um valor válido por outro valor válido do MESMO atributo.
import { type Item, type Fio, type Instrumento, type Attr, type Grupo, GRUPO, VALOR, fios, instrumentos, confusoes } from './content'
import { art } from './perguntas'

export type Segmento = {
  campo: string
  verdadeiro: string
  dominio: string[] // valores possíveis (inclui o verdadeiro)
  rotulo: (v: string) => string // frase curta para o valor
  material: boolean // consta no material da disciplina
}

const ok = (a?: Attr) => !!a && a.s !== 'lacuna' && a.v !== null && a.v !== undefined
// divergências nunca entram: o aluno poderia "corrigir" para a alternativa, que também é aceita
const usavel = (a?: Attr) => ok(a) && a!.s !== 'divergente'
const nivel2 = (v: unknown) => (v === 'alta' || v === 'muito_alta' ? 'alta' : v === 'baixa' || v === 'muito_baixa' ? 'baixa' : null)
const MARCAS: Record<string, string> = { vicryl: 'Vicryl', dexon: 'Dexon', monocryl: 'Monocryl', pds: 'PDS', polipropileno: 'Prolene', poligliconato: 'Maxon' }
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export function segmentosFio(f: Fio): Segmento[] {
  const s: Segmento[] = []
  const m = (a?: Attr) => a?.s === 'material'
  if (usavel(f.origem)) s.push({ campo: 'origem', verdadeiro: f.origem.v, dominio: ['natural', 'sintetico'], rotulo: (v) => (v === 'natural' ? 'de origem natural' : 'sintético'), material: m(f.origem) })
  if (usavel(f.absorcao)) s.push({ campo: 'absorcao', verdadeiro: f.absorcao.v, dominio: ['absorvivel', 'inabsorvivel'], rotulo: (v) => VALOR[v], material: m(f.absorcao) })
  if (f.absorcao.v === 'absorvivel' && usavel(f.mecanismoAbsorcao))
    s.push({ campo: 'mecanismoAbsorcao', verdadeiro: f.mecanismoAbsorcao.v as string, dominio: ['hidrolise', 'proteolise_fagocitose'], rotulo: (v) => (v === 'hidrolise' ? 'absorvido por hidrólise' : 'absorvido por proteólise e fagocitose'), material: m(f.mecanismoAbsorcao) })
  if (usavel(f.estrutura) && f.estrutura.v !== 'ambos')
    s.push({ campo: 'estrutura', verdadeiro: f.estrutura.v.startsWith('multi') ? 'multi' : 'mono', dominio: ['mono', 'multi'], rotulo: (v) => (v === 'mono' ? 'monofilamentar' : 'multifilamentar'), material: m(f.estrutura) })
  const cap = nivel2(f.capilaridade?.v)
  if (usavel(f.capilaridade) && cap) s.push({ campo: 'capilaridade', verdadeiro: cap, dominio: ['alta', 'baixa'], rotulo: (v) => `com capilaridade ${v}`, material: m(f.capilaridade) })
  const rea = nivel2(f.reacaoTecidual?.v)
  if (usavel(f.reacaoTecidual) && rea) s.push({ campo: 'reacaoTecidual', verdadeiro: rea, dominio: ['alta', 'baixa'], rotulo: (v) => `com reação tecidual ${v}`, material: m(f.reacaoTecidual) })
  if (MARCAS[f.id]) {
    const dom = Object.values(MARCAS)
    s.push({ campo: 'comercial', verdadeiro: MARCAS[f.id], dominio: dom, rotulo: (v) => `vendido como ${v}`, material: true })
  }
  if (usavel(f.composicao)) {
    const dom = fios.filter((x) => usavel(x.composicao) && x.tipo === 'fio').map((x) => x.composicao.v)
    s.push({ campo: 'composicao', verdadeiro: f.composicao.v, dominio: [...new Set(dom)], rotulo: (v) => `composto de ${minus(v)}`, material: m(f.composicao) })
  }
  return s
}

export function segmentosInstr(i: Instrumento): Segmento[] {
  const s: Segmento[] = []
  const m = (a?: Attr) => a?.s === 'material'
  // concordância com 'um instrumento' (masculino): 'usado', 'traumático'
  const a = 'o'
  if (usavel(i.grupo)) s.push({ campo: 'grupo', verdadeiro: i.grupo.v, dominio: Object.keys(GRUPO), rotulo: (v) => (v === 'auxiliar' ? 'auxiliar' : `de ${GRUPO[v as Grupo].toLowerCase()}`), material: m(i.grupo) })
  if (usavel(i.funcao)) {
    // funções de outros grupos: trocar por uma do mesmo grupo seria ambíguo (ex.: 'pinçar vasos' × 'pinçar pequenos vasos')
    const dom = [i.funcao.v, ...instrumentos.filter((x) => usavel(x.funcao) && x.grupo.v !== i.grupo.v).map((x) => x.funcao.v)]
    s.push({ campo: 'funcao', verdadeiro: i.funcao.v, dominio: [...new Set(dom)], rotulo: (v) => `usad${a} para ${minus(v)}`, material: m(i.funcao) })
  }
  const cabo = ok(i.cabo) ? (i.cabo.v === 'argolas_cremalheira' || i.cabo.v === 'argolas' ? 'argolas' : i.cabo.v === 'pinca_mola' ? 'mola' : null) : null
  if (cabo && ['hemostasia', 'preensao', 'sintese'].includes(i.grupo.v))
    s.push({ campo: 'cabo', verdadeiro: cabo, dominio: ['argolas', 'mola'], rotulo: (v) => (v === 'argolas' ? 'com argolas e cremalheira' : 'com cabo de pinça (mola), sem argolas'), material: true })
  if (usavel(i.dentes) && typeof i.dentes.v === 'boolean' && ['preensao', 'sintese'].includes(i.grupo.v) && !['mayo-hegar', 'mathieu'].includes(i.id))
    s.push({ campo: 'dentes', verdadeiro: String(i.dentes.v), dominio: ['true', 'false'], rotulo: (v) => (v === 'true' ? 'com dentes na ponta' : 'sem dentes na ponta'), material: m(i.dentes) })
  if (usavel(i.serrilha) && i.grupo.v === 'hemostasia' && ['total', 'dois_tercos'].includes(i.serrilha.v as string))
    s.push({ campo: 'serrilha', verdadeiro: i.serrilha.v as string, dominio: ['total', 'dois_tercos'], rotulo: (v) => (v === 'total' ? 'com ranhuras em toda a mandíbula' : 'com ranhuras só até 2/3 da mandíbula'), material: m(i.serrilha) })
  if (usavel(i.traumatico) && typeof i.traumatico.v === 'boolean')
    s.push({ campo: 'traumatico', verdadeiro: String(i.traumatico.v), dominio: ['true', 'false'], rotulo: (v) => (v === 'true' ? 'traumátic' + a : 'atraumátic' + a), material: m(i.traumatico) })
  if (i.afastadorTipo && usavel(i.afastadorTipo))
    s.push({ campo: 'afastadorTipo', verdadeiro: i.afastadorTipo.v, dominio: ['dinamico', 'autoestatico'], rotulo: (v) => (v === 'dinamico' ? 'dinâmico (segurado por um auxiliar)' : 'autoestático (fica aberto sozinho)'), material: m(i.afastadorTipo) })
  if (usavel(i.versoes) && i.versoes.v.length && i.versoes.s === 'material' && i.versoes.v.every((x) => x === 'reta' || x === 'curva')) {
    const v = i.versoes.v.length === 2 ? 'ambas' : i.versoes.v[0]
    s.push({ campo: 'versoes', verdadeiro: v, dominio: ['ambas', 'reta', 'curva'], rotulo: (x) => (x === 'ambas' ? 'existente em versão reta e curva' : `existente só na versão ${x}`), material: true })
  }
  return s
}

export const segmentos = (it: Item) => (it.tipo === 'fio' ? segmentosFio(it) : segmentosInstr(it))

/** Atributos que o material destaca para diferenciar o item dos semelhantes: mutá-los ensina mais. */
export function camposPrioritarios(it: Item): string[] {
  const s = new Set<string>()
  for (const c of confusoes) if (c.itens.includes(it.id)) for (const a of c.atributos) s.add(a === 'reacaoTecidual' ? 'reacaoTecidual' : a)
  return [...s]
}

/** Abertura da frase. O nome comercial NÃO aparece aqui, porque ele é um dos segmentos que podem estar errados. */
export function abertura(it: Item): string {
  if (it.tipo === 'fio') return `O fio de ${it.nome.toLowerCase()} é`
  return `${art(it.nome) === 'a' ? 'A' : 'O'} ${it.nome} é um instrumento`
}
