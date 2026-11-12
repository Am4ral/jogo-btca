// Monte a ficha: o usuário reconstrói a identidade do item selecionando etiquetas.
// O feedback explica cada erro (não só "certo/errado").
import { useMemo, useState } from 'react'
import { blocoPorId, campanhaDoBloco, itensDoBloco, fotoPrincipal, type Item } from './content'
import { gruposDaFicha, corrigir, type GrupoEtiquetas } from './fichaGen'
import { useProgresso, precisaRevisao } from './store'
import { Barra, Foto, Termo } from './ui'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

export function MonteFicha({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const prog = useProgresso((s) => s.itens)
  const concluir = useProgresso((s) => s.concluirEtapa)
  // ordem: itens com erros recentes primeiro; só itens descobertos
  const fila = useMemo(() => {
    const its = b ? itensDoBloco(b).filter((i) => prog[i.id]?.descobertoEm) : []
    return [...its].sort(() => Math.random() - 0.5).sort((x, y) => Number(precisaRevisao(prog[y.id])) - Number(precisaRevisao(prog[x.id])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b])
  const [k, setK] = useState(0)
  const [notas, setNotas] = useState<number[]>([])
  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  if (!fila.length) return <div className="tela estreita"><a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a><p className="vazio">Descubra os itens do bloco primeiro.</p></div>

  if (k >= fila.length) {
    const media = Math.round((notas.reduce((a, x) => a + x, 0) / notas.length) * 100)
    return (
      <div className="tela estreita">
        <section className="painel conquista">
          <div className="carta-voa">🗂️</div>
          <h2>Fichas montadas: {media}% de acerto</h2>
          <p>{media >= 90 ? 'Ótima organização dos atributos.' : 'Os itens com erro voltam com mais frequência na revisão e nos próximos modos.'}</p>
          <div className="acoes">
            <button className="btn" onClick={() => ir(`bloco/${blocoId}`)}>Voltar ao bloco</button>
            <button className="btn primario" onClick={() => { setK(0); setNotas([]) }}>Montar de novo</button>
          </div>
        </section>
      </div>
    )
  }
  return (
    <div className="tela estreita">
      <a className="voltar" href={href(`bloco/${blocoId}`)}>← {b.titulo}</a>
      <div className="progresso-fase">
        <span>{camp.titulo} · {b.titulo} · Monte a ficha</span>
        <span>Ficha {k + 1} de {fila.length}</span>
      </div>
      <Barra valor={k} total={fila.length} />
      <FichaEmBranco
        key={fila[k].id}
        it={fila[k]}
        vizinhos={itensDoBloco(b)}
        proximo={(nota) => {
          const ns = [...notas, nota]
          setNotas(ns)
          if (k + 1 >= fila.length) concluir(blocoId, 'monte-ficha')
          setK(k + 1)
          window.scrollTo(0, 0)
        }}
      />
    </div>
  )
}

function FichaEmBranco({ it, vizinhos, proximo }: { it: Item; vizinhos: Item[]; proximo: (nota: number) => void }) {
  const registrar = useProgresso((s) => s.registrar)
  // gerado uma única vez por ficha: as etiquetas não podem ser sorteadas de novo depois da conferência
  const [grupos] = useState(() => gruposDaFicha(it, vizinhos))
  const [marcadas, setMarcadas] = useState<Record<string, string[]>>({})
  const [conferida, setConferida] = useState(false)
  // Metade das vezes o instrumento aparece só pela foto (quando a foto é boa o bastante)
  const [soFoto] = useState(() => it.tipo === 'instr' && it.imagens.some((im) => im.tipo === 'inteiro' && im.qualidade === 'boa') && Math.random() < 0.5)
  const foto = fotoPrincipal(it)

  const marcar = (g: GrupoEtiquetas, id: string) => {
    if (conferida) return
    setMarcadas((m) => {
      const atual = m[g.campo] ?? []
      if (!g.multi) return { ...m, [g.campo]: [id] }
      return { ...m, [g.campo]: atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id] }
    })
  }
  const completo = grupos.every((g) => (marcadas[g.campo] ?? []).length > 0)
  const resultado = grupos.map((g) => corrigir(g, marcadas[g.campo] ?? []))
  const acertos = resultado.filter(Boolean).length
  const nota = grupos.length ? acertos / grupos.length : 1

  const conferir = () => {
    setConferida(true)
    grupos.forEach((g, n) => {
      if (resultado[n]) return
      const marc = (marcadas[g.campo] ?? []).map((id) => g.opcoes.find((o) => o.id === id)?.rotulo).join(', ')
      registrar(it.id, { modo: 'monte-ficha', correto: false, detalhe: `${g.titulo}: marcou "${marc}". ${g.explicacao}` })
    })
    registrar(it.id, { modo: 'monte-ficha', correto: nota >= 0.9, ficha: true, score: nota, detalhe: `Ficha montada: ${acertos}/${grupos.length}` })
  }

  return (
    <section className="painel">
      <div className="ficha-alvo">
        {it.tipo === 'instr' && foto && <Foto img={foto} alt={soFoto ? 'Instrumento a identificar' : it.nome} className="foto-alvo" />}
        <div>
          <p className="sub">{soFoto && !conferida ? 'Monte a ficha do instrumento da foto' : 'Monte a ficha de'}</p>
          <h2>{soFoto && !conferida ? '?' : it.nome}</h2>
          {it.tipo === 'fio' && <p className="sub">{it.comerciais.join(' · ')}</p>}
        </div>
      </div>
      {grupos.map((g, n) => {
        const marc = marcadas[g.campo] ?? []
        return (
          <fieldset key={g.campo} className={`etiquetas ${conferida ? (resultado[n] ? 'certo' : 'errado') : ''}`}>
            <legend>{g.termo ? <Termo id={g.termo}>{g.titulo}</Termo> : g.titulo}</legend>
            <div className="etiquetas-opcoes">
              {g.opcoes.map((o) => {
                const sel = marc.includes(o.id)
                const correta = g.corretas.includes(o.id)
                const estado = conferida ? (correta ? (sel ? 'ok' : g.multi ? 'faltou' : 'ok-nao-marcada') : sel ? 'errada' : '') : sel ? 'sel' : ''
                return (
                  <button key={o.id} className={`etiqueta ${estado} ${o.rotulo.length > 40 ? 'longa' : ''}`} onClick={() => marcar(g, o.id)} aria-pressed={sel} disabled={conferida}>
                    {o.rotulo}
                  </button>
                )
              })}
            </div>
            {conferida && (
              <div className={`explicacao ${resultado[n] ? 'ok' : 'nao'}`}>
                <b>{resultado[n] ? 'Certo.' : 'Não é isso.'}</b> {g.explicacao}
                {g.nota && <div className="fonte">Observação: {g.nota}</div>}
              </div>
            )}
          </fieldset>
        )
      })}
      <div className="acoes fixas">
        {!conferida ? (
          <button className="btn primario" disabled={!completo} onClick={conferir}>{completo ? 'Conferir a ficha' : 'Escolha uma etiqueta em cada grupo'}</button>
        ) : (
          <>
            <span className={`placar ${nota >= 0.9 ? 'ok' : ''}`}>{acertos}/{grupos.length} certos</span>
            <button className="btn primario" onClick={() => proximo(nota)} autoFocus>Próxima ficha</button>
          </>
        )}
      </div>
    </section>
  )
}
