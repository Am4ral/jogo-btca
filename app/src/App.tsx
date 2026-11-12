import { useEffect } from 'react'
import { useRota, href } from './router'
import { usePrefs, aplicarTema } from './preferencias'
import { useAtalhos } from './atalhos'
import { Inicio, TelaCampanha, TelaBloco, TelaErros, TelaAjustes, NaoEncontrado } from './telas'
import { Descobrir } from './descobrir'
import { Album, CartaCompleta } from './album'
import { Mesa } from './mesa'
import { Memoria } from './memoria'
import { MonteFicha } from './monteFicha'
import { QuemSouEu } from './quemSouEu'
import { EncontreErro } from './encontreErro'
import { TelaComparar } from './comparar'
import { DesafioFinal, Revisao } from './sessao'

function Tela({ r }: { r: string[] }) {
  const [a, b, c] = r
  if (!a) return <Inicio />
  if (a === 'campanha' && b) return <TelaCampanha id={b} />
  if (a === 'bloco' && b && c === 'descobrir') return <Descobrir key={b} blocoId={b} />
  if (a === 'bloco' && b && c === 'memoria') return <Memoria key={b} blocoId={b} />
  if (a === 'bloco' && b && c === 'monte-ficha') return <MonteFicha key={b} blocoId={b} />
  if (a === 'bloco' && b && c === 'quem-sou-eu') return <QuemSouEu key={b} blocoId={b} />
  if (a === 'bloco' && b && c === 'encontre-erro') return <EncontreErro key={b} blocoId={b} />
  if (a === 'bloco' && b && c === 'desafio-final') return <DesafioFinal key={b} blocoId={b} />
  if (a === 'bloco' && b) return <TelaBloco id={b} />
  if (a === 'revisao') return <Revisao />
  if (a === 'comparar' && b) return <TelaComparar key={b} id={b} />
  if (a === 'album' && b) return <CartaCompleta key={b} id={b} />
  if (a === 'album') return <Album />
  if (a === 'mesa') return <Mesa />
  if (a === 'erros') return <TelaErros />
  if (a === 'ajustes') return <TelaAjustes />
  return <NaoEncontrado />
}

const NAV = [
  { r: '', rot: 'Início', ic: '⌂' },
  { r: 'campanha/fios', rot: 'Fios', ic: '〰' },
  { r: 'campanha/instrumentos', rot: 'Instrumentos', ic: '✂' },
  { r: 'album', rot: 'Álbum', ic: '▦' },
  { r: 'mesa', rot: 'Mesa', ic: '✚' },
  { r: 'erros', rot: 'Erros', ic: '!' },
  { r: 'ajustes', rot: 'Progresso', ic: '⚙' },
]

export default function App() {
  const r = useRota()
  const atual = r.join('/')
  const tema = usePrefs((p) => p.tema)
  useEffect(() => aplicarTema(tema), [tema])
  useAtalhos()
  return (
    <>
      <header className="topo">
        <a className="marca" href={href('')} aria-label="Início"><img src="./icon.svg" alt="" /><span className="marca-txt">BTCA</span></a>
        <nav aria-label="Principal">
          {NAV.map((n) => {
            const ativo = n.r === '' ? atual === '' : atual.startsWith(n.r)
            return (
              <a key={n.r} href={href(n.r)} className={ativo ? 'ativo' : ''} aria-current={ativo ? 'page' : undefined}>
                <span className="nav-ic" aria-hidden>{n.ic}</span><span className="nav-rot">{n.rot}</span>
              </a>
            )
          })}
        </nav>
      </header>
      {/* key: cada troca de tela reinicia a animação de entrada */}
      <main key={atual} className="entra"><Tela r={r} /></main>
    </>
  )
}
