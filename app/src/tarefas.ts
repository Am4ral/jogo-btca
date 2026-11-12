// Tarefas mistas do Desafio final e da Revisão do dia.
// Cada tarefa usa só itens já apresentados no Descobrir e reaproveita os geradores dos outros modos.
import { type Item, type Instrumento, confusoes, pedidos, aplicacoes, nomeCurto, item as getItem } from './content'
import { gruposDaFicha, type GrupoEtiquetas } from './fichaGen'
import { sequenciaDePistas, montarCandidatos } from './whoami'
import { gerarPergunta } from './comparar'
import { adulterar, explicacoes } from './encontreErro'
import type { Modo, ProgressoItem } from './store'

export type Formato = 'foto' | 'associacao' | 'ficha' | 'qse' | 'erro' | 'diferenciar' | 'aplicacao'
export const NOME_FORMATO: Record<Formato, string> = {
  foto: 'Identifique a fotografia', associacao: 'Associe', ficha: 'Monte a ficha', qse: 'Quem sou eu?',
  erro: 'Encontre o erro', diferenciar: 'Diferencie os semelhantes', aplicacao: 'Aplique numa situação',
}
export type Opcao = { id: string; rotulo: string }
export type Tarefa =
  | { tipo: 'escolha'; formato: Formato; alvo: string; enunciado: string; destaque?: string; pistas?: string[]; img?: string; opcoes: Opcao[]; corretas: string[]; explicacao: string }
  | { tipo: 'ficha'; formato: 'ficha'; alvo: string; enunciado: string; img?: string; grupos: GrupoEtiquetas[]; explicacao: string }

const embaralhar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5)
const fotoBoa = (it: Item) => it.imagens.find((im) => im.tipo === 'inteiro' && im.qualidade === 'boa')
const traco = (it: Item) => (it.tipo === 'instr' ? it.reconhecimento ?? '' : it.diferencial ?? '')

/** Distratores: primeiro os parecidos com o alvo, depois o resto do conjunto. Só itens descobertos. */
function distratores(alvo: Item, pool: Item[], excluir: string[], n: number, filtro: (i: Item) => boolean = () => true): Item[] {
  const parecidos = pool.filter((i) => alvo.confundeCom.includes(i.id) || i.confundeCom.includes(alvo.id))
  const resto = embaralhar(pool.filter((i) => !parecidos.includes(i)))
  return [...embaralhar(parecidos), ...resto].filter((i) => i.id !== alvo.id && !excluir.includes(i.id) && i.tipo === alvo.tipo && filtro(i)).slice(0, n)
}

