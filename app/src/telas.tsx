// Telas de navegação: início, campanha, bloco, conceitos, erros e ajustes.
import { useRef, useState } from 'react'
import { confusoes, campanhas, itens, fios, instrumentos, itensDoBloco, blocoPorId, campanhaDoBloco, termo, item as getItem, nomeCurto, type Bloco } from './content'
import { useProgresso, nivel, precisaRevisao, exportarProgresso, devido, MODO_NOME } from './store'
import { Barra, Termo } from './ui'
import { href, ir } from './router'
import { BlocoComparacao } from './comparar'
import { usePrefs, som, type Tema } from './preferencias'
// lista vazia estável: um [] novo a cada leitura do store faria o React re-renderizar sem fim
const VAZIO: string[] = []

const ETAPAS: { id: string; nome: string; desc: string; pronto: boolean }[] = [
  { id: 'descobrir', nome: 'Descobrir', desc: 'Conheça as fichas', pronto: true },
  { id: 'memoria', nome: 'Jogo da memória', desc: 'Crie associações', pronto: true },
  { id: 'monte-ficha', nome: 'Monte a ficha', desc: 'Organize os atributos', pronto: true },
  { id: 'quem-sou-eu', nome: 'Quem sou eu?', desc: 'Elimine pelas pistas', pronto: true },
  { id: 'encontre-erro', nome: 'Encontre o erro', desc: 'Corrija a ficha', pronto: true },
  { id: 'desafio-final', nome: 'Desafio final', desc: 'Integre tudo', pronto: true },
]

export function Inicio() {
  const prog = useProgresso((s) => s.itens)
  const desc = itens.filter((i) => prog[i.id]?.descobertoEm).length
  const revisar = itens.filter((i) => precisaRevisao(prog[i.id]))
  const hoje = itens.filter((i) => devido(prog[i.id]) || precisaRevisao(prog[i.id])).length
  const descF = fios.filter((i) => prog[i.id]?.descobertoEm).length
  const descI = instrumentos.filter((i) => prog[i.id]?.descobertoEm).length
  const proximo = campanhas.flatMap((c) => c.blocos).find((b) => Array.isArray(b.itens) && itensDoBloco(b).some((i) => !prog[i.id]?.descobertoEm))
  return (
    <div className="tela">
      <BoasVindas />
      <section className="heroi">
        <h1>Fios e instrumentais de BTCA</h1>
        <p>Aprenda do zero: descubra cada item, reconheça, organize, recorde, corrija e aplique.</p>
        <div className="heroi-num">
          <div><b>{desc}</b><span>de {itens.length} descobertos</span></div>
          <div><b>{itens.filter((i) => nivel(prog[i.id]) >= 2).length}</b><span>reconhecidos</span></div>
          <div><b>{itens.filter((i) => nivel(prog[i.id]) >= 5).length}</b><span>dominados</span></div>
          <div><b>{hoje}</b><span>para revisar hoje</span></div>
        </div>
        <Barra valor={desc} total={itens.length} rotulo="Progresso geral" />
        <div className="acoes">
          {hoje > 0 && <a className="btn primario" href={href('revisao')}>Revisão de hoje ({hoje})</a>}
          {proximo && <a className={`btn ${hoje > 0 ? '' : 'primario'}`} href={href(`bloco/${proximo.id}/descobrir`)}>Continuar: {proximo.titulo}</a>}
          <a className="btn" href={href('mesa')}>Instrumentar na mesa</a>
        </div>
      </section>

      <div className="grade-2">
        <a className="painel link" href={href('campanha/fios')}>
          <h2>Campanha de fios</h2>
          <p className="sub">{descF} de {fios.length} fios descobertos</p>
          <Barra valor={descF} total={fios.length} />
        </a>
        <a className="painel link" href={href('campanha/instrumentos')}>
          <h2>Campanha de instrumentação</h2>
          <p className="sub">{descI} de {instrumentos.length} instrumentos descobertos</p>
          <Barra valor={descI} total={instrumentos.length} />
        </a>
      </div>

      {revisar.length > 0 && (
        <section className="painel">
          <h2>Precisam de revisão</h2>
          <p className="sub">Itens com erros recentes. Eles voltarão com mais frequência.</p>
          <div className="lista-chips">
            {revisar.map((i) => <a key={i.id} className="chip-link" href={href(`album/${i.id}`)}>{nomeCurto(i)}</a>)}
          </div>
        </section>
      )}
    </div>
  )
}

