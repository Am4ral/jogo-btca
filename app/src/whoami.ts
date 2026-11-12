// Motor do "Quem sou eu?" por eliminação.
// Cada pista é um predicado sobre um atributo. Um candidato só pode ser eliminado se a pista
// o contradiz; atributo 'lacuna' = desconhecido = NÃO permite eliminar.
// O palpite só é liberado quando sobra exatamente um candidato logicamente compatível.
import { type Item, type Fio, type Instrumento, type Attr, GRUPO, VALOR, itens } from './content'

export type Pista = {
  id: string
  texto: string
  /** true = compatível, false = contradiz, null = não dá para saber (lacuna) */
  testa: (it: Item) => boolean | null
  final?: boolean
}

const ok = (a?: Attr) => !!a && a.s !== 'lacuna' && a.v !== null && a.v !== undefined
const nivel2 = (v: unknown) => (v === 'alta' || v === 'muito_alta' ? 'alta' : v === 'baixa' || v === 'muito_baixa' ? 'baixa' : v === 'moderada' ? 'moderada' : null)
const multi = (e: unknown) => String(e).startsWith('multi')

/** Pista categórica: compara um valor derivado do atributo; null quando não se sabe. */
function pistaCat(id: string, texto: string, alvo: string, valorDe: (it: Item) => string | null): Pista {
  return { id, texto, testa: (it) => { const v = valorDe(it); return v === null ? null : v === alvo } }
}

const vFio = (f: (x: Fio) => string | null) => (it: Item) => (it.tipo === 'fio' ? f(it) : null)
const vIns = (f: (x: Instrumento) => string | null) => (it: Item) => (it.tipo === 'instr' ? f(it) : null)

