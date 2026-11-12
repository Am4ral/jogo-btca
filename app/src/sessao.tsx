// Sessão de tarefas mistas: Desafio final do bloco e Revisão do dia.
// Um erro faz o item voltar 3 tarefas depois, em OUTRO formato.
import { useMemo, useState } from 'react'
import { blocoPorId, campanhaDoBloco, itensDoBloco, itens, imgUrl, item as getItem, nomeCurto, type Item } from './content'
import { corrigir } from './fichaGen'
import { montarDesafio, tarefaPara, formatosEvitar, NOME_FORMATO, type Tarefa, type Formato } from './tarefas'
import { useProgresso, precisaRevisao, devido, prioridade, NIVEIS, nivel } from './store'
import { Barra, Termo } from './ui'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

type Resultado = { tarefa: Tarefa; certo: boolean }

function Sessao({ inicial, pool, modo, titulo, voltar, fim }: { inicial: Tarefa[]; pool: Item[]; modo: 'desafio' | 'revisao'; titulo: string; voltar: string; fim: (r: Resultado[]) => void }) {
  const registrar = useProgresso((s) => s.registrar)
  const [fila, setFila] = useState<Tarefa[]>(inicial)
  const [k, setK] = useState(0)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [resp, setResp] = useState<string[] | null>(null)
  const [marc, setMarc] = useState<Record<string, string[]>>({})
  const t = fila[k]

  const responder = (certo: boolean, detalhe: string) => {
    registrar(t.alvo, { modo, correto: certo, detalhe: `${NOME_FORMATO[t.formato]}: ${detalhe}` })
    setResultados((r) => [...r, { tarefa: t, certo }])
    // reinserção: o item volta 3 tarefas depois, em outro formato
    if (!certo && !fila.slice(k + 1).some((x) => x.alvo === t.alvo)) {
      const nova = tarefaPara(getItem(t.alvo), [], pool, [t.formato])
      if (nova && nova.formato !== t.formato) setFila((f) => [...f.slice(0, k + 4), nova, ...f.slice(k + 4)])
    }
  }
  const proxima = () => {
    setResp(null); setMarc({})
    if (k + 1 >= fila.length) fim([...resultados])
    else { setK(k + 1); window.scrollTo(0, 0) }
  }

  if (!t) return null
  const respondida = resp !== null
  let certoAtual = false
  if (respondida) certoAtual = t.tipo === 'escolha' ? resp!.length === 1 && t.corretas.includes(resp![0]) : t.grupos.every((g) => corrigir(g, marc[g.campo] ?? []))

  return (
    <div className="tela estreita">
      <a className="voltar" href={href(voltar)}>← Voltar</a>
      <div className="progresso-fase"><span>{titulo}</span><span>Tarefa {k + 1} de {fila.length}</span></div>
      <Barra valor={k} total={fila.length} />
      <section className="painel tarefa">
        <p className="formato">{NOME_FORMATO[t.formato]}</p>
        <h2>{t.enunciado}</h2>
        {t.img && <div className="tarefa-img"><img src={imgUrl(t.img)} alt="Instrumento" /></div>}
        {t.tipo === 'escolha' && t.destaque && <p className="caracteristica">“{t.destaque}”</p>}
        {t.tipo === 'escolha' && t.pistas && <ol className="pistas">{t.pistas.map((p) => <li key={p}>{p}</li>)}</ol>}

        {t.tipo === 'escolha' && (
          <div className="opcoes">
            {t.opcoes.map((o) => {
              const estado = respondida ? (t.corretas.includes(o.id) ? 'certa' : resp!.includes(o.id) ? 'errada' : 'neutra') : ''
              return (
                <button key={o.id} className={`opcao ${estado}`} disabled={respondida} onClick={() => {
                  setResp([o.id])
                  const ok = t.corretas.includes(o.id)
                  responder(ok, ok ? `acertou ${getItem(t.alvo).nome}` : `respondeu "${o.rotulo}" (certo: ${t.opcoes.filter((x) => t.corretas.includes(x.id)).map((x) => x.rotulo).join(' ou ')})`)
                }}>{o.rotulo}</button>
              )
            })}
          </div>
        )}

        {t.tipo === 'ficha' && (
          <>
            {t.grupos.map((g) => {
              const m = marc[g.campo] ?? []
              const ok = corrigir(g, m)
              return (
                <fieldset key={g.campo} className={`etiquetas ${respondida ? (ok ? 'certo' : 'errado') : ''}`}>
                  <legend>{g.termo ? <Termo id={g.termo}>{g.titulo}</Termo> : g.titulo}</legend>
                  <div className="etiquetas-opcoes">
                    {g.opcoes.map((o) => {
                      const sel = m.includes(o.id)
                      const estado = respondida ? (g.corretas.includes(o.id) ? (sel ? 'ok' : 'ok-nao-marcada') : sel ? 'errada' : '') : sel ? 'sel' : ''
                      return <button key={o.id} className={`etiqueta ${estado} ${o.rotulo.length > 40 ? 'longa' : ''}`} disabled={respondida} onClick={() => setMarc((m) => ({ ...m, [g.campo]: [o.id] }))}>{o.rotulo}</button>
                    })}
                  </div>
                  {respondida && <div className={`explicacao ${ok ? 'ok' : 'nao'}`}>{g.explicacao}</div>}
                </fieldset>
              )
            })}
            {!respondida && (
              <div className="acoes">
                <button className="btn primario" disabled={!t.grupos.every((g) => (marc[g.campo] ?? []).length)} onClick={() => {
                  setResp(['ficha'])
                  const erradas = t.grupos.filter((g) => !corrigir(g, marc[g.campo] ?? []))
                  responder(erradas.length === 0, erradas.length ? `errou ${erradas.map((g) => g.titulo.toLowerCase()).join(', ')}` : 'ficha completa')
                }}>Conferir</button>
              </div>
            )}
          </>
        )}

        {respondida && (
          <>
            {t.tipo === 'escolha' && <div className={`explicacao ${certoAtual ? 'ok' : 'nao'}`}><b>{certoAtual ? 'Certo.' : 'Não é isso.'}</b> {t.explicacao}</div>}
            {!certoAtual && <p className="sub">Este item volta daqui a pouco, em outro formato.</p>}
            <div className="acoes"><button className="btn primario" onClick={proxima} autoFocus>{k + 1 < fila.length ? 'Próxima tarefa' : 'Ver resultado'}</button></div>
          </>
        )}
      </section>
    </div>
  )
}

