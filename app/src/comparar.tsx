// Comparação entre semelhantes: lado a lado, destaque do detalhe que diferencia e pergunta de discriminação.
import { useMemo, useState } from 'react'
import { confusoes, item as getItem, imgUrl, blocoPorId, campanhaDoBloco, nomeCurto, fmtValor, ROTULO, isAttr, type Item, type Confusao, type Imagem } from './content'
import { segmentos } from './frases'
import { useProgresso } from './store'
import { Barra, Modal, ZoomImg } from './ui'
import { href, ir } from './router'
import { NaoEncontrado } from './telas'

const embaralhar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5)
const fotoComp = (it: Item): Imagem | undefined =>
  it.imagens.find((im) => im.tipo === 'inteiro' && im.qualidade === 'boa') ?? it.imagens.find((im) => im.tipo === 'inteiro' && im.qualidade === 'aceitavel')

function recorte(z: number, foco: [number, number] = [50, 50]) {
  const lim = (v: number) => Math.min(0, Math.max((1 - z) * 100, v))
  return { transformOrigin: '0 0', transform: `translate(${lim(50 - foco[0] * z)}%, ${lim(50 - foco[1] * z)}%) scale(${z})` }
}

type Pergunta = { texto: string; caracteristica: string; certo: string; opcoes: string[] }

/** Pergunta de discriminação: uma característica que só UM dos itens tem. */
export function gerarPergunta(c: Confusao): Pergunta | null {
  const its = c.itens.map(getItem)
  const segs = its.map((it) => segmentos(it))
  const campos = embaralhar([...new Set(segs.flat().map((s) => s.campo))]).sort((a, b) => Number(c.atributos.includes(b)) - Number(c.atributos.includes(a)))
  // 'função' fica de fora: funções se sobrepõem (a Mixter e a Kocher também pinçam vasos)
  for (const campo of campos.filter((x) => x !== 'funcao')) {
    const vals = segs.map((ss) => ss.find((s) => s.campo === campo))
    if (vals.some((v) => !v)) continue
    for (let k = 0; k < its.length; k++) {
      const v = vals[k]!.verdadeiro
      if (vals.filter((x) => x!.verdadeiro === v).length === 1)
        return { texto: 'Qual deles tem esta característica?', caracteristica: vals[k]!.rotulo(v), certo: its[k].id, opcoes: embaralhar(its.map((i) => i.id)) }
    }
  }
  // sem atributo categórico que separe: usa o traço de reconhecimento / diferencial
  const k = Math.floor(Math.random() * its.length)
  const t = its[k].tipo === 'instr' ? (its[k] as { reconhecimento?: string }).reconhecimento : (its[k] as { diferencial?: string }).diferencial
  return t ? { texto: 'A quem se refere esta descrição?', caracteristica: t, certo: its[k].id, opcoes: embaralhar(its.map((i) => i.id)) } : null
}

/** Atributos que diferem entre os itens (para a tabela). */
function diferencas(c: Confusao): { campo: string; valores: string[] }[] {
  const its = c.itens.map(getItem)
  const campos = [...new Set([...c.atributos, ...its.flatMap((it) => Object.keys(it).filter((k) => isAttr((it as unknown as Record<string, unknown>)[k])))])]
  const linhas: { campo: string; valores: string[] }[] = []
  for (const campo of campos) {
    if (!ROTULO[campo]) continue
    const valores = its.map((it) => fmtValor((it as unknown as Record<string, unknown>)[campo] as never))
    if (new Set(valores).size > 1) linhas.push({ campo, valores })
  }
  // os atributos que o material destaca vêm primeiro
  return linhas.sort((a, b) => Number(c.atributos.includes(b.campo)) - Number(c.atributos.includes(a.campo)))
}