export function TelaCampanha({ id }: { id: string }) {
  const camp = campanhas.find((c) => c.id === id)
  const prog = useProgresso((s) => s.itens)
  const etapas = useProgresso((s) => s.etapas)
  if (!camp) return <NaoEncontrado />
  return (
    <div className="tela">
      <h1>{camp.titulo}</h1>
      <div className="trilha">
        {camp.blocos.map((b, n) => {
          const its = itensDoBloco(b)
          const desc = its.filter((i) => prog[i.id]?.descobertoEm).length
          const conceito = b.tipo === 'conceitos'
          const feito = conceito ? etapas[b.id]?.includes('descobrir') : b.tipo === 'comparacao' ? etapas[b.id]?.includes('comparacao') : its.length > 0 && desc === its.length
          return (
            <a key={b.id} className={`parada ${feito ? 'feita' : ''}`} href={href(`bloco/${b.id}`)}>
              <span className="parada-num">{feito ? '✓' : n}</span>
              <div>
                <h3>{b.titulo}</h3>
                <p className="sub">
                  {conceito ? `${b.termos?.length} conceitos` : b.tipo === 'comparacao' ? `${b.confusoes?.length} comparações` : `${desc}/${its.length} descobertos`}
                </p>
                {!conceito && b.tipo !== 'comparacao' && its.length > 0 && <Barra valor={desc} total={its.length} />}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export function TelaBloco({ id }: { id: string }) {
  const b = blocoPorId(id)
  const prog = useProgresso((s) => s.itens)
  const etapas = (useProgresso((s) => s.etapas[id]) ?? VAZIO)
  if (!b) return <NaoEncontrado />
  const camp = campanhaDoBloco(id)
  if (b.tipo === 'conceitos') return <Conceitos b={b} />
  if (b.tipo === 'comparacao') return <BlocoComparacao blocoId={b.id} />
  const its = itensDoBloco(b)
  const todosDescobertos = its.every((i) => prog[i.id]?.descobertoEm)
  return (
    <div className="tela">
      <a className="voltar" href={href(`campanha/${camp.id}`)}>← {camp.titulo}</a>
      <h1>{b.titulo}</h1>
      {b.nota && <p className="sub">{b.nota}</p>}
      <div className="lista-chips">{its.map((i) => <a key={i.id} className={`chip-link ${prog[i.id]?.descobertoEm ? '' : 'apagado'}`} href={href(`album/${i.id}`)}>{prog[i.id]?.descobertoEm ? nomeCurto(i) : '???'}</a>)}</div>
      <ol className="etapas">
        {ETAPAS.map((e, n) => {
          const feita = e.id === 'descobrir' ? todosDescobertos : etapas.includes(e.id)
          // cada etapa prepara a seguinte: só abre quando a anterior foi feita
          const anteriorFeita = n === 0 || (n === 1 ? todosDescobertos : etapas.includes(ETAPAS[n - 1].id))
          const liberada = e.pronto && anteriorFeita
          return (
            <li key={e.id} className={`etapa ${feita ? 'feita' : ''} ${liberada ? '' : 'trancada'}`}>
              <span className="etapa-num">{feita ? '✓' : n + 1}</span>
              <div className="etapa-txt"><b>{e.nome}</b><span>{e.pronto ? e.desc : 'Chega nos próximos marcos'}</span></div>
              {liberada ? <a className="btn" href={href(`bloco/${id}/${e.id}`)}>{feita ? 'Rever' : 'Começar'}</a> : <span className="cadeado" aria-label="bloqueado">🔒</span>}
            </li>
          )
        })}
        {camp.id === 'instrumentos' && (
          <li className={`etapa bonus ${todosDescobertos ? '' : 'trancada'}`}>
            <span className="etapa-num">★</span>
            <div className="etapa-txt"><b>Instrumentando</b><span>O cirurgião pede, você entrega</span></div>
            {todosDescobertos ? <a className="btn" href={href(`mesa?bloco=${id}`)}>Jogar</a> : <span className="cadeado">🔒</span>}
          </li>
        )}
      </ol>
    </div>
  )
}

function Conceitos({ b }: { b: Bloco }) {
  const camp = campanhaDoBloco(b.id)
  const concluir = useProgresso((s) => s.concluirEtapa)
  const vistos = useProgresso((s) => s.termosVistos)
  const ts = (b.termos ?? []).map((t) => termo(t)!).filter(Boolean)
  return (
    <div className="tela">
      <a className="voltar" href={href(`campanha/${camp.id}`)}>← {camp.titulo}</a>
      <h1>{b.titulo}</h1>
      <p className="sub">Estes conceitos aparecem em todas as fichas. Em qualquer tela, as palavras sublinhadas abrem a explicação.</p>
      <div className="grade-cartoes">
        {ts.map((t) => (
          <article key={t.id} className={`painel conceito ${vistos.includes(t.id) ? 'visto' : ''}`}>
            <h3>{t.termo}</h3>
            <p>{t.definicao}</p>
            <p className="destaque"><b>Na prática:</b> {t.consequencia}</p>
            {t.nota && <p className="alerta">{t.nota}</p>}
          </article>
        ))}
      </div>
      <div className="acoes"><button className="btn primario" onClick={() => { concluir(b.id, 'descobrir'); ir(`campanha/${camp.id}`) }}>Entendi os conceitos</button></div>
    </div>
  )
}

/** Atalhos para as comparações interativas de um conjunto de pares. */
export function ComparacaoLista({ ids }: { ids: string[] }) {
  return (
    <div className="lista-chips">
      {ids.map((cid) => {
        const c = confusoes.find((x) => x.id === cid)!
        return <a key={cid} className="chip-link" href={href(`comparar/${cid}`)}>⚖️ {c.itens.map((i) => nomeCurto(getItem(i))).join(' × ')}</a>
      })}
    </div>
  )
}

export function TelaErros() {
  const prog = useProgresso((s) => s.itens)
  const lista = itens
    .flatMap((i) => (prog[i.id]?.log ?? []).filter((r) => !r.correto).map((r) => ({ ...r, it: i })))
    .sort((a, b) => b.t - a.t)
  return (
    <div className="tela">
      <h1>Registro de erros</h1>
      {lista.length === 0 ? (
        <p className="vazio">Nenhum erro registrado ainda. Cada erro aparece aqui e na carta do item, e o item volta depois em outro formato.</p>
      ) : (
        <ul className="erros">
          {lista.map((r, k) => (
            <li key={`${r.t}-${r.it.id}-${k}`}>
              <a href={href(`album/${r.it.id}`)}><b>{nomeCurto(r.it)}</b></a>
              <span className="sub"> · {new Date(r.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {MODO_NOME[r.modo] ?? r.modo}</span>
              <p>{r.detalhe}</p>
              {(() => {
                const c = r.confundiuCom ? confusoes.find((x) => x.itens.includes(r.it.id) && x.itens.includes(r.confundiuCom!)) : undefined
                return c ? <a className="chip-link" href={href(`comparar/${c.id}`)}>⚖️ Comparar {c.itens.map((i) => getItem(i).nome).join(" × ")}</a> : null
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TelaAjustes() {
  const zerar = useProgresso((s) => s.zerar)
  const importar = useProgresso((s) => s.importar)
  const arq = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const baixar = () => {
    const blob = new Blob([exportarProgresso()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `btca-progresso-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Arquivo de progresso salvo.')
  }
  return (
    <div className="tela estreita">
      <h1>Progresso e ajustes</h1>
      <section className="painel">
        <h2>Guardar o progresso</h2>
        <p>O progresso fica salvo só neste navegador. No iPad, o Safari pode apagar dados de sites não visitados há 7 dias. Para evitar isso, adicione o jogo à Tela de Início (Compartilhar → Adicionar à Tela de Início).</p>
        <p>Para levar o progresso do Mac para o iPad (ou guardar uma cópia), exporte um arquivo e importe no outro aparelho.</p>
        <div className="acoes">
          <button className="btn primario" onClick={baixar}>Exportar progresso</button>
          <button className="btn" onClick={() => arq.current?.click()}>Importar progresso</button>
          <input ref={arq} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try { importar(await f.text()); setMsg('Progresso importado.') } catch (err) { setMsg(String((err as Error).message)) }
            e.target.value = ''
          }} />
        </div>
        {msg && <p className="destaque" role="status">{msg}</p>}
      </section>
      <PainelPreferencias />
      <section className="painel">
        <h2>Recomeçar</h2>
        <p>Apaga todo o progresso deste navegador. Exporte antes se quiser guardar.</p>
        <button className="btn perigo" onClick={() => { if (confirm('Apagar todo o progresso? Isso não pode ser desfeito.')) { zerar(); setMsg('Progresso apagado.') } }}>Apagar progresso</button>
      </section>
      <section className="painel">
        <h2>Sobre o conteúdo</h2>
        <p>Cada atributo das fichas mostra de onde veio. Marcações: <span className="sit sit-externa">fonte externa</span> não consta nos materiais; <span className="sit sit-divergente">divergência</span> os materiais discordam; <span className="sit sit-lacuna">lacuna</span> não consta. Toque na marcação para ver a nota. Conceitos sublinhados, como <Termo id="capilaridade" />, abrem uma explicação.</p>
      </section>
    </div>
  )
}

export function NaoEncontrado() {
  return <div className="tela"><h1>Página não encontrada</h1><a className="btn" href={href('')}>Voltar ao início</a></div>
}

function PainelPreferencias() {
  const { som: comSom, tema, set } = usePrefs()
  const TEMAS: { id: Tema; rot: string }[] = [{ id: 'auto', rot: 'Automático' }, { id: 'claro', rot: 'Claro' }, { id: 'escuro', rot: 'Escuro' }]
  return (
    <section className="painel">
      <h2>Preferências</h2>
      <label className="alternar"><input type="checkbox" checked={comSom} onChange={(e) => { set({ som: e.target.checked }); if (e.target.checked) setTimeout(() => som.acerto(), 50) }} /> Sons de acerto e erro</label>
      <p className="sub" style={{ marginTop: 10 }}>Tema</p>
      <div className="filtros" role="radiogroup" aria-label="Tema">
        {TEMAS.map((x) => <button key={x.id} role="radio" aria-checked={tema === x.id} className={`filtro ${tema === x.id ? 'ativo' : ''}`} onClick={() => set({ tema: x.id })}>{x.rot}</button>)}
      </div>
      <p className="sub">No Mac, as teclas 1 a 9 escolhem as opções e Enter confirma.</p>
    </section>
  )
}

function BoasVindas() {
  const { boasVindasVistas, set } = usePrefs()
  if (boasVindasVistas) return null
  const ipad = /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document
  return (
    <section className="painel boas-vindas">
      <h2>Bem-vindo! Como estudar com o jogo</h2>
      <ol>
        <li><b>Descobrir</b>: conheça as fichas de cada bloco (a ficha fica aberta; aqui você aprende).</li>
        <li><b>Memória</b> e <b>Monte a ficha</b>: associe e organize os atributos.</li>
        <li><b>Quem sou eu?</b> e <b>Encontre o erro</b>: recupere e diferencie.</li>
        <li><b>Desafio final</b>: integre tudo. Depois, a <b>Revisão de hoje</b> traz de volta o que você errou.</li>
      </ol>
      <p className="sub">Cada erro fica registrado na carta do item no Álbum. Toque nas palavras sublinhadas para ver a explicação.</p>
      {ipad && <p className="alerta">No iPad, toque em Compartilhar → <b>Adicionar à Tela de Início</b>. Assim o jogo abre como app, funciona offline e o Safari não apaga o seu progresso.</p>}
      <div className="acoes"><button className="btn primario" onClick={() => set({ boasVindasVistas: true })}>Começar</button></div>
    </section>
  )
}
