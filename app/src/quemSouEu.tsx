// "Quem sou eu?" por eliminação, em duas versões: pistas em texto e visual (instrumentos).
import { useMemo, useState } from 'react'
import { blocoPorId, campanhaDoBloco, itensDoBloco, fotoPrincipal, imgUrl, item as getItem, nomeCurto, type Item, type Imagem } from './content'
import { sequenciaDePistas, montarCandidatos, compativel, motivo, type Pista } from './whoami'
import { useProgresso, precisaRevisao } from './store'
import { Barra } from './ui'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

type Modo = 'texto' | 'visual'
const RODADAS = 5
/** Amplia a foto centralizando o ponto de foco (o detalhe distintivo), sem mostrar área vazia além da borda. */
function recorte(z: number, foco: [number, number] = [50, 50]) {
  const lim = (v: number) => Math.min(0, Math.max((1 - z) * 100, v))
  const tx = lim(50 - foco[0] * z), ty = lim(50 - foco[1] * z)
  return { transformOrigin: '0 0', transform: `translate(${tx}%, ${ty}%) scale(${z})` }
}
const fotoBoa = (it: Item): Imagem | undefined => it.imagens.find((im) => im.tipo === 'inteiro' && im.qualidade === 'boa')

export function QuemSouEu({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const prog = useProgresso((s) => s.itens)
  const concluir = useProgresso((s) => s.concluirEtapa)
  const [modo, setModo] = useState<Modo | null>(null)
  const [rodada, setRodada] = useState(0)
  const [pontos, setPontos] = useState<number[]>([])
  const descobertos = useMemo(() => new Set(Object.entries(prog).filter(([, p]) => p.descobertoEm).map(([id]) => id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [])
  const doBloco = useMemo(() => (b ? itensDoBloco(b) : []), [b])
  const tipo = doBloco[0]?.tipo ?? 'instr'
  // alvos: itens descobertos do bloco, com os de erros recentes primeiro
  const alvos = useMemo(() => {
    const base = doBloco.filter((i) => descobertos.has(i.id) && (modo !== 'visual' || fotoBoa(i)))
    const ord = [...base].sort(() => Math.random() - 0.5).sort((x, y) => Number(precisaRevisao(prog[y.id])) - Number(precisaRevisao(prog[x.id])))
    return ord.slice(0, Math.min(RODADAS, ord.length))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doBloco, descobertos, modo])

  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  const voltar = <a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a>

  if (!modo)
    return (
      <div className="tela estreita">
        {voltar}
        <h1>Quem sou eu?</h1>
        <p className="sub">Os candidatos ficam na tela. A cada pista, elimine só quem ficou impossível. Pedir pista nunca tira pontos: o palpite só é liberado quando a informação basta para chegar a um único item.</p>
        <div className="opcoes">
          <button className="opcao" onClick={() => setModo('texto')}><b>Pelas pistas</b> <span className="sub">Classifique e elimine, da pista mais ampla à mais específica</span></button>
          {tipo === 'instr' && (
            <button className="opcao" onClick={() => setModo('visual')}><b>Pela imagem</b> <span className="sub">Começa por um recorte da foto, que vai se abrindo</span></button>
          )}
        </div>
      </div>
    )

  if (!alvos.length)
    return <div className="tela estreita">{voltar}<p className="vazio">Nenhum item disponível para este modo{modo === 'visual' ? ' (é preciso foto boa do instrumento)' : ''}. Descubra os itens do bloco primeiro.</p></div>

  if (rodada >= alvos.length) {
    const media = Math.round(pontos.reduce((a, x) => a + x, 0) / Math.max(1, pontos.length))
    return (
      <div className="tela estreita">
        <section className="painel conquista">
          <div className="carta-voa">🕵️</div>
          <h2>Investigação concluída: {media} pontos de média</h2>
          <p>Próximo passo: <b>Encontre o erro</b>, em que você corrige fichas adulteradas.</p>
          <div className="acoes">
            <button className="btn" onClick={() => ir(`bloco/${blocoId}`)}>Voltar ao bloco</button>
            <button className="btn primario" onClick={() => { setRodada(0); setPontos([]); setModo(null) }}>Jogar de novo</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="tela">
      {voltar}
      <div className="progresso-fase">
        <span>{camp.titulo} · {b.titulo} · Quem sou eu? ({modo === 'texto' ? 'pistas' : 'imagem'})</span>
        <span>Rodada {rodada + 1} de {alvos.length}</span>
      </div>
      <Barra valor={rodada} total={alvos.length} />
      <Rodada
        key={rodada}
        alvo={alvos[rodada]}
        candidatos={montarCandidatos(doBloco, descobertos, tipo, alvos[rodada])}
        modo={modo}
        fim={(p) => {
          setPontos((ps) => [...ps, p])
          if (rodada + 1 >= alvos.length) concluir(blocoId, 'quem-sou-eu')
          setRodada(rodada + 1)
          window.scrollTo(0, 0)
        }}
      />
    </div>
  )
}

type Passo = { tipo: 'pista'; pista: Pista } | { tipo: 'imagem'; zoom: number; rotulo: string }

function Rodada({ alvo, candidatos: cand0, modo, fim }: { alvo: Item; candidatos: Item[]; modo: Modo; fim: (pontos: number) => void }) {
  const registrar = useProgresso((s) => s.registrar)
  // Se a sequência não existir (candidatos indistinguíveis), remove os indistinguíveis da rodada.
  const [cfg] = useState(() => {
    let cands = cand0
    let seq = sequenciaDePistas(alvo, cands)
    while (!seq && cands.length > 2) {
      cands = cands.filter((c) => c.id === alvo.id || sequenciaDePistas(alvo, [alvo, c]) !== null)
      seq = sequenciaDePistas(alvo, cands)
      if (!seq) cands = cands.slice(0, -1)
    }
    const pistas = seq ?? []
    let passos: Passo[] = pistas.map((p) => ({ tipo: 'pista' as const, pista: p }))
    if (modo === 'visual') {
      const finais = passos.filter((p) => p.tipo === 'pista' && p.pista.final)
      const meio = passos.filter((p) => !(p.tipo === 'pista' && p.pista.final))
      passos = [
        { tipo: 'imagem', zoom: 2.8, rotulo: 'Um recorte da foto' },
        { tipo: 'imagem', zoom: 1.7, rotulo: 'A foto um pouco mais aberta' },
        ...meio,
        ...finais,
        { tipo: 'imagem', zoom: 1, rotulo: 'A foto inteira' },
      ]
    }
    return { cands, passos }
  })
  const { cands, passos } = cfg
  const [n, setN] = useState(1) // passos revelados
  const [eliminados, setEliminados] = useState<Record<string, string>>({}) // id → motivo
  const [errosElim, setErrosElim] = useState(0)
  const [palpite, setPalpite] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [fimRodada, setFimRodada] = useState<{ certo: boolean; pontos: number; escolhido: string } | null>(null)

  const reveladas = passos.slice(0, n)
  const pistasDadas = reveladas.filter((p): p is Extract<Passo, { tipo: 'pista' }> => p.tipo === 'pista').map((p) => p.pista)
  const zoomAtual = [...reveladas].reverse().find((p): p is Extract<Passo, { tipo: 'imagem' }> => p.tipo === 'imagem')
  const possiveis = cands.filter((c) => compativel(c, pistasDadas))
  const foto = modo === 'visual' ? fotoBoa(alvo) : undefined
  // Na versão visual, a foto (boa) pode bastar desde que os parecidos com o alvo já tenham sido descartados pelas pistas
  const parecidosRestantes = possiveis.filter((c) => c.id !== alvo.id && (alvo.confundeCom.includes(c.id) || c.confundeCom.includes(alvo.id)))
  const podeChutar = possiveis.length === 1 || (modo === 'visual' && !!foto && parecidosRestantes.length === 0)
  const acabou = n >= passos.length

  const tocar = (c: Item) => {
    if (fimRodada) return
    if (palpite) {
      const certo = c.id === alvo.id
      const naoEliminados = cands.filter((x) => x.id !== alvo.id && !eliminados[x.id] && !compativel(x, pistasDadas)).length
      const extraVisual = modo === 'visual' ? Math.max(0, n - 1) * 8 : 0
      const pontos = certo ? Math.max(20, 100 - errosElim * 15 - naoEliminados * 5 - extraVisual) : 0
      setFimRodada({ certo, pontos, escolhido: c.id })
      if (certo) registrar(alvo.id, { modo: 'quem-sou-eu', correto: true, score: pontos / 100, detalhe: `Identificado com ${pistasDadas.length} pista(s)${modo === 'visual' ? ' na versão visual' : ''}` })
      else {
        const m = motivo(c, pistasDadas)
        registrar(alvo.id, { modo: 'quem-sou-eu', correto: false, confundiuCom: c.id, detalhe: `Palpite "${c.nome}" no lugar de ${alvo.nome}${m ? `; a pista "${m.texto}" já excluía ${c.nome}` : ''}` })
      }
      return
    }
    if (eliminados[c.id]) {
      setEliminados(({ [c.id]: _, ...resto }) => resto)
      return
    }
    const m = motivo(c, pistasDadas)
    if (m) {
      setEliminados((e) => ({ ...e, [c.id]: m.texto }))
      setMsg({ ok: true, texto: `${nomeCurto(c)} eliminado: não combina com "${m.texto}"` })
    } else {
      setErrosElim((x) => x + 1)
      const desconhecido = pistasDadas.some((p) => p.testa(c) === null)
      setMsg({
        ok: false,
        texto: `${nomeCurto(c)} ainda é possível: ele não contradiz nenhuma pista dada${desconhecido ? ' (para alguma delas o material não informa o dado dele, então não dá para eliminar por ela)' : ''}. Elimine só quem uma pista exclui.`,
      })
      registrar(c.id, { modo: 'quem-sou-eu', correto: false, detalhe: `Eliminado sem motivo: era compatível com as pistas ${pistasDadas.map((p) => `"${p.texto}"`).join(', ')}` })
    }
  }

  return (
    <div className="qse">
      <section className="painel misterio">
        <h2>Quem sou eu?</h2>
        {modo === 'visual' && foto && zoomAtual && (
          <div className="recorte">
            <img src={imgUrl(foto.src)} alt="Instrumento misterioso" style={recorte(zoomAtual.zoom, foto.foco)} draggable={false} />
            <span className="dica">{zoomAtual.rotulo}</span>
          </div>
        )}
        <ol className="pistas">
          {pistasDadas.map((p) => <li key={p.id} className={p.final ? 'final' : ''}>{p.texto}</li>)}
          {pistasDadas.length === 0 && <li className="sub">Observe o recorte. Peça a próxima pista quando quiser.</li>}
        </ol>
        {!fimRodada && (
          <div className="acoes">
            <button className="btn" onClick={() => { setN(n + 1); setMsg(null) }} disabled={acabou || palpite}>
              {acabou ? 'Não há mais pistas' : passos[n]?.tipo === 'imagem' ? 'Abrir mais a foto' : 'Próxima pista'}
            </button>
            {!palpite ? (
              <button className="btn primario" onClick={() => setPalpite(true)} disabled={!podeChutar}>
                {podeChutar ? 'Já sei quem é!' : `Ainda há ${possiveis.length} possibilidades`}
              </button>
            ) : (
              <button className="btn" onClick={() => setPalpite(false)}>Cancelar palpite</button>
            )}
          </div>
        )}
        {modo === 'visual' && !podeChutar && acabou === false && parecidosRestantes.length > 0 && zoomAtual?.zoom === 1 && (
          <p className="alerta">A foto inteira não diferencia com segurança {parecidosRestantes.map((x) => x.nome).join(', ')}; peça mais uma pista.</p>
        )}
        {palpite && !fimRodada && <p className="destaque">Toque no candidato que você acha que é.</p>}
      </section>

      <div className="candidatos">
        {cands.map((c) => {
          const elim = eliminados[c.id]
          const f = fotoPrincipal(c)
          const estado = fimRodada ? (c.id === alvo.id ? 'alvo' : c.id === fimRodada.escolhido ? 'errado' : 'apagado') : elim ? 'eliminado' : ''
          return (
            <button key={c.id} className={`candidato ${estado} ${palpite ? 'escolher' : ''}`} onClick={() => tocar(c)} disabled={!!fimRodada || (palpite && !!elim)}>
              {modo === 'texto' && c.tipo === 'instr' && f && <img src={imgUrl(f.src)} alt="" draggable={false} />}
              <b>{nomeCurto(c)}</b>
              {elim && !fimRodada && <span className="motivo">✕ {elim}</span>}
            </button>
          )
        })}
      </div>

      <div aria-live="polite">
        {msg && !fimRodada && <div className={`explicacao ${msg.ok ? 'ok' : 'nao'}`}>{msg.texto}</div>}
        {fimRodada && (
          <section className={`painel resultado ${fimRodada.certo ? 'ok' : 'nao'}`}>
            <h2>{fimRodada.certo ? `Isso! Eu sou ${alvo.nome}.` : `Não. Eu sou ${alvo.nome}.`} <span className="sub">{fimRodada.pontos} pontos</span></h2>
            {!fimRodada.certo && (() => {
              const esc = getItem(fimRodada.escolhido)
              const m = motivo(esc, pistasDadas)
              return <p>{m ? `${esc.nome} já estava excluído pela pista "${m.texto}"` : `${esc.nome} também era compatível com as pistas, mas não era o alvo`}.</p>
            })()}
            <p>{alvo.tipo === 'instr' ? alvo.reconhecimento : alvo.diferencial}</p>
            <p className="sub">Pistas desta rodada: {passos.filter((p) => p.tipo === 'pista').map((p) => (p as { pista: Pista }).pista.texto).join(' → ')}</p>
            <div className="acoes"><button className="btn primario" onClick={() => fim(fimRodada.pontos)} autoFocus>Próxima rodada</button></div>
          </section>
        )}
      </div>
    </div>
  )
}
