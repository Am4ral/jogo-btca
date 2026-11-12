// Preferências do usuário (som, tema) e efeitos sonoros sintetizados (sem arquivos de áudio).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'auto' | 'claro' | 'escuro'
type Prefs = { som: boolean; tema: Tema; boasVindasVistas: boolean; set: (p: Partial<Omit<Prefs, 'set'>>) => void }

export const usePrefs = create<Prefs>()(
  persist((set) => ({ som: true, tema: 'auto', boasVindasVistas: false, set: (p) => set(p) }), { name: 'btca-prefs-v1' }),
)

export function aplicarTema(t: Tema) {
  const r = document.documentElement
  if (t === 'auto') r.removeAttribute('data-theme')
  else r.setAttribute('data-theme', t === 'claro' ? 'light' : 'dark')
}

// ---------- sons ----------
let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}
/** Notas curtas e baixas: feedback discreto, nunca música. */
function tocar(notas: { f: number; t: number; d: number; tipo?: OscillatorType }[], volume = 0.06) {
  if (!usePrefs.getState().som) return
  const a = audio()
  if (!a) return
  const agora = a.currentTime
  for (const n of notas) {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = n.tipo ?? 'sine'
    o.frequency.value = n.f
    g.gain.setValueAtTime(0, agora + n.t)
    g.gain.linearRampToValueAtTime(volume, agora + n.t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, agora + n.t + n.d)
    o.connect(g).connect(a.destination)
    o.start(agora + n.t)
    o.stop(agora + n.t + n.d + 0.02)
  }
}
export const som = {
  acerto: () => tocar([{ f: 660, t: 0, d: 0.12 }, { f: 880, t: 0.08, d: 0.18 }]),
  erro: () => tocar([{ f: 220, t: 0, d: 0.22, tipo: 'triangle' }], 0.05),
  virar: () => tocar([{ f: 520, t: 0, d: 0.05, tipo: 'triangle' }], 0.03),
  conquista: () => tocar([{ f: 523, t: 0, d: 0.15 }, { f: 659, t: 0.12, d: 0.15 }, { f: 784, t: 0.24, d: 0.3 }]),
  metal: () => tocar([{ f: 1760, t: 0, d: 0.08, tipo: 'triangle' }, { f: 2637, t: 0.01, d: 0.12 }], 0.025),
}

// Um registro de resposta pode gerar várias entradas no mesmo instante (ex.: ficha com vários atributos):
// agrupa tudo num único som — erro tem prioridade sobre acerto.
let pendente: 'acerto' | 'erro' | 'conquista' | null = null
export function sinalizar(tipo: 'acerto' | 'erro' | 'conquista') {
  const peso = { acerto: 1, conquista: 2, erro: 3 }
  if (!pendente || peso[tipo] > peso[pendente]) pendente = tipo
  setTimeout(() => {
    if (!pendente) return
    const t = pendente
    pendente = null
    som[t]()
  }, 0)
}