function Resumo({ resultados, titulo, children }: { resultados: Resultado[]; titulo: string; children: React.ReactNode }) {
  const prog = useProgresso((s) => s.itens)
  const certos = resultados.filter((r) => r.certo).length
  const porItem = [...new Set(resultados.map((r) => r.tarefa.alvo))].map(getItem)
  return (
    <div className="tela estreita">
      <section className="painel conquista">
        <div className="carta-voa">🏁</div>
        <h2>{titulo}: {certos} de {resultados.length}</h2>
        <div className="lista-chips" style={{ justifyContent: 'center' }}>
          {porItem.map((it) => <a key={it.id} className={`chip-link ${precisaRevisao(prog[it.id]) ? 'apagado' : ''}`} href={href(`album/${it.id}`)}>{nomeCurto(it)} · {NIVEIS[nivel(prog[it.id])]}</a>)}
        </div>
        {resultados.some((r) => !r.certo) && (
          <ul className="erros">
            {resultados.filter((r) => !r.certo).map((r, n) => <li key={n}><b>{NOME_FORMATO[r.tarefa.formato]}</b> — {getItem(r.tarefa.alvo).nome}<p>{r.tarefa.explicacao}</p></li>)}
          </ul>
        )}
        <div className="acoes">{children}</div>
      </section>
    </div>
  )
}