export function gerarTarefa(it: Item, formato: Formato, pool: Item[]): Tarefa | null {
  const descobertos = new Set(pool.map((i) => i.id))
  switch (formato) {
    case 'foto': {
      const f = fotoBoa(it)
      if (!f || it.tipo !== 'instr') return null
      // opções só de itens cuja foto também é boa: não se exige diferenciar de quem não tem imagem confiável
      const ds = distratores(it, pool, [], 3, (i) => !!fotoBoa(i))
      if (ds.length < 2) return null
      return {
        tipo: 'escolha', formato, alvo: it.id, enunciado: 'Que instrumento é este?', img: f.src,
        opcoes: embaralhar([it, ...ds]).map((i) => ({ id: i.id, rotulo: i.nome })), corretas: [it.id], explicacao: `${it.nome}: ${traco(it)}`,
      }
    }
    case 'associacao': {
      const g = embaralhar(gruposDaFicha(it, pool).filter((x) => !x.multi && x.campo !== 'reconhecimento'))[0]
      if (!g) return null
      return {
        tipo: 'escolha', formato, alvo: it.id, enunciado: `${nomeCurto(it)} — ${g.titulo.toLowerCase()}:`,
        opcoes: g.opcoes.map((o) => ({ id: o.id, rotulo: o.rotulo })), corretas: g.corretas, explicacao: g.explicacao + (g.nota ? ` (${g.nota})` : ''),
      }
    }
    case 'ficha': {
      const gs = embaralhar(gruposDaFicha(it, pool).filter((x) => !x.multi)).slice(0, 3)
      if (gs.length < 2) return null
      return { tipo: 'ficha', formato, alvo: it.id, enunciado: `Monte a ficha de ${nomeCurto(it)}`, img: it.tipo === 'instr' ? fotoBoa(it)?.src : undefined, grupos: gs, explicacao: traco(it) }
    }
    case 'qse': {
      const cands = montarCandidatos(pool.filter((i) => i.tipo === it.tipo), descobertos, it.tipo, it, 5)
      const seq = sequenciaDePistas(it, cands)
      if (!seq || cands.length < 3) return null
      return {
        tipo: 'escolha', formato, alvo: it.id, enunciado: 'Todas as pistas foram dadas. Quem sou eu?', pistas: seq.map((p) => p.texto),
        opcoes: cands.map((c) => ({ id: c.id, rotulo: nomeCurto(c) })), corretas: [it.id], explicacao: `As pistas só deixam ${it.nome}. ${traco(it)}`,
      }
    }
    case 'erro': {
      const ts = adulterar(it, 'facil')
      const errado = ts.find((t) => t.mostrado !== t.verdadeiro)
      if (!errado || ts.length < 3) return null
      const ex = explicacoes(it)
      return {
        tipo: 'escolha', formato, alvo: it.id, enunciado: `Um destes trechos da ficha de ${nomeCurto(it)} está errado. Qual?`,
        opcoes: ts.map((t) => ({ id: t.campo, rotulo: t.rotulo(t.mostrado) })), corretas: [errado.campo],
        explicacao: `O certo é "${errado.rotulo(errado.verdadeiro)}". ${ex[errado.campo] ?? ''}`,
      }
    }
    case 'diferenciar': {
      const cs = embaralhar(confusoes.filter((c) => c.itens.includes(it.id) && c.itens.every((x) => descobertos.has(x))))
      for (const c of cs) {
        const p = gerarPergunta(c)
        if (!p) continue
        return {
          tipo: 'escolha', formato, alvo: p.certo, enunciado: `${c.itens.map((x) => getItem(x).nome).join(' × ')}: ${p.texto.toLowerCase()}`, destaque: p.caracteristica,
          opcoes: p.opcoes.map((id) => ({ id, rotulo: nomeCurto(getItem(id)) })), corretas: [p.certo], explicacao: c.chave,
        }
      }
      return null
    }
    case 'aplicacao': {
      if (it.tipo === 'instr') {
        const ps = embaralhar(pedidos.filter((p) => (p.nivel === 'situacao' || p.nivel === 'funcao') && p.aceita.includes(it.id)))
        for (const p of ps) {
          const aceita = p.aceita.filter((a) => descobertos.has(a))
          const ds = distratores(it, pool, p.aceita, 3)
          if (ds.length < 2) continue
          return {
            tipo: 'escolha', formato, alvo: it.id, enunciado: 'O cirurgião pede:', destaque: p.texto,
            opcoes: embaralhar([...aceita.map(getItem), ...ds]).map((i) => ({ id: i.id, rotulo: i.nome })), corretas: aceita,
            explicacao: `${aceita.map((a) => getItem(a).nome).join(' ou ')}: ${traco(it as Instrumento)}`,
          }
        }
        return null
      }
      const as = embaralhar(aplicacoes.filter((a) => a.aceita.includes(it.id)))
      for (const a of as) {
        const aceita = a.aceita.filter((x) => descobertos.has(x))
        const ds = distratores(it, pool, a.aceita, 3)
        if (ds.length < 2) continue
        return {
          tipo: 'escolha', formato, alvo: it.id, enunciado: 'Qual fio você escolhe?', destaque: a.texto,
          opcoes: embaralhar([...aceita.map(getItem), ...ds]).map((i) => ({ id: i.id, rotulo: nomeCurto(i) })), corretas: aceita, explicacao: `${a.explicacao} (fonte: ${a.f.join(', ')})`,
        }
      }
      return null
    }
  }
}

/** Formatos a evitar para um item: o do último erro (o item volta "em outro formato"). */
export function formatosEvitar(p?: ProgressoItem): Formato[] {
  const ultimoErro = [...(p?.log ?? [])].reverse().find((r) => !r.correto && r.modo !== 'descobrir')
  const mapa: Partial<Record<Modo, Formato[]>> = {
    memoria: ['foto', 'associacao'], instrumentando: ['foto', 'aplicacao'], 'monte-ficha': ['ficha', 'associacao'],
    'quem-sou-eu': ['qse'], 'encontre-erro': ['erro'], comparacao: ['diferenciar'],
  }
  return ultimoErro ? mapa[ultimoErro.modo] ?? [] : []
}

/** Tenta os formatos em ordem até um funcionar para o item. */
export function tarefaPara(it: Item, preferidos: Formato[], pool: Item[], evitar: Formato[] = []): Tarefa | null {
  const todos: Formato[] = ['foto', 'associacao', 'ficha', 'qse', 'erro', 'diferenciar', 'aplicacao']
  const ordem = [...preferidos.filter((f) => !evitar.includes(f)), ...embaralhar(todos.filter((f) => !preferidos.includes(f) && !evitar.includes(f))), ...evitar]
  for (const f of ordem) {
    const t = gerarTarefa(it, f, pool)
    if (t) return t
  }
  return null
}

/** Desafio final do bloco: um formato de cada tipo, distribuídos entre os itens do bloco. */
export function montarDesafio(doBloco: Item[], pool: Item[], prioritarios: string[]): Tarefa[] {
  const plano: Formato[] = ['foto', 'associacao', 'ficha', 'qse', 'erro', 'diferenciar', 'aplicacao', 'aplicacao', 'associacao', 'foto']
  const alvos = [...embaralhar(doBloco)].sort((a, b) => Number(prioritarios.includes(b.id)) - Number(prioritarios.includes(a.id)))
  const tarefas: Tarefa[] = []
  plano.forEach((f, k) => {
    // tenta o formato planejado em itens diferentes antes de cair para outro formato
    for (let j = 0; j < alvos.length; j++) {
      const it = alvos[(k + j) % alvos.length]
      const t = gerarTarefa(it, f, pool)
      if (t) { tarefas.push(t); return }
    }
    const t = tarefaPara(alvos[k % alvos.length], [], pool)
    if (t) tarefas.push(t)
  })
  return tarefas
}
