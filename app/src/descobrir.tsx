// Fase Descobrir: ficha didática + perguntas guiadas, com a ficha sempre consultável.
import { useMemo, useState } from 'react'
import { blocoPorId, campanhaDoBloco, itensDoBloco, nomeCurto } from './content'
import { perguntasGuiadas, type Pergunta } from './perguntas'
import { useProgresso } from './store'
import { Ficha, Modal, Barra } from './ui'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

type Fase = 'ficha' | 'perguntas' | 'fim-item'

export function Descobrir({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const its = useMemo(() => (b ? itensDoBloco(b) : []), [b])
  const prog = useProgresso((s) => s.itens)
  const descobrir = useProgresso((s) => s.descobrir)
  const registrar = useProgresso((s) => s.registrar)
  const concluir = useProgresso((s) => s.concluirEtapa)
  // começa no primeiro item ainda não descoberto
  const [idx, setIdx] = useState(() => Math.max(0, its.findIndex((i) => !prog[i.id]?.descobertoEm)))
  const [fase, setFase] = useState<Fase>('ficha')
  const [qIdx, setQIdx] = useState(0)
  const [resposta, setResposta] = useState<number | null>(null)
  const [verFicha, setVerFicha] = useState(false)
  const it = its[idx]
  const perguntas: Pergunta[] = useMemo(() => (it ? perguntasGuiadas(it) : []), [it])

  if (!b || !it) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  const q = perguntas[qIdx]
  // sub-rodadas de até 3 itens para não sobrecarregar
  const rodada = Math.floor(idx / 3)
  const totalRodadas = Math.ceil(its.length / 3)

  const proximoItem = () => {
    if (idx + 1 < its.length) {
      setIdx(idx + 1); setFase('ficha'); setQIdx(0); setResposta(null); window.scrollTo(0, 0)
    } else {
      concluir(blocoId, 'descobrir')
      ir(`bloco/${blocoId}`)
    }
  }
  const responder = (n: number) => {
    if (resposta !== null) return
    setResposta(n)
    registrar(it.id, { modo: 'descobrir', correto: q.opcoes[n].correta, detalhe: `${q.pergunta} → respondeu "${q.opcoes[n].rotulo}"` })
  }
  const proximaPergunta = () => {
    setResposta(null)
    if (qIdx + 1 < perguntas.length) setQIdx(qIdx + 1)
    else { descobrir(it.id); setFase('fim-item') }
  }

  return (
    <div className="tela estreita">
      <a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a>
      <div className="progresso-fase">
        <span>{camp.titulo} · {b.titulo}</span>
        <span>Item {idx + 1} de {its.length}{totalRodadas > 1 ? ` · rodada ${rodada + 1}/${totalRodadas}` : ''}</span>
      </div>
      <Barra valor={idx + (fase === 'fim-item' ? 1 : 0)} total={its.length} />

      {fase === 'ficha' && (
        <>
          <div className="painel"><Ficha it={it} /></div>
          <div className="acoes fixas">
            {perguntas.length > 0 ? (
              <button className="btn primario" onClick={() => setFase('perguntas')}>Entendi — fazer perguntas guiadas</button>
            ) : (
              <button className="btn primario" onClick={() => { descobrir(it.id); setFase('fim-item') }}>Entendi</button>
            )}
          </div>
        </>
      )}

      {fase === 'perguntas' && q && (
        <section className="painel pergunta">
          <p className="sub">Pergunta {qIdx + 1} de {perguntas.length} · sobre {nomeCurto(it)}</p>
          <h2>{q.pergunta}</h2>
          <div className="opcoes">
            {q.opcoes.map((o, n) => (
              <button
                key={o.rotulo}
                className={`opcao ${resposta !== null ? (o.correta ? 'certa' : n === resposta ? 'errada' : 'neutra') : ''}`}
                onClick={() => responder(n)}
                disabled={resposta !== null}
              >
                <kbd>{n + 1}</kbd> {o.rotulo}
              </button>
            ))}
          </div>
          {resposta !== null && (
            <div className={`explicacao ${q.opcoes[resposta].correta ? 'ok' : 'nao'}`} role="status">
              <b>{q.opcoes[resposta].correta ? 'Isso mesmo.' : `A resposta é: ${q.opcoes.find((o) => o.correta)?.rotulo}.`}</b> {q.explicacao}
            </div>
          )}
          <div className="acoes">
            <button className="btn" onClick={() => setVerFicha(true)}>Consultar a ficha</button>
            {resposta !== null && <button className="btn primario" onClick={proximaPergunta} autoFocus>Continuar</button>}
          </div>
          <Modal aberto={verFicha} fechar={() => setVerFicha(false)} titulo={it.nome} largo><Ficha it={it} compacta /></Modal>
        </section>
      )}

      {fase === 'fim-item' && (
        <section className="painel conquista">
          <div className="carta-voa">🃏</div>
          <h2>{it.nome} entrou no seu álbum</h2>
          <p>{it.tipo === 'instr' ? it.reconhecimento : it.diferencial}</p>
          <div className="acoes">
            <a className="btn" href={href(`album/${it.id}`)}>Ver a carta</a>
            <button className="btn primario" onClick={proximoItem} autoFocus>{idx + 1 < its.length ? `Próximo: ${its[idx + 1].nome}` : 'Concluir o bloco'}</button>
          </div>
        </section>
      )}
    </div>
  )
}
