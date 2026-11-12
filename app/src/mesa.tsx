// Modo Instrumentando: o cirurgião pede, você entrega o instrumento certo da mesa.
import { useEffect, useMemo, useRef, useState } from 'react'
import { instrumentos, campanhas, pedidos, confusoes, fotoPrincipal, temFotoUtil, imgUrl, GRUPO, item as getItem, type Instrumento, type Grupo } from './content'
import { useProgresso, precisaRevisao } from './store'
import { Modal, ZoomImg, Barra } from './ui'
import { art } from './perguntas'
import { href, useQuery } from './router'

type Nivel = 'nome' | 'funcao' | 'caracteristica' | 'situacao' | 'misto'
type Pedido = { texto: string; aceita: string[]; nivel: Exclude<Nivel, 'misto'>; alvo: string }
type Resultado = { pedido: Pedido; entregue: string; correto: boolean }

const NIVEIS: { id: Nivel; rot: string; desc: string }[] = [
  { id: 'misto', rot: 'Progressivo', desc: 'Começa pelo nome e termina em situações' },
  { id: 'nome', rot: 'Pelo nome', desc: '"Kelly curva!"' },
  { id: 'funcao', rot: 'Pela função', desc: '"Preciso pinçar um vaso pequeno."' },
  { id: 'caracteristica', rot: 'Pela característica', desc: '"A hemostática com ranhuras só até 2/3."' },
  { id: 'situacao', rot: 'Pela situação', desc: '"Laparotomia: mantém a parede aberta."' },
]
// Ordem da mesa segundo a apostila: sentido horário, começando pela diérese no canto inferior direito.
// Fileira de cima (esq→dir): afastamento, auxiliar, síntese · fileira de baixo (esq→dir): hemostasia, preensão, diérese
const ZONAS: Grupo[] = ['afastamento', 'auxiliar', 'sintese', 'hemostasia', 'preensao', 'dierese']
const RODADA = 10
const BLOCOS_INSTR = campanhas.find((c) => c.id === 'instrumentos')!.blocos.filter((b) => Array.isArray(b.itens))
const sortear = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const embaralhar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5)

function pedidoPorNome(it: Instrumento): Pedido {
  const curto = it.nome.replace(/^(Pinça|Afastador|Porta-agulha|Tesoura de|Tesoura) /, '')
  const textos = [`${curto}!`, `Me passa ${art(it.nome)} ${it.nome}.`, `${it.nome}, por favor.`]
  return { texto: sortear(textos), aceita: [it.id], nivel: 'nome', alvo: it.id }
}

function gerarPedido(nivel: Exclude<Nivel, 'misto'>, naMesa: Set<string>, preferidos: string[]): Pedido | null {
  if (nivel === 'nome') {
    const alvo = preferidos.find((p) => naMesa.has(p)) ?? sortear([...naMesa])
    return pedidoPorNome(getItem(alvo) as Instrumento)
  }
  const possiveis = pedidos
    .filter((p) => p.nivel === nivel)
    .map((p) => ({ ...p, aceita: p.aceita.filter((a) => naMesa.has(a)) }))
    .filter((p) => p.aceita.length > 0)
  if (!possiveis.length) return null
  const comPreferido = possiveis.filter((p) => p.aceita.some((a) => preferidos.includes(a)))
  const p = sortear(comPreferido.length ? comPreferido : possiveis)
  return { texto: p.texto, aceita: p.aceita, nivel, alvo: p.aceita[0] }
}