export function Comparacao({ c, depois }: { c: Confusao; depois?: () => void }) {
  const registrar = useProgresso((s) => s.registrar)
  const its = c.itens.map(getItem)
  const linhas = useMemo(() => diferencas(c), [c])
  const [fase, setFase] = useState<'estudo' | 'teste'>('estudo')
  const [perg] = useState(() => gerarPergunta(c))
  const [resp, setResp] = useState<string | null>(null)
  const [zoom, setZoom] = useState<Item | null>(null)
  const temFoto = its.some((i) => i.tipo === 'instr')
  const algumDetalhe = its.some((i) => { const f = fotoComp(i); return !!f?.foco && f.qualidade === 'boa' })
  const semFotoBoa = its.filter((i) => i.tipo === 'instr' && !i.imagens.some((im) => im.tipo === 'inteiro' && im.qualidade === 'boa'))

  const responder = (id: string) => {
    if (!perg || resp) return
    setResp(id)
    const certo = id === perg.certo
    registrar(perg.certo, { modo: 'comparacao', correto: certo, confundiuCom: certo ? undefined : id, detalhe: `Comparação ${its.map((i) => i.nome).join(' × ')}: "${perg.caracteristica}" → respondeu ${getItem(id).nome}` })
  }

  return (
    <section className="painel comparacao">
      <h2>{its.map((i) => nomeCurto(i)).join(' × ')}</h2>
      {temFoto && (
        <div className="lado-a-lado" style={{ ['--n' as string]: its.length }}>
          {its.map((it) => {
            const f = fotoComp(it)
            return (
              <figure key={it.id}>
                {f ? (
                  <>
                    <button className="foto-comp" onClick={() => setZoom(it)} aria-label={`Ampliar ${it.nome}`}><img src={imgUrl(f.src)} alt={it.nome} /></button>
                    {f.foco && f.qualidade === 'boa' ? (
                      <div className="recorte detalhe-comp" aria-label={`Detalhe de ${it.nome}`}>
                        <img src={imgUrl(f.src)} alt="" style={recorte(2.6, f.foco)} />
                        <span className="dica">detalhe</span>
                      </div>
                    ) : algumDetalhe ? <div className="recorte sem-detalhe"><span>Foto sem detalhe confiável</span></div> : null}
                  </>
                ) : <div className="foto sem-foto"><span>Sem foto no material</span></div>}
                <figcaption><b>{it.nome}</b><br />{it.tipo === 'instr' ? it.reconhecimento : it.diferencial}</figcaption>
              </figure>
            )
          })}
        </div>
      )}
      {c.imagemComparacao && c.qualidadeComparacao === 'boa' && (
        <figure className="foto-original"><img src={imgUrl(c.imagemComparacao)} alt="Foto do material com os dois instrumentos" /><figcaption className="sub">Foto original do material com os dois{c.notaComparacao ? `. ${c.notaComparacao}` : ''}</figcaption></figure>
      )}
      {semFotoBoa.length > 0 && <p className="alerta">A foto de {semFotoBoa.map((i) => i.nome).join(', ')} não permite ver o detalhe com segurança; a diferença está descrita no texto.</p>}
      {c.alerta && <p className="alerta">{c.alerta}</p>}
      <p className="destaque"><b>A chave:</b> {c.chave}</p>
      {linhas.length > 0 && (
        <div className="tabela-rolar">
          <table className="tabela-dif">
            <thead><tr><th></th>{its.map((i) => <th key={i.id}>{nomeCurto(i)}</th>)}</tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.campo} className={c.atributos.includes(l.campo) ? 'chave' : ''}>
                  <th>{ROTULO[l.campo]}</th>
                  {l.valores.map((v, k) => <td key={k}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fonte">Só aparecem os atributos que diferem. Em destaque, os que o material usa para diferenciar.</p>
        </div>
      )}
      {fase === 'estudo' ? (
        <div className="acoes"><button className="btn primario" onClick={() => setFase('teste')} disabled={!perg}>Testar a diferença</button></div>
      ) : perg && (
        <div className="pergunta-comp">
          <h3>{perg.texto}</h3>
          <p className="caracteristica">“{perg.caracteristica}”</p>
          <div className="opcoes">
            {perg.opcoes.map((id) => (
              <button key={id} className={`opcao ${resp ? (id === perg.certo ? 'certa' : id === resp ? 'errada' : 'neutra') : ''}`} onClick={() => responder(id)} disabled={!!resp}>{nomeCurto(getItem(id))}</button>
            ))}
          </div>
          {resp && (
            <div className={`explicacao ${resp === perg.certo ? 'ok' : 'nao'}`}>
              <b>{resp === perg.certo ? 'Isso.' : `É ${getItem(perg.certo).nome}.`}</b> {c.chave}
            </div>
          )}
          {resp && depois && <div className="acoes"><button className="btn primario" onClick={depois} autoFocus>Continuar</button></div>}
        </div>
      )}
      <Modal aberto={!!zoom} fechar={() => setZoom(null)} titulo={zoom?.nome} largo>
        {zoom && fotoComp(zoom) && <ZoomImg src={imgUrl(fotoComp(zoom)!.src)} alt={zoom.nome} />}
      </Modal>
    </section>
  )
}

/** Rota direta: comparar/<id> (atalho do álbum e do registro de erros). */
export function TelaComparar({ id }: { id: string }) {
  const c = confusoes.find((x) => x.id === id)
  if (!c) return <NaoEncontrado />
  return (
    <div className="tela estreita">
      <a className="voltar" href="#" onClick={(e) => { e.preventDefault(); history.back() }}>← Voltar</a>
      <Comparacao c={c} />
    </div>
  )
}

/** Bloco de comparação: percorre os pares do bloco, estudo → teste. */
export function BlocoComparacao({ blocoId }: { blocoId: string }) {
  const b = blocoPorId(blocoId)
  const prog = useProgresso((s) => s.itens)
  const concluir = useProgresso((s) => s.concluirEtapa)
  const [k, setK] = useState(0)
  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(blocoId)
  const todas = (b.confusoes ?? []).map((id) => confusoes.find((x) => x.id === id)!).filter(Boolean)
  // só compara o que já foi apresentado na fase Descobrir
  const prontas = todas.filter((c) => c.itens.every((i) => prog[i]?.descobertoEm))
  const faltam = todas.filter((c) => !prontas.includes(c))
  const voltar = <a className="voltar" href={href(`campanha/${camp.id}`)}>← {camp.titulo}</a>
  if (!prontas.length)
    return <div className="tela estreita">{voltar}<h1>{b.titulo}</h1><p className="vazio">Descubra os itens dos blocos anteriores para liberar as comparações.</p></div>
  if (k >= prontas.length)
    return (
      <div className="tela estreita">{voltar}
        <section className="painel conquista">
          <div className="carta-voa">⚖️</div>
          <h2>Comparações feitas</h2>
          {faltam.length > 0 && <p className="sub">Ainda bloqueadas (itens não descobertos): {faltam.map((c) => c.itens.map((i) => getItem(i).nome).join(' × ')).join('; ')}.</p>}
          <div className="acoes"><button className="btn" onClick={() => ir(`campanha/${camp.id}`)}>Voltar à campanha</button><button className="btn primario" onClick={() => setK(0)}>Rever</button></div>
        </section>
      </div>
    )
  return (
    <div className="tela estreita">
      {voltar}
      <div className="progresso-fase"><span>{camp.titulo} · {b.titulo}</span><span>Par {k + 1} de {prontas.length}</span></div>
      <Barra valor={k} total={prontas.length} />
      <Comparacao key={prontas[k].id} c={prontas[k]} depois={() => { if (k + 1 >= prontas.length) concluir(blocoId, 'comparacao'); setK(k + 1); window.scrollTo(0, 0) }} />
    </div>
  )
}
