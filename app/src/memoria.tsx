// Jogo da memória: associações visuais e conceituais. Cada acerto mostra um reforço curto.
import { useEffect, useMemo, useState } from 'react'
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
  // Mecânica: você vira até 2 cartas e elas FICAM viradas. Nada é conferido sozinho:
  // só ao tocar em "Validar combinação" você afirma que formam par, e aí o sistema confere.
  // "Virar de volta" desiste da tentativa sem contar acerto nem erro.
  const [abertas, setAbertas] = useState<string[]>([])
  const [achados, setAchados] = useState<number[]>([])
  const [errado, setErrado] = useState<string[] | null>(null) // par validado errado, ainda à mostra
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; titulo: string } | null>(null)
  const [validacoes, setValidacoes] = useState(0)
  const [erros, setErros] = useState(0)

  const virar = (c: Carta) => {
    if (achados.includes(c.par)) return
    if (errado) { setErrado(null); setAbertas([]) } // depois de um erro, o próximo toque recomeça
    if (abertas.includes(c.uid)) { setAbertas(abertas.filter((u) => u !== c.uid)); return } // tocar de novo desvira
    if (abertas.length >= 2) { setMsg({ ok: false, titulo: 'Já há duas cartas viradas', texto: 'Valide a combinação ou vire-as de volta antes de abrir outra.' }); return }
    setAbertas([...abertas, c.uid])
    setMsg(null)
    som.virar()
  }

  const validar = () => {
    if (abertas.length !== 2) return
    const [x, y] = abertas.map((u) => cartas.find((k) => k.uid === u)!)
    setValidacoes((v) => v + 1)
    if (x.par === y.par) {
      const p = pares[x.par]
      setAchados((a) => [...a, x.par])
      setAbertas([])
      setMsg({ ok: true, titulo: getItem(p.item).nome, texto: p.reforco })
      registrar(p.item, { modo: 'memoria', correto: true, detalhe: `Validou o par ${TITULO_TIPO[tipo.tipo]}` })
      return
    }
    // Você afirmou que eram par e não eram: é um erro de conhecimento, registrado na carta.
    setErros((e) => e + 1)
    setErrado([x.uid, y.uid])
    const traco = (it: Item) => (it.tipo === 'instr' ? it.reconhecimento ?? '' : it.diferencial ?? '')
    if (x.lado === y.lado) {
      const it = getItem(pares[x.par].item)
      registrar(it.id, { modo: 'memoria', correto: false, confundiuCom: pares[y.par].item, detalhe: `Validou duas cartas do mesmo tipo como par (${TITULO_TIPO[tipo.tipo]})` })
      setMsg({ ok: false, titulo: 'Não formam par', texto: `As duas cartas são do mesmo tipo (${x.conteudo.img ? 'duas fotos' : 'dois textos'}). Cada par junta ${TITULO_TIPO[tipo.tipo].toLowerCase()}.` })
      return
    }
    const ladoA = x.lado === 'a' ? x : y, ladoB = x.lado === 'b' ? x : y
    const itA = getItem(pares[ladoA.par].item), itB = getItem(pares[ladoB.par].item)
    registrar(itA.id, { modo: 'memoria', correto: false, confundiuCom: itB.id, detalhe: `Validou "${desc(ladoA.conteudo, itA)}" com "${desc(ladoB.conteudo, itB)}" (${TITULO_TIPO[tipo.tipo]})` })
    setMsg({
      ok: false,
      titulo: 'Não formam par',
      texto: ladoA.conteudo.img
        ? ladoB.conteudo.texto === itB.nome
          ? `Essa foto é de ${itA.nome}, não de ${itB.nome}. ${traco(itA)}`
          : `Essa foto é de ${itA.nome}; "${desc(ladoB.conteudo)}" corresponde a ${itB.nome}. ${traco(itA)}`
        : `"${desc(ladoA.conteudo)}" e "${desc(ladoB.conteudo)}" não combinam: o segundo corresponde a ${itB.nome}. ${traco(itA)}`,
    })
  }

  const desvirar = () => { setAbertas([]); setErrado(null); setMsg(null) }

  const terminou = achados.length === pares.length && pares.length > 0
  const colunas = cartas.length <= 6 ? 3 : 4
  return (
    <section>
      <h2 className="rodada-titulo">{TITULO_TIPO[tipo.tipo]} <span className="sub">· {pares.length} pares</span></h2>
      <p className="sub">Vire duas cartas. Se achar que combinam, toque em <b>Validar combinação</b>. Só a validação conta como acerto ou erro; virar de volta não conta nada.</p>
      <div className="memoria" style={{ ['--cols' as string]: colunas }}>
        {cartas.map((c) => {
          const aberta = abertas.includes(c.uid) || achados.includes(c.par)
          const sel = abertas.includes(c.uid) && !achados.includes(c.par)
          return (
            <button key={c.uid} className={`mcarta ${aberta ? 'aberta' : ''} ${achados.includes(c.par) ? 'achada' : ''} ${sel ? 'selecionada' : ''} ${errado?.includes(c.uid) ? 'errada' : ''}`} onClick={() => virar(c)} aria-pressed={sel} aria-label={aberta ? desc(c.conteudo) : 'Carta virada'} disabled={achados.includes(c.par)}>
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
        {/* painel fixo no rodapé: a explicação e os botões ficam sempre à vista, sem rolar */}
        <div className="memoria-flutuante">
          {msg && (
            <div className={`explicacao ${msg.ok ? 'ok' : 'nao'}`}>
              <b>{msg.ok ? `✓ ${msg.titulo}.` : msg.titulo + '.'}</b> {msg.texto}
            </div>
          )}
          <div className="acoes">
            {!terminou ? (
              <>
                <button className="btn primario" onClick={validar} disabled={abertas.length !== 2 || !!errado}>Validar combinação</button>
                <button className="btn" onClick={desvirar} disabled={abertas.length === 0}>{errado ? 'Virar de volta e continuar' : 'Virar de volta'}</button>
              </>
            ) : (
              <button className="btn primario" onClick={fim} autoFocus>Próxima rodada</button>
            )}
          </div>
          <p className="sub placar-memoria">{achados.length}/{pares.length} pares · {validacoes} {validacoes === 1 ? 'validação' : 'validações'} · {erros} {erros === 1 ? 'erro' : 'erros'}</p>
        </div>
      </div>
    </section>
  )
}

function desc(l: Lado, it?: Item): string {
  if (l.texto) return l.texto
  return it ? `a foto de ${it.nome}` : 'foto'
}