export function pistasVerdadeiras(t: Item): Pista[] {
  const p: Pista[] = []
  if (t.tipo === 'fio') {
    const origem = vFio((f) => (ok(f.origem) ? f.origem.v : null))
    if (ok(t.origem)) p.push(pistaCat('origem', t.origem.v === 'natural' ? 'Sou de origem natural.' : 'Sou sintético.', t.origem.v, origem))
    if (ok(t.origem) && t.origem.detalhe)
      p.push(pistaCat('origem-detalhe', `Minha origem é ${t.origem.detalhe}.`, t.origem.detalhe, vFio((f) => (ok(f.origem) ? f.origem.detalhe ?? 'sintetico' : null))))
    if (ok(t.absorcao)) p.push(pistaCat('absorcao', t.absorcao.v === 'absorvivel' ? 'Sou absorvível.' : 'Sou inabsorvível.', t.absorcao.v, vFio((f) => (ok(f.absorcao) ? f.absorcao.v : null))))
    if (ok(t.estrutura) && t.estrutura.v !== 'ambos')
      p.push(pistaCat('estrutura', multi(t.estrutura.v) ? 'Sou multifilamentar.' : 'Sou monofilamentar.', multi(t.estrutura.v) ? 'multi' : 'mono',
        vFio((f) => (ok(f.estrutura) && f.estrutura.v !== 'ambos' ? (multi(f.estrutura.v) ? 'multi' : 'mono') : null))))
    if (ok(t.mecanismoAbsorcao))
      p.push(pistaCat('mecanismo', `Sou absorvido por ${VALOR[t.mecanismoAbsorcao.v as string]}.`, t.mecanismoAbsorcao.v as string,
        vFio((f) => (f.absorcao.v === 'inabsorvivel' ? 'nenhum' : ok(f.mecanismoAbsorcao) ? (f.mecanismoAbsorcao.v as string) : null))))
    const cap = nivel2(t.capilaridade?.v)
    if (ok(t.capilaridade) && cap && cap !== 'moderada')
      p.push(pistaCat('capilaridade', `Tenho capilaridade ${cap}.`, cap, vFio((f) => (ok(f.capilaridade) ? nivel2(f.capilaridade.v) : null))))
    const rea = nivel2(t.reacaoTecidual?.v)
    if (ok(t.reacaoTecidual) && rea && rea !== 'moderada')
      p.push(pistaCat('reacao', `Provoco reação tecidual ${rea}.`, rea, vFio((f) => (ok(f.reacaoTecidual) ? nivel2(f.reacaoTecidual.v) : null))))
    if (ok(t.composicao))
      p.push({ id: 'composicao', final: true, texto: `Sou composto de: ${t.composicao.v}.`, testa: (it) => (it.tipo === 'fio' ? it.id === t.id : false) })
    return p
  }
  // instrumentos
  if (ok(t.grupo)) p.push(pistaCat('grupo', `Sou um instrumento de ${GRUPO[t.grupo.v].toLowerCase()}.`, t.grupo.v, vIns((i) => (ok(i.grupo) ? i.grupo.v : null))))
  const cabo = (i: Instrumento) => (ok(i.cabo) ? (i.cabo.v === 'argolas_cremalheira' || i.cabo.v === 'argolas' ? 'argolas' : i.cabo.v === 'pinca_mola' ? 'mola' : 'outro') : null)
  const c = cabo(t)
  if (c === 'argolas') p.push(pistaCat('cabo', 'Tenho argolas para os dedos.', 'argolas', vIns(cabo)))
  if (c === 'mola') p.push(pistaCat('cabo', 'Não tenho argolas: meu cabo é de pinça, com mola.', 'mola', vIns(cabo)))
  if (t.afastadorTipo && ok(t.afastadorTipo))
    p.push(pistaCat('afastador', t.afastadorTipo.v === 'dinamico' ? 'Sou um afastador dinâmico: um auxiliar precisa me segurar.' : 'Sou um afastador autoestático: fico aberto sozinho.', t.afastadorTipo.v,
      vIns((i) => (i.afastadorTipo && ok(i.afastadorTipo) ? i.afastadorTipo.v : i.grupo.v === 'afastamento' ? null : 'nao-afastador'))))
  if (ok(t.dentes) && typeof t.dentes.v === 'boolean')
    p.push(pistaCat('dentes', t.dentes.v ? 'Minha ponta tem dentes.' : 'Minha ponta não tem dentes.', String(t.dentes.v), vIns((i) => (ok(i.dentes) && typeof i.dentes.v === 'boolean' ? String(i.dentes.v) : null))))
  const serr = (i: Instrumento) => (ok(i.serrilha) && i.serrilha.v !== 'na' ? (i.serrilha.v as string) : null)
  const textoSerr: Record<string, string> = { total: 'Minhas ranhuras ocupam toda a extensão da ponta.', dois_tercos: 'Minhas ranhuras vão só até 2/3 da mandíbula.', ausente: 'Minha ponta não tem ranhuras ao longo da mandíbula.', cruzada: 'Minha ponta tem ranhuras cruzadas.' }
  const s = serr(t)
  if (s) p.push(pistaCat('serrilha', textoSerr[s], s, vIns(serr)))
  if (ok(t.traumatico) && typeof t.traumatico.v === 'boolean')
    p.push(pistaCat('trauma', t.traumatico.v ? 'Sou traumático: lesiono o que seguro.' : 'Sou atraumático: seguro sem lesar.', String(t.traumatico.v), vIns((i) => (ok(i.traumatico) && typeof i.traumatico.v === 'boolean' ? String(i.traumatico.v) : null))))
  if (ok(t.versoes) && t.versoes.v.length === 2)
    p.push(pistaCat('versoes', 'Existo em versão reta e curva.', 'ambas', vIns((i) => (ok(i.versoes) && i.versoes.v.length ? (i.versoes.v.length === 2 ? 'ambas' : 'uma') : null))))
  // Funções do mesmo grupo se sobrepõem ('pinçar vasos' também vale para a Halsted): a pista de função
  // só elimina itens de OUTROS grupos; dentro do grupo, o dado é tratado como indecidível.
  if (ok(t.funcao)) {
    const g = t.grupo.v
    p.push({ id: 'funcao', texto: `Minha função: ${t.funcao.v.charAt(0).toLowerCase() + t.funcao.v.slice(1)}.`, testa: (it) => (it.id === t.id ? true : it.tipo !== 'instr' ? false : it.grupo.v === g ? null : false) })
  }
  // Formato Adson (corpo largo que afina bruscamente) × pinça de mola comum: separa anatômica/dente de rato das Adson
  const formato = (i: Instrumento) => (i.id.startsWith('adson') ? 'adson' : ['pinca-anatomica', 'dente-de-rato'].includes(i.id) ? 'comum' : i.cabo.v === 'pinca_mola' ? null : 'outro')
  const fm = formato(t)
  if (fm === 'adson') p.push(pistaCat('formato', 'Tenho o corpo largo que afina bruscamente numa ponta fina (formato Adson).', 'adson', vIns(formato)))
  if (fm === 'comum') p.push(pistaCat('formato', 'Sou uma pinça de mola comum, sem o corpo largo das Adson.', 'comum', vIns(formato)))
  if (t.reconhecimento)
    p.push({ id: 'reconhecimento', final: true, texto: `Como me reconhecer: ${t.reconhecimento}`, testa: (it) => (it.tipo === 'instr' ? it.id === t.id : false) })
  return p
}