export function Mesa() {
  const q = useQuery()
  const prog = useProgresso((s) => s.itens)
  const blocoInicial = q.get('bloco')
  const [config, setConfig] = useState<{ blocos: string[]; nivel: Nivel; nomes: boolean; embaralhar: boolean } | null>(null)
  const [blocos, setBlocos] = useState<string[]>(() => (blocoInicial ? [blocoInicial] : BLOCOS_INSTR.map((b) => b.id)))
  const [nivel, setNivel] = useState<Nivel>('misto')
  const [nomes, setNomes] = useState(true)
  const [emb, setEmb] = useState(false)

  const disponiveis = instrumentos.filter((i) => blocos.includes(i.bloco) && prog[i.id]?.descobertoEm)
  const naMesa = disponiveis.filter(temFotoUtil)
  const semFoto = disponiveis.filter((i) => !temFotoUtil(i))

  if (config) return <Partida config={config} foco={q.get('foco')} sair={() => setConfig(null)} />

  return (
    <div className="tela estreita">
      <a className="voltar" href={href(blocoInicial ? `bloco/${blocoInicial}` : '')}>← Voltar</a>
      <h1>Instrumentando</h1>
      <p className="sub">A mesa está montada como na apostila: sentido horário, começando pela diérese no canto inferior direito. O cirurgião pede, e você entrega o instrumento certo.</p>
      <section className="painel">
        <h2>Quais blocos entram na mesa?</h2>
        <div className="filtros">
          {BLOCOS_INSTR.map((b) => {
            const desc = (b.itens as string[]).filter((i) => prog[i]?.descobertoEm).length
            return (
              <button key={b.id} className={`filtro ${blocos.includes(b.id) ? 'ativo' : ''}`} aria-pressed={blocos.includes(b.id)}
                onClick={() => setBlocos(blocos.includes(b.id) ? blocos.filter((x) => x !== b.id) : [...blocos, b.id])}>
                {b.titulo} <small>({desc}/{(b.itens as string[]).length})</small>
              </button>
            )
          })}
        </div>
        <p className="sub">Só entram instrumentos que você já descobriu: {naMesa.length} na mesa.</p>
        {semFoto.length > 0 && <p className="alerta">Fora da mesa por falta de foto nos materiais: {semFoto.map((i) => i.nome).join(', ')}.</p>}
      </section>
      <section className="painel">
        <h2>Como o cirurgião pede?</h2>
        <div className="opcoes">
          {NIVEIS.map((n) => (
            <button key={n.id} className={`opcao ${nivel === n.id ? 'selecionada' : ''}`} onClick={() => setNivel(n.id)} aria-pressed={nivel === n.id}>
              <b>{n.rot}</b> <span className="sub">{n.desc}</span>
            </button>
          ))}
        </div>
        <label className="alternar"><input type="checkbox" checked={nomes} onChange={(e) => setNomes(e.target.checked)} /> Mostrar os nomes na mesa</label>
        <label className="alternar"><input type="checkbox" checked={emb} onChange={(e) => setEmb(e.target.checked)} /> Mesa bagunçada (instrumentos fora dos grupos)</label>
      </section>
      <div className="acoes">
        <button className="btn primario" disabled={naMesa.length < 2} onClick={() => setConfig({ blocos, nivel, nomes, embaralhar: emb })}>
          {naMesa.length < 2 ? 'Descubra ao menos 2 instrumentos' : 'Começar a cirurgia'}
        </button>
      </div>
    </div>
  )
}

