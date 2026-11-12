// Álbum de descobertas: cartas, filtros e a carta completa de cada item.
import { useState } from 'react'
import { itens, item as getItem, confusoes, nomeCurto, type Item, type Grupo, GRUPO } from './content'
import { useProgresso, nivel, precisaRevisao, NIVEIS, MODO_NOME } from './store'
import { Carta, Ficha } from './ui'
import { href } from './router'
import { ComparacaoLista, NaoEncontrado } from './telas'

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`
type Filtro = { id: string; rot: string; f: (i: Item, n: number, rev: boolean) => boolean }
const g = (x: Grupo) => (i: Item) => i.tipo === 'instr' && i.grupo.v === x
const FILTROS: Filtro[] = [
  { id: 'todos', rot: 'Todos', f: () => true },
  { id: 'fios', rot: 'Fios', f: (i) => i.tipo === 'fio' },
  { id: 'instr', rot: 'Instrumentais', f: (i) => i.tipo === 'instr' },
  { id: 'abs', rot: 'Absorvíveis', f: (i) => i.tipo === 'fio' && i.absorcao.v === 'absorvivel' },
  { id: 'inabs', rot: 'Inabsorvíveis', f: (i) => i.tipo === 'fio' && i.absorcao.v === 'inabsorvivel' },
  { id: 'nat', rot: 'Naturais', f: (i) => i.tipo === 'fio' && i.origem.v === 'natural' },
  { id: 'sint', rot: 'Sintéticos', f: (i) => i.tipo === 'fio' && i.origem.v === 'sintetico' },
  ...(Object.keys(GRUPO) as Grupo[]).map((x) => ({ id: x, rot: GRUPO[x], f: g(x) })),
  { id: 'dominados', rot: 'Dominados', f: (_i, n) => n >= 5 },
  { id: 'revisar', rot: 'Precisam de revisão', f: (_i, _n, rev) => rev },
]

export function Album() {
  const prog = useProgresso((s) => s.itens)
  const [filtro, setFiltro] = useState(() => {
    try { return sessionStorage.getItem('btca-filtro') ?? 'todos' } catch { return 'todos' }
  })
  const escolher = (id: string) => { setFiltro(id); try { sessionStorage.setItem('btca-filtro', id) } catch { /* sem armazenamento */ } }
  const f = FILTROS.find((x) => x.id === filtro) ?? FILTROS[0]
  const lista = itens.filter((i) => f.f(i, nivel(prog[i.id]), precisaRevisao(prog[i.id])))
  const desc = itens.filter((i) => prog[i.id]?.descobertoEm).length
  return (
    <div className="tela">
      <h1>Álbum de descobertas</h1>
      <p className="sub">{desc} de {itens.length} cartas descobertas. As cartas bloqueadas abrem quando você estuda o item na fase Descobrir.</p>
      <div className="filtros" role="toolbar" aria-label="Filtros">
        {FILTROS.map((x) => (
          <button key={x.id} className={`filtro ${x.id === f.id ? 'ativo' : ''}`} onClick={() => escolher(x.id)} aria-pressed={x.id === f.id}>{x.rot}</button>
        ))}
      </div>
      {lista.length === 0 ? <p className="vazio">Nenhuma carta neste filtro ainda.</p> : <div className="grade-cartas">{lista.map((i) => <Carta key={i.id} it={i} />)}</div>}
    </div>
  )
}

export function CartaCompleta({ id }: { id: string }) {
  const it = itens.find((i) => i.id === id)
  const p = useProgresso((s) => s.itens[id])
  if (!it) return <NaoEncontrado />
  const n = nivel(p)
  if (n === 0)
    return (
      <div className="tela estreita">
        <a className="voltar" href={href('album')}>← Álbum</a>
        <div className="painel bloqueio">
          <div className="carta-voa">🔒</div>
          <h2>Carta ainda não descoberta</h2>
          <p>Estude este item na fase Descobrir do bloco dele para abrir a carta.</p>
          <a className="btn primario" href={href(`bloco/${it.bloco}/descobrir`)}>Ir para o Descobrir</a>
        </div>
      </div>
    )
  const erros = (p?.log ?? []).filter((r) => !r.correto).reverse()
  const pares = confusoes.filter((c) => c.itens.includes(id)).map((c) => c.id)
  return (
    <div className="tela estreita">
      <a className="voltar" href={href('album')}>← Álbum</a>
      <div className="painel">
        <div className="dominio">
          <div className="dominio-nivel">
            {[1, 2, 3, 4, 5].map((k) => <span key={k} className={k <= n ? 'on' : ''} title={NIVEIS[k]} />)}
          </div>
          <span><b>{NIVEIS[n]}</b> · {plural(p?.acertos ?? 0, 'acerto')} · {plural(p?.erros ?? 0, 'erro')}{p?.ultima ? ` · última revisão ${new Date(p.ultima).toLocaleDateString('pt-BR')}` : ''}</span>
        </div>
        <div className="acoes">
          <a className="btn" href={href(`bloco/${it.bloco}/descobrir`)}>Revisar este item</a>
          {it.tipo === 'instr' && <a className="btn" href={href(`mesa?bloco=${it.bloco}&foco=${it.id}`)}>Instrumentar com ele</a>}
          {erros.length > 0 && <a className="btn" href="#meus-erros" onClick={(e) => { e.preventDefault(); document.getElementById('meus-erros')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver meus erros</a>}
        </div>
        <Ficha it={it} />
      </div>
      {pares.length > 0 && (
        <section>
          <h2>Comparar com semelhantes</h2>
          <ComparacaoLista ids={pares} />
        </section>
      )}
      <section className="painel" id="meus-erros">
        <h2>Meus erros com {nomeCurto(it)}</h2>
        {erros.length === 0 ? <p className="sub">Nenhum erro registrado.</p> : (
          <ul className="erros">
            {erros.map((r, k) => (
              <li key={`${r.t}-${k}`}>
                <span className="sub">{new Date(r.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {MODO_NOME[r.modo] ?? r.modo}</span>
                <p>{r.detalhe}{r.confundiuCom ? ` (confundiu com ${getItem(r.confundiuCom)?.nome})` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