const HIERARQUIA = ['origem', 'grupo', 'absorcao', 'afastador', 'cabo', 'estrutura', 'mecanismo', 'dentes', 'serrilha', 'capilaridade', 'reacao', 'trauma', 'origem-detalhe', 'versoes', 'formato', 'funcao']
const rank = (id: string) => { const k = HIERARQUIA.indexOf(id); return k < 0 ? 99 : k }

/** Candidato continua possível se nenhuma pista dada o contradiz (lacuna não elimina). */
export const compativel = (it: Item, dadas: Pista[]) => dadas.every((p) => p.testa(it) !== false)
/** Primeira pista dada que contradiz o candidato (para explicar a eliminação). */
export const motivo = (it: Item, dadas: Pista[]) => dadas.find((p) => p.testa(it) === false)

/**
 * Ordena as pistas: a cada passo, a pista verdadeira que elimina ALGUM candidato restante,
 * preferindo a que elimina menos (das mais amplas às mais específicas). As identificadoras ficam por último.
 * Retorna null se o alvo não puder ser distinguido de algum candidato.
 */
export function sequenciaDePistas(alvo: Item, candidatos: Item[]): Pista[] | null {
  const todas = pistasVerdadeiras(alvo)
  const usadas: Pista[] = []
  let restantes = candidatos.filter((c) => c.id !== alvo.id)
  while (restantes.length > 0) {
    const opcoes = todas
      .filter((p) => !usadas.includes(p) && !p.final)
      .map((p) => ({ p, elimina: restantes.filter((r) => p.testa(r) === false).length }))
      .filter((o) => o.elimina > 0)
      // ordem pedagógica: da classificação mais geral para a mais específica; empate → a que elimina menos
      .sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.elimina - b.elimina || Math.random() - 0.5)
    const escolhida = opcoes[0]?.p ?? todas.find((p) => p.final && !usadas.includes(p) && restantes.some((r) => p.testa(r) === false))
    if (!escolhida) return null
    usadas.push(escolhida)
    restantes = restantes.filter((r) => escolhida.testa(r) !== false)
  }
  // Uma pista ampla a mais no início, quando houver, para ensinar a classificar antes de discriminar
  const extra = todas.find((p) => !usadas.includes(p) && !p.final && ['origem', 'absorcao', 'grupo'].includes(p.id))
  const seq = extra ? [extra, ...usadas] : usadas
  return [...seq.filter((p) => !p.final).sort((a, b) => rank(a.id) - rank(b.id)), ...seq.filter((p) => p.final)]
}

/** Monta o conjunto de candidatos: os do bloco e, se forem poucos, outros já descobertos da mesma campanha. */
export function montarCandidatos(doBloco: Item[], descobertos: Set<string>, tipo: 'fio' | 'instr', alvo: Item, max = 6): Item[] {
  const base = doBloco.filter((i) => descobertos.has(i.id))
  const extras = itens.filter((i) => i.tipo === tipo && descobertos.has(i.id) && !base.includes(i)).sort(() => Math.random() - 0.5)
  let lista = [...base].sort(() => Math.random() - 0.5).slice(0, max)
  if (!lista.includes(alvo)) lista = [alvo, ...lista.slice(0, max - 1)]
  for (const e of extras) { if (lista.length >= Math.min(max, 5)) break; lista.push(e) }
  return lista.sort(() => Math.random() - 0.5)
}
