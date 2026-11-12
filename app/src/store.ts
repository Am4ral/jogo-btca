// Progresso do usuário, salvo no navegador (localStorage).
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { sinalizar } from './preferencias'

export type Modo = 'descobrir' | 'instrumentando' | 'memoria' | 'monte-ficha' | 'quem-sou-eu' | 'encontre-erro' | 'comparacao' | 'desafio' | 'revisao'
export type Registro = { t: number; modo: Modo; correto: boolean; detalhe: string; confundiuCom?: string; ficha?: boolean; score?: number }
/** caixa/proxima: revisão espaçada tipo Leitner (caixa 1–5; próxima revisão em ms). */
export type ProgressoItem = { descobertoEm?: number; acertos: number; erros: number; log: Registro[]; ultima?: number; caixa?: number; proxima?: number }

const DIA = 86_400_000
/** Intervalos da revisão espaçada, por caixa (em dias). */
export const INTERVALOS = [1, 2, 4, 8, 16]

/** Atualiza a caixa de Leitner: acerto na hora devida sobe uma caixa; erro volta para a caixa 1 e fica devido logo. */
function leitner(p: ProgressoItem, correto: boolean, agora: number): Pick<ProgressoItem, 'caixa' | 'proxima'> {
  const caixa = p.caixa ?? 0
  if (!correto) return { caixa: 1, proxima: agora + 10 * 60_000 }
  const devido = !p.proxima || agora >= p.proxima - DIA / 2
  if (!devido) return { caixa, proxima: p.proxima }
  const nova = Math.min(5, caixa + 1)
  return { caixa: nova, proxima: agora + INTERVALOS[nova - 1] * DIA }
}

type Estado = {
  itens: Record<string, ProgressoItem>
  etapas: Record<string, string[]> // blocoId → etapas concluídas
  termosVistos: string[]
  descobrir: (id: string) => void
  registrar: (id: string, r: Omit<Registro, 't'>) => void
  concluirEtapa: (bloco: string, etapa: string) => void
  verTermo: (id: string) => void
  importar: (json: string) => void
  zerar: () => void
}

const vazio = (): ProgressoItem => ({ acertos: 0, erros: 0, log: [] })

// Se o armazenamento falhar (modo privado, cota), o jogo continua funcionando em memória.
const storageSeguro = createJSONStorage(() => {
  try {
    const k = '__btca_teste__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) }
  }
})

export const useProgresso = create<Estado>()(
  persist(
    (set) => ({
      itens: {},
      etapas: {},
      termosVistos: [],
      descobrir: (id) =>
        set((s) => {
          const p = s.itens[id] ?? vazio()
          if (p.descobertoEm) return s
          return { itens: { ...s.itens, [id]: { ...p, descobertoEm: Date.now(), ultima: Date.now(), caixa: 0, proxima: Date.now() + DIA } } }
        }),
      registrar: (id, r) => {
        sinalizar(r.correto ? 'acerto' : 'erro')
        set((s) => {
          const p = s.itens[id] ?? vazio()
          const log = [...p.log, { ...r, t: Date.now() }].slice(-60)
          return {
            itens: {
              ...s.itens,
              [id]: {
                ...p, log, ultima: Date.now(), acertos: p.acertos + (r.correto ? 1 : 0), erros: p.erros + (r.correto ? 0 : 1),
                // as perguntas guiadas do Descobrir não contam para a revisão espaçada (a ficha estava aberta)
                ...(r.modo === 'descobrir' || !p.descobertoEm ? {} : leitner(p, r.correto, Date.now())),
              },
            },
          }
        })
      },
      concluirEtapa: (bloco, etapa) =>
        set((s) => {
          const atual = s.etapas[bloco] ?? []
          if (atual.includes(etapa)) return s
          sinalizar('conquista')
          return { etapas: { ...s.etapas, [bloco]: [...atual, etapa] } }
        }),
      verTermo: (id) => set((s) => (s.termosVistos.includes(id) ? s : { termosVistos: [...s.termosVistos, id] })),
      importar: (json) => {
        const d = JSON.parse(json)
        if (!d || typeof d !== 'object' || !d.itens) throw new Error('Arquivo não parece ser um progresso do BTCA.')
        set({ itens: d.itens, etapas: d.etapas ?? {}, termosVistos: d.termosVistos ?? [] })
      },
      zerar: () => set({ itens: {}, etapas: {}, termosVistos: [] }),
    }),
    { name: 'btca-progresso-v1', storage: storageSeguro, version: 1 },
  ),
)