/** Desafio final do bloco. */
export function DesafioFinal({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const prog = useProgresso((s) => s.itens)
  const concluir = useProgresso((s) => s.concluirEtapa)
  const [res, setRes] = useState<Resultado[] | null>(null)
  const [rodada, setRodada] = useState(0)
  const { tarefas, pool } = useMemo(() => {
    if (!b) return { tarefas: [], pool: [] }
    const desc = (i: Item) => !!prog[i.id]?.descobertoEm
    const doBloco = itensDoBloco(b).filter(desc)
    const tipo = doBloco[0]?.tipo
    // pool: itens já descobertos do mesmo tipo (distratores e candidatos vêm só do que já foi apresentado)
    const pool = itens.filter((i) => i.tipo === tipo && desc(i))
    return { tarefas: montarDesafio(doBloco, pool, doBloco.filter((i) => precisaRevisao(prog[i.id])).map((i) => i.id)), pool }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, rodada])
  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  if (!tarefas.length) return <div className="tela estreita"><a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a><p className="vazio">Descubra os itens do bloco primeiro.</p></div>
  if (res)
    return (
      <Resumo resultados={res} titulo={`Desafio final — ${b.titulo}`}>
        <button className="btn" onClick={() => ir(`campanha/${camp.id}`)}>Voltar à campanha</button>
        <button className="btn primario" onClick={() => { setRes(null); setRodada(rodada + 1) }}>Novo desafio</button>
      </Resumo>
    )
  return <Sessao key={rodada} inicial={tarefas} pool={pool} modo="desafio" titulo={`${camp.titulo} · ${b.titulo} · Desafio final`} voltar={`bloco/${blocoId}`} fim={(r) => { concluir(blocoId, 'desafio-final'); setRes(r) }} />
}

/** Revisão do dia: itens devidos pela revisão espaçada, os com mais erros primeiro, cada um num formato diferente do último erro. */
export function Revisao() {
  const prog = useProgresso((s) => s.itens)
  const [res, setRes] = useState<Resultado[] | null>(null)
  const [rodada, setRodada] = useState(0)
  const { tarefas, pool, devidos } = useMemo(() => {
    const descobertos = itens.filter((i) => prog[i.id]?.descobertoEm)
    const devidos = descobertos.filter((i) => devido(prog[i.id]) || precisaRevisao(prog[i.id])).sort((a, b) => prioridade(prog[b.id]) - prioridade(prog[a.id]))
    const tarefas: Tarefa[] = []
    for (const it of devidos.slice(0, 10)) {
      const pool = descobertos.filter((i) => i.tipo === it.tipo)
      const preferidos: Formato[] = ['diferenciar', 'aplicacao', 'qse', 'erro', 'foto', 'ficha', 'associacao'].sort(() => Math.random() - 0.5) as Formato[]
      const t = tarefaPara(it, preferidos, pool, formatosEvitar(prog[it.id]))
      if (t) tarefas.push(t)
    }
    return { tarefas, pool: descobertos, devidos }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodada])
  if (res)
    return (
      <Resumo resultados={res} titulo="Revisão do dia">
        <button className="btn" onClick={() => ir('')}>Início</button>
        <button className="btn primario" onClick={() => { setRes(null); setRodada(rodada + 1) }}>Revisar mais</button>
      </Resumo>
    )
  if (!tarefas.length)
    return (
      <div className="tela estreita">
        <a className="voltar" href={href('')}>← Início</a>
        <h1>Revisão do dia</h1>
        <p className="vazio">{devidos.length === 0 ? 'Nada para revisar agora. Os itens voltam 1, 2, 4, 8 e 16 dias depois de cada acerto; um erro traz o item de volta logo.' : 'Não foi possível montar tarefas para os itens devidos.'}</p>
      </div>
    )
  return <Sessao key={rodada} inicial={tarefas} pool={pool} modo="revisao" titulo="Revisão do dia" voltar="" fim={setRes} />
}