function Partida({ config, foco, sair }: { config: { blocos: string[]; nivel: Nivel; nomes: boolean; embaralhar: boolean }; foco: string | null; sair: () => void }) {
  const prog = useProgresso((s) => s.itens)
  const registrar = useProgresso((s) => s.registrar)
  const mesa = useMemo(
    () => instrumentos.filter((i) => config.blocos.includes(i.bloco) && prog[i.id]?.descobertoEm && temFotoUtil(i)),
    // a mesa é fixada no início da partida
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const ids = useMemo(() => new Set(mesa.map((i) => i.id)), [mesa])
  const [n, setN] = useState(0)
  const [reinserir, setReinserir] = useState<{ em: number; id: string; evitar: string }[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [feedback, setFeedback] = useState<Resultado | null>(null)
  const [lupa, setLupa] = useState<Instrumento | null>(null)
  const ordemBaguncada = useMemo(() => embaralhar(mesa), [mesa])

  const nivelDaVez = (k: number): Exclude<Nivel, 'misto'> => {
    if (config.nivel !== 'misto') return config.nivel
    return k < 3 ? 'nome' : k < 6 ? sortear(['funcao', 'caracteristica'] as const) : k < 8 ? 'caracteristica' : 'situacao'
  }
  const gerar = (k: number, anterior?: Pedido): Pedido => {
    // 1) erro anterior volta em outro formato; 2) foco/itens com erros recentes; 3) qualquer item da mesa
    const devido = reinserir.find((r) => r.em <= k)
    const preferidos = [
      ...(devido ? [devido.id] : []),
      ...(foco && ids.has(foco) ? [foco] : []),
      ...embaralhar(mesa.filter((i) => precisaRevisao(prog[i.id])).map((i) => i.id)),
    ]
    const nv = nivelDaVez(k)
    if (devido && ids.has(devido.id)) {
      // o item errado volta com OUTRO tipo de pedido, desde que exista uma fala desse tipo para ele
      const ordem = ([nv, 'caracteristica', 'situacao', 'funcao', 'nome'] as const).filter((x) => x !== devido.evitar)
      for (const tentativa of ordem) {
        const p = gerarPedido(tentativa, ids, [devido.id])
        if (p && p.aceita.includes(devido.id)) return { ...p, alvo: devido.id }
      }
    }
    for (const tentativa of [nv, 'caracteristica', 'funcao', 'nome'] as const) {
      const p = gerarPedido(tentativa, ids, preferidos)
      if (p && (!anterior || p.texto !== anterior.texto)) return p
    }
    return pedidoPorNome(sortear(mesa))
  }
  const [pedido, setPedido] = useState<Pedido>(() => gerar(0))

  const entregar = (it: Instrumento) => {
    if (feedback) return
    setLupa(null)
    const correto = pedido.aceita.includes(it.id)
    const r = { pedido, entregue: it.id, correto }
    setFeedback(r)
    setResultados((rs) => [...rs, r])
    if (correto) registrar(it.id, { modo: 'instrumentando', correto: true, detalhe: `Pedido: "${pedido.texto}"` })
    else {
      registrar(pedido.alvo, { modo: 'instrumentando', correto: false, detalhe: `Pedido: "${pedido.texto}" → entregou ${it.nome}`, confundiuCom: it.id })
      setReinserir((xs) => [...xs.filter((x) => x.id !== pedido.alvo), { em: n + 3, id: pedido.alvo, evitar: pedido.nivel }])
    }
  }
  const proximo = () => {
    const k = n + 1
    setReinserir((xs) => xs.filter((x) => !(x.em <= k && x.id === pedido.alvo && feedback?.correto)))
    setFeedback(null)
    setN(k)
    if (k < RODADA) setPedido(gerar(k, pedido))
  }

  // teclado: Enter avança
  const btnProx = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (feedback) btnProx.current?.focus() }, [feedback])

  if (n >= RODADA) {
    const acertos = resultados.filter((r) => r.correto).length
    const erros = resultados.filter((r) => !r.correto)
    return (
      <div className="tela estreita">
        <section className="painel conquista">
          <Cirurgiao humor={acertos >= 8 ? 'feliz' : 'neutro'} />
          <h2>Cirurgia encerrada: {acertos} de {RODADA}</h2>
          <p>{acertos === RODADA ? 'Instrumentação perfeita.' : acertos >= 7 ? 'Boa instrumentação. Revise os pontos abaixo.' : 'Vale rever as fichas destes instrumentos antes da próxima.'}</p>
          {erros.length > 0 && (
            <ul className="erros">
              {erros.map((r, k) => (
                <li key={k}>
                  <p><b>"{r.pedido.texto}"</b></p>
                  <p>Você entregou {getItem(r.entregue).nome}; o certo era {r.pedido.aceita.map((a) => getItem(a).nome).join(' ou ')}.</p>
                </li>
              ))}
            </ul>
          )}
          <div className="acoes">
            <button className="btn" onClick={sair}>Mudar a mesa</button>
            <a className="btn" href={href('erros')}>Registro de erros</a>
            <button className="btn primario" onClick={() => { setN(0); setResultados([]); setReinserir([]); setPedido(gerar(0)) }}>Nova cirurgia</button>
          </div>
        </section>
      </div>
    )
  }

  const zonas = config.embaralhar
    ? [{ g: null as Grupo | null, itens: ordemBaguncada }]
    : ZONAS.map((g) => ({ g, itens: mesa.filter((i) => i.grupo.v === g) })).filter((z) => z.itens.length)
  const alvoIt = getItem(pedido.alvo) as Instrumento
  const entregueIt = feedback ? (getItem(feedback.entregue) as Instrumento) : null
  const chave = feedback && !feedback.correto
    ? confusoes.find((c) => c.itens.includes(feedback.entregue) && c.itens.some((x) => feedback.pedido.aceita.includes(x)))
    : undefined

  return (
    <div className="tela mesa-tela">
      <div className="mesa-topo">
        <button className="btn pequeno" onClick={sair}>← Sair</button>
        <span>Pedido {n + 1} de {RODADA} · {resultados.filter((r) => r.correto).length} acertos</span>
      </div>
      <Barra valor={n} total={RODADA} />

      <div className="cena">
        <Cirurgiao humor={feedback ? (feedback.correto ? 'feliz' : 'serio') : 'neutro'} />
        <div className={`balao ${feedback ? (feedback.correto ? 'ok' : 'nao') : ''}`} aria-live="polite">
          {!feedback && <p className="fala">{pedido.texto}</p>}
          {feedback?.correto && (
            <>
              <p className="fala">Isso! {entregueIt!.nome}.</p>
              <p>{entregueIt!.reconhecimento}</p>
            </>
          )}
          {feedback && !feedback.correto && (
            <>
              <p className="fala">Não… isso é {art(entregueIt!.nome)} {entregueIt!.nome}.</p>
              <p><b>{entregueIt!.nome}:</b> {entregueIt!.reconhecimento}</p>
              <p><b>Eu pedi {feedback.pedido.aceita.map((a) => getItem(a).nome).join(' ou ')}:</b> {alvoIt.reconhecimento}</p>
              {chave && <p className="destaque">{chave.chave}</p>}
              <p className="sub">Esse pedido volta daqui a pouco, de outro jeito.</p>
            </>
          )}
          {feedback && <button ref={btnProx} className="btn primario" onClick={proximo}>{n + 1 < RODADA ? 'Próximo pedido' : 'Ver resultado'}</button>}
        </div>
      </div>

      <div className={`mesa ${config.embaralhar ? 'baguncada' : ''}`}>
        {zonas.map((z) => (
          <div key={z.g ?? 'tudo'} className={`zona ${z.g ? 'g-' + z.g : ''}`}>
            {z.g && config.nomes && <span className="zona-nome">{GRUPO[z.g]}</span>}
            <div className="zona-itens">
              {z.itens.map((it) => {
                const foto = fotoPrincipal(it)
                const fotoFraca = !it.imagens.some((im) => im.tipo === 'inteiro' && im.qualidade === 'boa')
                const mostrarNome = config.nomes || fotoFraca
                const estado = feedback ? (feedback.pedido.aceita.includes(it.id) ? 'certo' : feedback.entregue === it.id ? 'errado' : 'apagado') : ''
                return (
                  <div key={it.id} className={`instrumento ${estado}`}>
                    <button className="instrumento-btn" onClick={() => entregar(it)} disabled={!!feedback} aria-label={`Entregar ${config.nomes ? it.nome : 'este instrumento'}`}>
                      {foto && <img src={imgUrl(foto.src)} alt={config.nomes ? it.nome : 'instrumento'} draggable={false} />}
                      {mostrarNome && <span className={`instrumento-nome ${!config.nomes ? 'aviso' : ''}`} title={!config.nomes ? 'Nome visível porque a foto não permite diferenciar com segurança' : undefined}>{!config.nomes && '⚠ '}{it.nome}</span>}
                    </button>
                    <button className="lupa" onClick={() => setLupa(it)} disabled={!!feedback} aria-label="Ver de perto">🔍</button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal aberto={!!lupa} fechar={() => setLupa(null)} titulo={config.nomes && lupa ? lupa.nome : 'Ver de perto'} largo>
        {lupa && (
          <>
            <div className="lupa-fotos">
              {lupa.imagens.filter((im) => im.tipo === 'inteiro' && im.qualidade !== 'insuficiente').map((im) => <ZoomImg key={im.src} src={imgUrl(im.src)} alt="instrumento" />)}
            </div>
            <div className="acoes"><button className="btn primario" onClick={() => entregar(lupa)}>Entregar este</button></div>
          </>
        )}
      </Modal>
    </div>
  )
}

/** Cirurgião ilustrado (personagem original, sem referência a pessoas reais). */
function Cirurgiao({ humor }: { humor: 'neutro' | 'feliz' | 'serio' }) {
  const olho = humor === 'feliz' ? 'M-9 -2q3 -4 6 0M3 -2q3 -4 6 0' : humor === 'serio' ? 'M-9 -3h6M3 -3h6' : ''
  return (
    <svg className="cirurgiao" viewBox="-50 -50 100 110" role="img" aria-label="Cirurgião">
      <path d="M-40 60q0-34 40-34t40 34z" fill="var(--avental)" />
      <path d="M-12 28 0 44 12 28" fill="none" stroke="var(--avental-escuro)" strokeWidth="3" />
      <circle cx="0" cy="0" r="24" fill="var(--pele)" />
      <path d="M-26 -6q0-22 26-24t26 24q-4-8-26-9t-26 9z" fill="var(--touca)" />
      <path d="M-20 4h40v10q-4 12-20 12t-20-12z" fill="var(--mascara)" />
      <path d="M-20 6l-6-4M20 6l6-4" stroke="var(--mascara)" strokeWidth="2" />
      {olho ? <path d={olho} transform="translate(0 -2)" fill="none" stroke="#1d2420" strokeWidth="2.4" strokeLinecap="round" />
        : <><circle cx="-7" cy="-4" r="2.6" fill="#1d2420" /><circle cx="7" cy="-4" r="2.6" fill="#1d2420" /></>}
      {humor === 'serio' && <path d="M-11 -11l7 2M11 -11l-7 2" stroke="#1d2420" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}
