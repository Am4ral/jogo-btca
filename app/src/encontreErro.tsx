// Encontre o erro: uma ficha propositalmente adulterada. O usuário marca os trechos errados e escolhe a correção.
import { useMemo, useState } from 'react'
import { blocoPorId, campanhaDoBloco, itensDoBloco, fotoPrincipal, confusoes, item as getItem, type Item } from './content'
import { segmentos, camposPrioritarios, abertura, type Segmento } from './frases'
import { gruposDaFicha } from './fichaGen'
import { useProgresso, precisaRevisao } from './store'
import { Barra, Foto } from './ui'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

export type Nivel = 'facil' | 'medio' | 'dificil' | 'avancado'
const NIVEIS: { id: Nivel; rot: string; desc: string }[] = [
  { id: 'facil', rot: 'Fácil', desc: 'Há exatamente 1 erro' },
  { id: 'medio', rot: 'Médio', desc: 'Há exatamente 2 erros' },
  { id: 'dificil', rot: 'Difícil', desc: 'De 1 a 3 erros; você não sabe quantos' },
  { id: 'avancado', rot: 'Avançado', desc: 'De 0 a 3 erros: a ficha pode estar inteiramente correta' },
]
const FICHAS = 5
const sortear = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const embaralhar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5)

export type Trecho = Segmento & { mostrado: string; opcoes: string[] }

/** Monta a ficha adulterada: até 6 trechos, com k deles trocados por outro valor válido do mesmo atributo. */
export function adulterar(it: Item, nivel: Nivel): Trecho[] {
  const todos = segmentos(it)
  const prio = camposPrioritarios(it)
  const escolhidos = [...todos.filter((s) => prio.includes(s.campo)), ...embaralhar(todos.filter((s) => !prio.includes(s.campo)))].slice(0, 6)
  const naOrdem = todos.filter((s) => escolhidos.includes(s))
  const k = nivel === 'facil' ? 1 : nivel === 'medio' ? 2 : nivel === 'dificil' ? 1 + Math.floor(Math.random() * 3) : Math.random() < 0.25 ? 0 : 1 + Math.floor(Math.random() * 3)
  // só se adultera o que consta no material; fonte externa entra apenas se faltar trecho do material
  const mutaveis = [...naOrdem.filter((s) => s.material && prio.includes(s.campo)), ...embaralhar(naOrdem.filter((s) => s.material && !prio.includes(s.campo))), ...embaralhar(naOrdem.filter((s) => !s.material))]
  const alvo = new Set(mutaveis.slice(0, Math.min(k, mutaveis.length)).map((s) => s.campo))
  // valores "trocáveis" preferidos: os dos itens com que este costuma ser confundido
  const parecidos = confusoes.filter((c) => c.itens.includes(it.id)).flatMap((c) => c.itens).filter((x) => x !== it.id).map(getItem)
  return naOrdem.map((s) => {
    let mostrado = s.verdadeiro
    if (alvo.has(s.campo)) {
      const dosParecidos = parecidos.flatMap((p) => segmentos(p).filter((x) => x.campo === s.campo).map((x) => x.verdadeiro)).filter((v) => v !== s.verdadeiro && s.dominio.includes(v))
      mostrado = dosParecidos.length && Math.random() < 0.7 ? sortear(dosParecidos) : sortear(s.dominio.filter((v) => v !== s.verdadeiro))
    }
    // opções de correção: o valor verdadeiro (se adulterado) + até 2 outros valores do domínio, nunca o mostrado
    const outros = embaralhar(s.dominio.filter((v) => v !== mostrado && v !== s.verdadeiro)).slice(0, 2)
    const opcoes = embaralhar([...(mostrado !== s.verdadeiro ? [s.verdadeiro] : []), ...outros])
    return { ...s, mostrado, opcoes }
  })
}

export function explicacoes(it: Item): Record<string, string> {
  const m: Record<string, string> = {}
  for (const g of gruposDaFicha(it, [])) m[g.campo] = g.explicacao + (g.nota ? ` (${g.nota})` : '')
  return m
}

