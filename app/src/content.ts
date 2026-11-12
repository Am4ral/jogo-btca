// Acesso tipado ao conteúdo de ../content (a fonte única de verdade).
import fiosJson from '../../content/fios.json'
import instrJson from '../../content/instrumentos.json'
import termosJson from '../../content/termos.json'
import confJson from '../../content/confusoes.json'
import blocosJson from '../../content/blocos.json'
import pedidosJson from '../../content/pedidos.json'
import aplicacoesJson from '../../content/aplicacoes.json'

export type Situacao = 'material' | 'externa' | 'divergente' | 'lacuna'
export type Attr<T = unknown> = { v: T; s: Situacao; f: string[]; nota?: string; detalhe?: string; extra?: string[]; aceitaTambem?: string[] }
export type Imagem = { src: string; tipo: string; qualidade: 'boa' | 'aceitavel' | 'insuficiente' | 'ilustrativa'; fonte: string; nota?: string; /** ponto (em % da foto) onde está o detalhe distintivo, usado nos recortes */ foco?: [number, number] }

type Base = {
  id: string
  nome: string
  bloco: string
  confundeCom: string[]
  imagens: Imagem[]
  diferencial?: string
  reconhecimento?: string
  alerta?: string
  alertaMaterial?: string
  alertaVisual?: string
  prioridadeProva: number
}
export type Fio = Base & {
  tipo: 'fio'
  comerciais: string[]
  origem: Attr<string>
  composicao: Attr<string>
  absorcao: Attr<string>
  mecanismoAbsorcao: Attr<string | null>
  tempoAbsorcao: Attr<string | null>
  resistenciaTensil: Attr<string | null>
  estrutura: Attr<string>
  reacaoTecidual: Attr<string | null>
  capilaridade: Attr<string | null>
  memoria: Attr<string | null>
  manuseio: Attr<string | null>
  segurancaNo: Attr<string | null>
  indicacoes: Attr<string[]>
  limitacoes: Attr<string[]>
}
export type Instrumento = Base & {
  tipo: 'instr'
  sinonimos: string[]
  grupo: Attr<Grupo>
  funcao: Attr<string>
  estrutura: Attr<string[]>
  ponta: Attr<string>
  dentes: Attr<boolean | null>
  serrilha: Attr<string | null>
  versoes: Attr<string[]>
  traumatico: Attr<boolean | null>
  cabo: Attr<string>
  usos: Attr<string[]>
  afastadorTipo?: Attr<string>
}
export type Item = Fio | Instrumento
export type Grupo = 'dierese' | 'hemostasia' | 'preensao' | 'sintese' | 'afastamento' | 'auxiliar'
export type Termo = { id: string; termo: string; definicao: string; consequencia: string; f: string[]; nota?: string }
export type Confusao = { id: string; itens: string[]; atributos: string[]; chave: string; imagemComparacao?: string | null; qualidadeComparacao?: string; notaComparacao?: string; alerta?: string }
export type Bloco = { id: string; titulo: string; tipo?: 'conceitos' | 'comparacao' | 'revisao'; itens?: string[] | string; termos?: string[]; confusoes?: string[]; nota?: string }
export type Campanha = { id: 'fios' | 'instrumentos'; titulo: string; blocos: Bloco[] }
export type Pedido = { texto: string; aceita: string[]; nivel: 'funcao' | 'caracteristica' | 'situacao' }

export const fios: Fio[] = (fiosJson.itens as unknown as Fio[]).map((f) => ({ ...f, tipo: 'fio' as const }))
export const instrumentos: Instrumento[] = (instrJson.itens as unknown as Instrumento[]).map((i) => ({ ...i, tipo: 'instr' as const }))
export const itens: Item[] = [...fios, ...instrumentos]
export const termos = termosJson.itens as Termo[]
export const confusoes = confJson.itens as Confusao[]
export const campanhas = blocosJson.campanhas as Campanha[]
export const rankingResistencia = fiosJson._rankingResistencia
export const pedidos = pedidosJson.pedidos as Pedido[]
export type Aplicacao = { texto: string; aceita: string[]; explicacao: string; f: string[] }
export const aplicacoes = aplicacoesJson.aplicacoes as Aplicacao[]

const porId = new Map(itens.map((i) => [i.id, i]))
export const item = (id: string) => porId.get(id)!
export const termo = (id: string) => termos.find((t) => t.id === id)
export const imgUrl = (src: string) => `./${src}`

export function itensDoBloco(b: Bloco): Item[] {
  if (Array.isArray(b.itens)) return b.itens.map(item)
  if (b.itens === 'todos-fios') return fios
  if (b.itens === 'todos-instrumentos') return instrumentos
  return []
}
export const blocoPorId = (id: string) => campanhas.flatMap((c) => c.blocos).find((b) => b.id === id)
export const campanhaDoBloco = (id: string) => campanhas.find((c) => c.blocos.some((b) => b.id === id))!

