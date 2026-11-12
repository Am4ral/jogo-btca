// Geração dos pares do Jogo da memória.
// Regra central: num mesmo tabuleiro, o conteúdo de cada lado precisa ser ÚNICO;
// senão um par seria ambíguo (ex.: duas hemostáticas com a mesma função "pinçar vasos").
import { type Item, type Fio, type Instrumento, GRUPO, VALOR, fmtValor, confusoes, nomeCurto } from './content'

export type Lado = { texto?: string; img?: string; legenda?: string }
export type Par = { item: string; a: Lado; b: Lado; reforco: string }
export type TipoPar = 'foto-nome' | 'nome-funcao' | 'foto-reconhecimento' | 'nome-grupo' | 'marca-composicao' | 'nome-assinatura' | 'nome-indicacao'

export const TITULO_TIPO: Record<TipoPar, string> = {
  'foto-nome': 'Foto ↔ nome',
  'nome-funcao': 'Nome ↔ função',
  'foto-reconhecimento': 'Foto ↔ detalhe que a identifica',
  'nome-grupo': 'Instrumental ↔ grupo cirúrgico',
  'marca-composicao': 'Nome ↔ composição',
  'nome-assinatura': 'Fio ↔ características',
  'nome-indicacao': 'Fio ↔ indicação',
}

const ok = (a?: { s: string; v: unknown }) => !!a && a.s !== 'lacuna' && a.v !== null && a.v !== undefined
const MARCAS: Record<string, string> = { vicryl: 'Vicryl', dexon: 'Dexon', monocryl: 'Monocryl', pds: 'PDS', polipropileno: 'Prolene', poligliconato: 'Maxon' }

function reforco(it: Item): string {
  const base = it.tipo === 'instr' ? it.reconhecimento ?? '' : it.diferencial ?? ''
  const c = confusoes.find((x) => x.itens.length === 2 && x.itens.includes(it.id))
  return c ? `${base} ${c.chave}` : base
}

function assinatura(f: Fio): string | null {
  if (!ok(f.absorcao) || !ok(f.estrutura)) return null
  const partes = [fmtValor(f.absorcao), fmtValor(f.origem), VALOR[f.estrutura.v] ?? f.estrutura.v]
  if (f.absorcao.v === 'absorvivel' && ok(f.resistenciaTensil)) partes.push(String(f.resistenciaTensil.v))
  else if (f.absorcao.v === 'absorvivel' && ok(f.tempoAbsorcao)) partes.push(`absorção ${f.tempoAbsorcao.v}`)
  else if (ok(f.resistenciaTensil)) partes.push(String(f.resistenciaTensil.v))
  return partes.join(' · ')
}

export function ladosDoPar(it: Item, tipo: TipoPar): { a: Lado; b: Lado } | null {
  if (it.tipo === 'instr') {
    const i = it as Instrumento
    // pares com foto exigem foto BOA do instrumento inteiro: foto mediana não permite diferenciar com segurança (ex.: Crile × Kelly)
    const foto = i.imagens.find((im) => im.tipo === 'inteiro' && im.qualidade === 'boa')
    switch (tipo) {
      case 'foto-nome': return foto ? { a: { img: foto.src, legenda: 'foto' }, b: { texto: i.nome } } : null
      case 'nome-funcao': return ok(i.funcao) ? { a: { texto: i.nome }, b: { texto: i.funcao.v } } : null
      case 'foto-reconhecimento': return foto && i.reconhecimento ? { a: { img: foto.src, legenda: 'foto' }, b: { texto: i.reconhecimento } } : null
      case 'nome-grupo': return ok(i.grupo) ? { a: { texto: i.nome }, b: { texto: GRUPO[i.grupo.v] } } : null
      default: return null
    }
  }
  const f = it as Fio
  switch (tipo) {
    case 'marca-composicao': {
      if (!ok(f.composicao)) return null
      const marca = MARCAS[f.id]
      return marca ? { a: { texto: marca }, b: { texto: `${f.nome}: ${f.composicao.v}` } } : { a: { texto: f.nome }, b: { texto: f.composicao.v } }
    }
    case 'nome-assinatura': {
      const s = assinatura(f)
      return s ? { a: { texto: nomeCurto(f) }, b: { texto: s } } : null
    }
    case 'nome-indicacao': return ok(f.indicacoes) && f.indicacoes.v.length ? { a: { texto: nomeCurto(f) }, b: { texto: f.indicacoes.v.join(' · ') } } : null
    default: return null
  }
}

export const TIPOS_INSTR: TipoPar[] = ['foto-nome', 'nome-funcao', 'foto-reconhecimento', 'nome-grupo']
export const TIPOS_FIO: TipoPar[] = ['marca-composicao', 'nome-assinatura', 'nome-indicacao']
const chave = (l: Lado) => l.img ?? l.texto ?? ''

/**
 * Monta um tabuleiro de até `n` pares do tipo pedido, sem conteúdos repetidos.
 * `preferidos` (itens com erros recentes) entram primeiro.
 */
export function montarTabuleiro(candidatos: Item[], tipo: TipoPar, n: number, preferidos: string[] = []): Par[] {
  const ordem = [...candidatos].sort(() => Math.random() - 0.5).sort((x, y) => Number(preferidos.includes(y.id)) - Number(preferidos.includes(x.id)))
  const usadosA = new Set<string>(), usadosB = new Set<string>()
  // conteúdos repetidos entre candidatos são descartados por completo (nenhum dos dois entra)
  const contagem = new Map<string, number>()
  for (const it of candidatos) {
    const l = ladosDoPar(it, tipo)
    if (l) contagem.set('b:' + chave(l.b), (contagem.get('b:' + chave(l.b)) ?? 0) + 1)
  }
  const pares: Par[] = []
  for (const it of ordem) {
    if (pares.length >= n) break
    const l = ladosDoPar(it, tipo)
    if (!l) continue
    const ka = chave(l.a), kb = chave(l.b)
    if (usadosA.has(ka) || usadosB.has(kb)) continue
    if ((contagem.get('b:' + kb) ?? 0) > 1) continue
    usadosA.add(ka); usadosB.add(kb)
    pares.push({ item: it.id, ...l, reforco: reforco(it) })
  }
  return pares
}

/** Sequência de rodadas: poucas cartas no início, aumentando; cada rodada com um tipo de associação. */
export function planoDeRodadas(candidatos: Item[]): { tipo: TipoPar; n: number }[] {
  const tipos = candidatos.every((i) => i.tipo === 'fio') ? TIPOS_FIO : candidatos.every((i) => i.tipo === 'instr') ? TIPOS_INSTR : [...TIPOS_INSTR, ...TIPOS_FIO]
  const tamanhos = [3, 4, 6, 6]
  const plano: { tipo: TipoPar; n: number }[] = []
  let k = 0
  for (const tipo of tipos) {
    const possiveis = montarTabuleiro(candidatos, tipo, 99).length
    if (possiveis < 2) continue
    plano.push({ tipo, n: Math.min(tamanhos[Math.min(k, tamanhos.length - 1)], possiveis) })
    k++
  }
  return plano
}
