// Jogo da memória: associações visuais e conceituais. Cada acerto mostra um reforço curto.
import { useEffect, useMemo, useRef, useState } from 'react'
import { blocoPorId, campanhaDoBloco, itensDoBloco, item as getItem, imgUrl, type Item } from './content'
import { montarTabuleiro, planoDeRodadas, TITULO_TIPO, type Par, type Lado } from './memoriaGen'
import { useProgresso, precisaRevisao } from './store'
import { Barra } from './ui'
import { som } from './preferencias'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

type Carta = { uid: string; par: number; lado: 'a' | 'b'; conteudo: Lado }

function embaralhar<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function Memoria({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const prog = useProgresso((s) => s.itens)
  // só itens já descobertos entram no jogo
  const candidatos = useMemo(() => (b ? itensDoBloco(b).filter((i) => prog[i.id]?.descobertoEm) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [b])
  const plano = useMemo(() => planoDeRodadas(candidatos), [candidatos])
  const [rodada, setRodada] = useState(0)
  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  if (plano.length === 0)
    return (
      <div className="tela estreita">
        <a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a>
        <p className="vazio">Descubra pelo menos 2 itens deste bloco para jogar a memória.</p>
      </div>
    )
  return (
    <div className="tela">
      <a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a>
      <div className="progresso-fase">
        <span>{camp.titulo} · {b.titulo} · Jogo da memória</span>
        <span>Rodada {Math.min(rodada + 1, plano.length)} de {plano.length}</span>
      </div>
      <Barra valor={rodada} total={plano.length} />
      {rodada < plano.length ? (
        <Tabuleiro key={rodada} candidatos={candidatos} tipo={plano[rodada]} fim={() => setRodada(rodada + 1)} />
      ) : (
        <FimMemoria blocoId={blocoId} />
      )}
    </div>
  )
}

function FimMemoria({ blocoId }: { blocoId: string }) {
  const concluir = useProgresso((s) => s.concluirEtapa)
  useEffect(() => { concluir(blocoId, 'memoria') }, [blocoId, concluir])
  return (
    <section className="painel conquista">
      <div className="carta-voa">🧠</div>
      <h2>Associações feitas</h2>
      <p>Próximo passo: <b>Monte a ficha</b>, em que você reconstrói os atributos de cada item.</p>
      <div className="acoes">
        <button className="btn" onClick={() => ir(`bloco/${blocoId}`)}>Voltar ao bloco</button>
        <a className="btn primario" href={href(`bloco/${blocoId}/monte-ficha`)}>Ir para Monte a ficha</a>
      </div>
    </section>
  )
}

function Tabuleiro({ candidatos, tipo, fim }: { candidatos: Item[]; tipo: { tipo: keyof typeof TITULO_TIPO; n: number }; fim: () => void }) {
  const prog = useProgresso((s) => s.itens)
  const registrar = useProgresso((s) => s.registrar)
  const pares: Par[] = useMemo(
    () => montarTabuleiro(candidatos, tipo.tipo, tipo.n, candidatos.filter((i) => precisaRevisao(prog[i.id])).map((i) => i.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const cartas: Carta[] = useMemo(
    () => embaralhar(pares.flatMap((p, k) => [
      { uid: `${k}a`, par: k, lado: 'a' as const, conteudo: p.a },
      { uid: `${k}b`, par: k, lado: 'b' as const, conteudo: p.b },
    ])),
    [pares],
  )
  const [abertas, setAbertas] = useState<string[]>([])
  const [achados, setAchados] = useState<number[]>([])
  const [vistas, setVistas] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; titulo: string } | null>(null)
  const [tentativas, setTentativas] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const virar = (c: Carta) => {
    if (abertas.length === 2 || abertas.includes(c.uid) || achados.includes(c.par)) return
    const novas = [...abertas, c.uid]
    setAbertas(novas)
    som.virar()
    if (novas.length < 2) return
    const [x, y] = novas.map((u) => cartas.find((k) => k.uid === u)!)
    setTentativas((t) => t + 1)
    if (x.par === y.par) {
      const p = pares[x.par]
      setAchados((a) => [...a, x.par])
      setAbertas([])
      setMsg({ ok: true, titulo: getItem(p.item).nome, texto: p.reforco })
      registrar(p.item, { modo: 'memoria', correto: true, detalhe: `Par ${TITULO_TIPO[tipo.tipo]} encontrado` })
    } else {
      // Só conta como ERRO de conhecimento se as duas cartas já tinham sido vistas
      // e formam uma tentativa de associação (lados diferentes). Errar por não lembrar a posição faz parte do jogo.
      const jaVistas = vistas.has(x.uid) && vistas.has(y.uid)
      if (jaVistas && x.lado !== y.lado) {
        const ladoA = x.lado === 'a' ? x : y, ladoB = x.lado === 'b' ? x : y
        const itA = getItem(pares[ladoA.par].item), itB = getItem(pares[ladoB.par].item)
        const traco = (it: Item) => (it.tipo === 'instr' ? it.reconhecimento ?? '' : it.diferencial ?? '')
        registrar(itA.id, { modo: 'memoria', correto: false, confundiuCom: itB.id, detalhe: `Associou "${desc(ladoA.conteudo, itA)}" a "${desc(ladoB.conteudo, itB)}" (${TITULO_TIPO[tipo.tipo]})` })
        setMsg({
          ok: false,
          titulo: 'Esses dois não combinam',
          texto: ladoA.conteudo.img
            ? `Essa foto é de ${itA.nome}: ${traco(itA)}`
            : `"${desc(ladoB.conteudo)}" corresponde a ${itB.nome}, não a ${itA.nome}. ${traco(itA)}`,
        })
      }
      timer.current = window.setTimeout(() => setAbertas([]), 1100)
    }
    setVistas((v) => new Set([...v, x.uid, y.uid]))
  }

  const terminou = achados.length === pares.length && pares.length > 0
  const colunas = cartas.length <= 6 ? 3 : 4
  return (
    <section>
      <h2 className="rodada-titulo">{TITULO_TIPO[tipo.tipo]} <span className="sub">· {pares.length} pares</span></h2>
      <div className="memoria" style={{ ['--cols' as string]: colunas }}>
        {cartas.map((c) => {
          const aberta = abertas.includes(c.uid) || achados.includes(c.par)
          return (
            <button key={c.uid} className={`mcarta ${aberta ? 'aberta' : ''} ${achados.includes(c.par) ? 'achada' : ''}`} onClick={() => virar(c)} aria-label={aberta ? desc(c.conteudo) : 'Carta virada'} disabled={achados.includes(c.par)}>
              <span className="mcarta-dentro">
                <span className="mcarta-verso" aria-hidden>✚</span>
                <span className={`mcarta-frente ${c.conteudo.img ? 'tem-img' : ''}`}>
                  {c.conteudo.img ? <img src={imgUrl(c.conteudo.img)} alt="" draggable={false} /> : <span>{c.conteudo.texto}</span>}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="memoria-rodape" aria-live="polite">
        {msg && (
          <div className={`explicacao ${msg.ok ? 'ok' : 'nao'}`}>
            <b>{msg.ok ? `✓ ${msg.titulo}.` : msg.titulo + '.'}</b> {msg.texto}
          </div>
        )}
        <p className="sub">{achados.length}/{pares.length} pares · {tentativas} tentativas</p>
        {terminou && <div className="acoes"><button className="btn primario" onClick={fim} autoFocus>Próxima rodada</button></div>}
      </div>
    </section>
  )
}

function desc(l: Lado, it?: Item): string {
  if (l.texto) return l.texto
  return it ? `a foto de ${it.nome}` : 'foto'
}