/** Foto principal: a melhor imagem do item inteiro (ou da embalagem, para fios). */
export function fotoPrincipal(it: Item): Imagem | undefined {
  const ordem = { boa: 0, aceitavel: 1, ilustrativa: 2, insuficiente: 3 }
  return [...it.imagens].sort((a, b) => {
    const t = (x: Imagem) => (x.tipo === 'inteiro' || x.tipo === 'embalagem' ? 0 : 1)
    return t(a) - t(b) || ordem[a.qualidade] - ordem[b.qualidade]
  })[0]
}
/** Item pode ser exigido por reconhecimento visual? */
export const temFotoUtil = (it: Item) => it.imagens.some((im) => im.tipo === 'inteiro' && (im.qualidade === 'boa' || im.qualidade === 'aceitavel'))

// ---------- rótulos ----------
export const GRUPO: Record<Grupo, string> = {
  dierese: 'Diérese', hemostasia: 'Hemostasia', preensao: 'Preensão', sintese: 'Síntese', afastamento: 'Afastamento', auxiliar: 'Auxiliar',
}
export const ROTULO: Record<string, string> = {
  origem: 'Origem', composicao: 'Composição', absorcao: 'Absorção', mecanismoAbsorcao: 'Mecanismo de absorção',
  tempoAbsorcao: 'Tempo de absorção', resistenciaTensil: 'Resistência tênsil', estrutura: 'Estrutura',
  reacaoTecidual: 'Reação tecidual', capilaridade: 'Capilaridade', memoria: 'Memória', manuseio: 'Manuseio',
  segurancaNo: 'Segurança do nó', indicacoes: 'Indicações', limitacoes: 'Limitações',
  grupo: 'Grupo cirúrgico', funcao: 'Função', ponta: 'Ponta / mandíbula', dentes: 'Dentes', serrilha: 'Serrilha',
  versoes: 'Versões', traumatico: 'Traumático?', cabo: 'Cabo', usos: 'Principais usos', afastadorTipo: 'Tipo de afastador',
}
/** Rótulo → termo explicável */
export const TERMO_DO_CAMPO: Record<string, string> = {
  absorcao: 'absorvivel', capilaridade: 'capilaridade', memoria: 'memoria', resistenciaTensil: 'forca-tensil',
  reacaoTecidual: 'reacao-tecidual', segurancaNo: 'seguranca-no', serrilha: 'serrilha', traumatico: 'traumatico',
  estrutura: 'multifilamentar', mecanismoAbsorcao: 'hidrolise', afastadorTipo: 'afastador-dinamico', tempoAbsorcao: 'meia-vida',
}
export const VALOR: Record<string, string> = {
  natural: 'natural', sintetico: 'sintético', absorvivel: 'absorvível', inabsorvivel: 'inabsorvível',
  mono: 'monofilamentar', multi_trancado: 'multifilamentar trançado', multi_torcido: 'multifilamentar torcido', ambos: 'mono ou multifilamentar',
  hidrolise: 'hidrólise', proteolise_fagocitose: 'proteólise / fagocitose',
  muito_baixa: 'muito baixa', baixa: 'baixa', moderada: 'moderada', alta: 'alta', muito_alta: 'muito alta',
  dierese: 'diérese', hemostasia: 'hemostasia', preensao: 'preensão', sintese: 'síntese', afastamento: 'afastamento', auxiliar: 'auxiliar',
  total: 'em toda a extensão', dois_tercos: 'até 2/3 da mandíbula', ausente: 'ausente', cruzada: 'ranhuras cruzadas', na: 'não se aplica',
  argolas_cremalheira: 'argolas + cremalheira', argolas: 'argolas', pinca_mola: 'de pinça (mola)', reto: 'reto', manual: 'segurado à mão',
  cremalheira_manivela: 'barra dentada + manivela', outro: 'outro', dinamico: 'dinâmico', autoestatico: 'autoestático',
  reta: 'reta', curva: 'curva',
}
export function fmtValor(a: Attr | undefined): string {
  if (!a || a.v === null || a.v === undefined || a.s === 'lacuna') return 'não consta no material'
  const v = a.v
  if (v === true) return 'sim'
  if (v === false) return 'não'
  if (Array.isArray(v)) return v.length ? v.map((x) => VALOR[x as string] ?? x).join(' · ') : '—'
  let s = VALOR[v as string] ?? String(v)
  if (a.detalhe) s += ` (${a.detalhe})`
  return s
}
export const nomeCurto = (it: Item) => (it.tipo === 'fio' && it.comerciais[0] && it.comerciais[0] !== it.nome ? `${it.nome} (${it.comerciais[0]})` : it.nome)
export const isAttr = (v: unknown): v is Attr => !!v && typeof v === 'object' && !Array.isArray(v) && 's' in (v as object)