export function exportarProgresso(): string {
  const { itens, etapas, termosVistos } = useProgresso.getState()
  return JSON.stringify({ app: 'btca', versao: 1, exportadoEm: new Date().toISOString(), itens, etapas, termosVistos }, null, 1)
}

// ---------- domínio ----------
export const NIVEIS = ['Não descoberto', 'Descoberto', 'Reconheço', 'Sei montar a ficha', 'Identifico pelas pistas', 'Domino'] as const

/**
 * Nível de domínio (0–5), sempre sequencial:
 * 1 Descoberto · 2 Reconheço (3 acertos de associação, sem 2 erros seguidos) ·
 * 3 Sei montar a ficha (≥ 90% em 2 fichas, em dias diferentes, e a última ≥ 70%).
 * 4 Identifico pelas pistas (2 acertos no Quem sou eu? com ≥ 70 pontos e o último palpite certo).
 * 5 Domino (acerto no Desafio final ou na revisão feito ≥ 3 dias depois de descobrir o item, sem erros recentes).
 */
export function nivel(p?: ProgressoItem): number {
  if (!p?.descobertoEm) return 0
  const rec = p.log.filter((r) => r.modo === 'instrumentando' || r.modo === 'memoria')
  const acertos = rec.filter((r) => r.correto).length
  const ultimos = rec.slice(-2)
  const doisErros = ultimos.length === 2 && ultimos.every((r) => !r.correto)
  if (!(acertos >= 3 && !doisErros)) return 1
  const fichas = p.log.filter((r) => r.ficha)
  const diasBons = new Set(fichas.filter((r) => (r.score ?? 0) >= 0.9).map((r) => new Date(r.t).toDateString()))
  const ultima = fichas[fichas.length - 1]
  if (!(diasBons.size >= 2 && (ultima?.score ?? 0) >= 0.7)) return 2
  // 4 Identifico pelas pistas: 2 acertos no 'Quem sou eu?' com boa pontuação e sem erro no último palpite
  const qse = p.log.filter((r) => r.modo === 'quem-sou-eu' && r.score !== undefined || (r.modo === 'quem-sou-eu' && r.confundiuCom))
  const bons = qse.filter((r) => r.correto && (r.score ?? 0) >= 0.7).length
  const ultimoQse = qse[qse.length - 1]
  if (!(bons >= 2 && ultimoQse?.correto)) return 3
  const tardio = p.log.some((r) => (r.modo === 'desafio' || r.modo === 'revisao') && r.correto && r.t - (p.descobertoEm ?? r.t) >= 3 * DIA)
  const semErros = p.log.filter((r) => r.modo !== 'descobrir').slice(-6).every((r) => r.correto)
  return tardio && semErros ? 5 : 4
}
/** Prioridade de revisão: erros recentes pesam mais. */
export function precisaRevisao(p?: ProgressoItem): boolean {
  if (!p?.descobertoEm) return false
  // as perguntas guiadas do Descobrir não contam: a ficha estava aberta e o objetivo era aprender
  const recentes = p.log.filter((r) => r.modo !== 'descobrir').slice(-6)
  return recentes.some((r) => !r.correto)
}

/** Item está na hora de revisar? (itens nunca agendados ficam devidos 1 dia depois de descobertos) */
export function devido(p?: ProgressoItem, agora = Date.now()): boolean {
  if (!p?.descobertoEm) return false
  return (p.proxima ?? p.descobertoEm + DIA) <= agora
}
/** Prioridade na fila de revisão: erros recentes pesam mais que o atraso. */
export function prioridade(p?: ProgressoItem, agora = Date.now()): number {
  if (!p?.descobertoEm) return -1
  const erros = p.log.filter((r) => r.modo !== 'descobrir').slice(-8).filter((r) => !r.correto).length
  const atraso = Math.max(0, (agora - (p.proxima ?? p.descobertoEm + DIA)) / DIA)
  return erros * 3 + atraso + (5 - (p.caixa ?? 0))
}

export const MODO_NOME: Record<Modo, string> = {
  descobrir: 'Descobrir (perguntas guiadas)', instrumentando: 'Instrumentando', memoria: 'Jogo da memória', 'monte-ficha': 'Monte a ficha',
  'quem-sou-eu': 'Quem sou eu?', 'encontre-erro': 'Encontre o erro', comparacao: 'Comparação', desafio: 'Desafio final', revisao: 'Revisão do dia',
}