export function EncontreErro({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const prog = useProgresso((s) => s.itens)
  const concluir = useProgresso((s) => s.concluirEtapa)
  const [nivel, setNivel] = useState<Nivel | null>(null)
  const [k, setK] = useState(0)
  const [notas, setNotas] = useState<number[]>([])
  const fila = useMemo(() => {
    const its = b ? itensDoBloco(b).filter((i) => prog[i.id]?.descobertoEm && segmentos(i).length >= 3) : []
    const ord = embaralhar(its).sort((x, y) => Number(precisaRevisao(prog[y.id])) - Number(precisaRevisao(prog[x.id])))
    return Array.from({ length: Math.min(FICHAS, Math.max(ord.length, 1) * 2) }, (_, n) => ord[n % Math.max(ord.length, 1)]).filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, nivel])
  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  const voltar = <a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a>
  if (!nivel)
    return (
      <div className="tela estreita">
        {voltar}
        <h1>Encontre o erro</h1>
        <p className="sub">Cada ficha foi adulterada de propósito. Toque nos trechos errados e escolha a correção. Só são adulterados dados que constam no material.</p>
        <div className="opcoes">
          {NIVEIS.map((n) => <button key={n.id} className="opcao" onClick={() => setNivel(n.id)}><b>{n.rot}</b> <span className="sub">{n.desc}</span></button>)}
        </div>
      </div>
    )
  if (!fila.length) return <div className="tela estreita">{voltar}<p className="vazio">Descubra os itens do bloco primeiro.</p></div>
  if (k >= fila.length) {
    const media = Math.round((notas.reduce((a, x) => a + x, 0) / notas.length) * 100)
    return (
      <div className="tela estreita">
        <section className="painel conquista">
          <div className="carta-voa">🔎</div>
          <h2>Fichas corrigidas: {media}% de acerto</h2>
          <p>{media >= 90 ? 'Ótima discriminação.' : 'Os itens com erro voltam com mais frequência nas revisões.'}</p>
          <div className="acoes">
            <button className="btn" onClick={() => ir(`bloco/${blocoId}`)}>Voltar ao bloco</button>
            <button className="btn primario" onClick={() => { setK(0); setNotas([]); setNivel(null) }}>Jogar de novo</button>
          </div>
        </section>
      </div>
    )
  }
  return (
    <div className="tela estreita">
      {voltar}
      <div className="progresso-fase">
        <span>{camp.titulo} · {b.titulo} · Encontre o erro ({NIVEIS.find((x) => x.id === nivel)!.rot})</span>
        <span>Ficha {k + 1} de {fila.length}</span>
      </div>
      <Barra valor={k} total={fila.length} />
      <FichaAdulterada key={k} it={fila[k]} nivel={nivel} proxima={(nota) => {
        setNotas((ns) => [...ns, nota])
        if (k + 1 >= fila.length) concluir(blocoId, 'encontre-erro')
        setK(k + 1)
        window.scrollTo(0, 0)
      }} />
    </div>
  )
}

function FichaAdulterada({ it, nivel, proxima }: { it: Item; nivel: Nivel; proxima: (nota: number) => void }) {
  const registrar = useProgresso((s) => s.registrar)
  const [trechos] = useState(() => adulterar(it, nivel))
  const [expl] = useState(() => explicacoes(it))
  const [marcados, setMarcados] = useState<Record<string, string | null>>({}) // campo → correção escolhida
  const [aberto, setAberto] = useState<string | null>(null)
  const [conferida, setConferida] = useState(false)
  const nErros = trechos.filter((t) => t.mostrado !== t.verdadeiro).length
  const foto = it.tipo === 'instr' ? fotoPrincipal(it) : undefined

  const tocar = (t: Trecho) => {
    if (conferida) return
    if (t.campo in marcados) {
      if (aberto === t.campo) { const { [t.campo]: _x, ...r } = marcados; setMarcados(r); setAberto(null) } else setAberto(t.campo)
    } else { setMarcados({ ...marcados, [t.campo]: null }); setAberto(t.campo) }
  }
  const pendente = Object.values(marcados).some((v) => v === null)

  const avaliar = trechos.map((t) => {
    const errado = t.mostrado !== t.verdadeiro
    const marcado = t.campo in marcados
    const correcao = marcados[t.campo]
    const certo = errado ? marcado && correcao === t.verdadeiro : !marcado
    return { t, errado, marcado, correcao, certo }
  })
  const acertos = avaliar.filter((a) => a.certo).length
  const nota = acertos / trechos.length

  const conferir = () => {
    setConferida(true)
    setAberto(null)
    for (const a of avaliar) {
      if (a.certo) continue
      const txt = a.errado
        ? a.marcado ? `Corrigiu "${a.t.rotulo(a.t.mostrado)}" para "${a.correcao ? a.t.rotulo(a.correcao) : '—'}", mas o certo é "${a.t.rotulo(a.t.verdadeiro)}"` : `Não percebeu o erro "${a.t.rotulo(a.t.mostrado)}" (o certo é "${a.t.rotulo(a.t.verdadeiro)}")`
        : `Marcou como errado o trecho correto "${a.t.rotulo(a.t.verdadeiro)}"`
      registrar(it.id, { modo: 'encontre-erro', correto: false, detalhe: txt })
    }
    registrar(it.id, { modo: 'encontre-erro', correto: nota >= 0.9, score: nota, detalhe: `Encontre o erro: ${acertos}/${trechos.length} trechos certos` })
  }

  const frase = (mostrar: 'mostrado' | 'verdadeiro') => trechos.map((t, n) => {
    const v = mostrar === 'mostrado' ? t.mostrado : t.verdadeiro
    const sep = n === 0 ? ' ' : n === trechos.length - 1 ? ' e ' : ', '
    return { t, v, sep }
  })

  return (
    <section className="painel">
      {nivel === 'facil' || nivel === 'medio' ? <p className="sub">Esta ficha tem {nErros} {nErros === 1 ? 'erro' : 'erros'}.</p> : <p className="sub">Você não sabe quantos erros há{nivel === 'avancado' ? ' (pode não haver nenhum)' : ''}.</p>}
      <div className="ficha-alvo">{foto && <Foto img={foto} alt={it.nome} className="foto-alvo" />}</div>
      <p className="frase-ficha">
        {abertura(it)}
        {frase('mostrado').map(({ t, v, sep }) => {
          const a = avaliar.find((x) => x.t === t)!
          const estado = conferida ? (a.errado ? (a.certo ? 'corrigido' : 'perdido') : a.marcado ? 'falso' : '') : t.campo in marcados ? 'marcado' : ''
          return (
            <span key={t.campo}>
              {sep}
              <button className={`trecho ${estado}`} onClick={() => tocar(t)} disabled={conferida} aria-pressed={t.campo in marcados}>{t.rotulo(v)}</button>
            </span>
          )
        })}
        .
      </p>
      {aberto && !conferida && (() => {
        const t = trechos.find((x) => x.campo === aberto)!
        return (
          <div className="correcao">
            <p><b>"{t.rotulo(t.mostrado)}"</b> está errado. O certo é:</p>
            <div className="etiquetas-opcoes">
              {t.opcoes.map((o) => (
                <button key={o} className={`etiqueta ${marcados[t.campo] === o ? 'sel' : ''} ${o.length > 40 ? 'longa' : ''}`} onClick={() => { setMarcados({ ...marcados, [t.campo]: o }); setAberto(null) }}>{t.rotulo(o)}</button>
              ))}
            </div>
            <button className="btn pequeno" onClick={() => { const { [t.campo]: _y, ...r } = marcados; setMarcados(r); setAberto(null) }}>Desmarcar: este trecho está certo</button>
          </div>
        )
      })()}
      {!conferida ? (
        <div className="acoes">
          {nivel === 'avancado' && Object.keys(marcados).length === 0 && <button className="btn" onClick={conferir}>Não há erros nesta ficha</button>}
          <button className="btn primario" onClick={conferir} disabled={pendente || Object.keys(marcados).length === 0}>
            {pendente ? 'Escolha a correção do trecho marcado' : 'Conferir'}
          </button>
        </div>
      ) : (
        <>
          <div className="painel comparacao-frases">
            <p className="sub">Ficha correta</p>
            <p className="frase-ficha">
              {abertura(it)}
              {frase('verdadeiro').map(({ t, v, sep }) => <span key={t.campo}>{sep}<span className={t.mostrado !== t.verdadeiro ? 'era-errado' : ''}>{t.rotulo(v)}</span></span>)}.
            </p>
          </div>
          {nErros === 0 && <p className="destaque">Esta ficha estava inteiramente correta.</p>}
          <ul className="correcoes">
            {avaliar.filter((a) => a.errado || a.marcado).map((a) => (
              <li key={a.t.campo} className={a.certo ? 'ok' : 'nao'}>
                <b>{a.certo ? '✓' : '✗'} {a.errado ? `"${a.t.rotulo(a.t.mostrado)}" → "${a.t.rotulo(a.t.verdadeiro)}"` : `"${a.t.rotulo(a.t.verdadeiro)}" estava certo`}</b>
                {a.errado && a.marcado && !a.certo && <span> (você corrigiu para "{a.correcao ? a.t.rotulo(a.correcao) : '—'}")</span>}
                <p>{expl[a.t.campo] ?? (a.t.campo === 'comercial' ? `O nome comercial de ${it.nome.toLowerCase()} é ${a.t.verdadeiro}.` : a.t.campo === 'composicao' ? `${it.nome}: ${a.t.verdadeiro}.` : '')}</p>
              </li>
            ))}
          </ul>
          <div className="acoes">
            <span className={`placar ${nota >= 0.9 ? 'ok' : ''}`}>{acertos}/{trechos.length} trechos certos</span>
            <button className="btn primario" onClick={() => proxima(nota)} autoFocus>Próxima ficha</button>
          </div>
        </>
      )}
    </section>
  )
}
