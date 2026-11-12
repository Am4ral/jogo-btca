// Componentes visuais compartilhados.
import { useEffect, useState, type ReactNode } from 'react'
import {
  type Item, type Attr, type Imagem, ROTULO, TERMO_DO_CAMPO, GRUPO, fmtValor, isAttr, termo, imgUrl, fotoPrincipal, item as getItem, nomeCurto,
} from './content'
import { useProgresso, nivel, NIVEIS } from './store'
import { href } from './router'

// ---------- Modal ----------
export function Modal({ aberto, fechar, titulo, children, largo }: { aberto: boolean; fechar: () => void; titulo?: string; children: ReactNode; largo?: boolean }) {
  useEffect(() => {
    if (!aberto) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [aberto, fechar])
  if (!aberto) return null
  return (
    <div className="modal-fundo" onClick={fechar}>
      <div className={`modal ${largo ? 'largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          {titulo && <h3>{titulo}</h3>}
          <button className="btn-icone" onClick={fechar} aria-label="Fechar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Termo explicável ----------
export function Termo({ id, children }: { id: string; children?: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const t = termo(id)
  const ver = useProgresso((s) => s.verTermo)
  if (!t) return <>{children}</>
  return (
    <>
      <button className="termo" onClick={() => { setAberto(true); ver(id) }} title="Toque para ver a explicação">
        {children ?? t.termo}
      </button>
      <Modal aberto={aberto} fechar={() => setAberto(false)} titulo={t.termo}>
        <p>{t.definicao}</p>
        <p className="destaque"><b>Na prática:</b> {t.consequencia}</p>
        {t.nota && <p className="alerta">{t.nota}</p>}
        <p className="fonte">Fonte: {t.f.join(', ')}</p>
      </Modal>
    </>
  )
}

// ---------- Foto com zoom ----------
export function Foto({ img, alt, className = '', zoom = true }: { img?: Imagem; alt: string; className?: string; zoom?: boolean }) {
  const [aberto, setAberto] = useState(false)
  if (!img) return <div className={`foto sem-foto ${className}`}><span>Sem foto no material</span></div>
  return (
    <>
      <button className={`foto q-${img.qualidade} ${className}`} onClick={() => zoom && setAberto(true)} aria-label={`Ampliar foto: ${alt}`} disabled={!zoom}>
        <img src={imgUrl(img.src)} alt={alt} loading="lazy" draggable={false} />
        {img.qualidade === 'insuficiente' && <span className="selo-foto">foto ruim</span>}
      </button>
      {zoom && (
        <Modal aberto={aberto} fechar={() => setAberto(false)} titulo={alt} largo>
          <ZoomImg src={imgUrl(img.src)} alt={alt} />
          <p className="fonte">Qualidade: {img.qualidade} · {img.fonte}{img.nota ? ` · ${img.nota}` : ''}</p>
        </Modal>
      )}
    </>
  )
}

/** Imagem ampliável: toque/clique alterna 1× ↔ 2,5× no ponto tocado. */
export function ZoomImg({ src, alt }: { src: string; alt: string }) {
  const [z, setZ] = useState<{ x: number; y: number } | null>(null)
  return (
    <div
      className={`zoom-img ${z ? 'ativo' : ''}`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setZ(z ? null : { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
      }}
    >
      <img src={src} alt={alt} draggable={false} style={z ? { transform: 'scale(2.5)', transformOrigin: `${z.x}% ${z.y}%` } : undefined} />
      <span className="dica">{z ? 'Toque para reduzir' : 'Toque para ampliar'}</span>
    </div>
  )
}

// ---------- Ficha didática ----------
const CAMPOS_FIO = ['origem', 'composicao', 'absorcao', 'mecanismoAbsorcao', 'tempoAbsorcao', 'resistenciaTensil', 'estrutura', 'reacaoTecidual', 'capilaridade', 'memoria', 'manuseio', 'segurancaNo', 'indicacoes', 'limitacoes']
const CAMPOS_INSTR = ['grupo', 'funcao', 'afastadorTipo', 'estrutura', 'ponta', 'dentes', 'serrilha', 'versoes', 'traumatico', 'cabo', 'usos']

function Situacao({ a }: { a: Attr }) {
  const [aberto, setAberto] = useState(false)
  if (a.s === 'material' && !a.nota) return null
  const rot = { material: 'nota', externa: 'fonte externa', divergente: 'divergência', lacuna: 'lacuna' }[a.s]
  return (
    <>
      <button className={`sit sit-${a.s}`} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>{rot}</button>
      {aberto && (
        <div className="sit-nota">
          {a.nota ?? (a.s === 'externa' ? 'Não consta nos materiais da disciplina; valor de referência técnica, a conferir.' : '')}
          <div className="fonte">Fonte: {a.f.length ? a.f.join(', ') : '—'}</div>
        </div>
      )}
    </>
  )
}

export function Ficha({ it, compacta = false }: { it: Item; compacta?: boolean }) {
  const campos = it.tipo === 'fio' ? CAMPOS_FIO : CAMPOS_INSTR
  const rec = it as unknown as Record<string, unknown>
  const fotos = it.imagens
  return (
    <div className="ficha">
      <div className="ficha-cabeca">
        <div>
          <h2>{it.nome}</h2>
          <p className="sub">
            {it.tipo === 'fio' ? it.comerciais.join(' · ') : it.sinonimos.join(' · ')}
            {it.tipo === 'instr' && <span className={`chip g-${it.grupo.v}`}>{GRUPO[it.grupo.v]}</span>}
            {it.tipo === 'fio' && <span className={`chip ${it.absorcao.v === 'absorvivel' ? 'f-abs' : 'f-inabs'}`}>{fmtValor(it.absorcao)}</span>}
          </p>
        </div>
      </div>
      {[it.alerta, it.alertaMaterial, it.alertaVisual].filter(Boolean).map((a) => <p key={a} className="alerta">{a}</p>)}
      {fotos.length > 0 ? (
        <div className="ficha-fotos">
          {fotos.map((im) => <Foto key={im.src} img={im} alt={it.nome} />)}
        </div>
      ) : (
        <p className="alerta">Não há fotografia deste item nos materiais. Por isso ele não será cobrado por reconhecimento visual.</p>
      )}
      <dl className={`atributos ${compacta ? 'compacta' : ''}`}>
        {campos.map((k) => {
          const a = rec[k]
          if (!isAttr(a)) return null
          if (a.s === 'lacuna' && compacta) return null
          const t = it.tipo === 'instr' && k === 'estrutura' ? undefined : TERMO_DO_CAMPO[k]
          return (
            <div key={k} className={`attr s-${a.s}`}>
              <dt>{t ? <Termo id={t}>{ROTULO[k]}</Termo> : ROTULO[k]}</dt>
              <dd>
                {fmtValor(a)}
                {a.extra && <span className="extra"> · {a.extra.join('; ')}</span>}
                <Situacao a={a} />
              </dd>
            </div>
          )
        })}
      </dl>
      <div className="diferencial">
        <b>{it.tipo === 'instr' ? 'Como reconhecer' : 'O que o diferencia'}:</b> {it.tipo === 'instr' ? it.reconhecimento : it.diferencial}
      </div>
      {it.confundeCom.length > 0 && (
        <p className="confunde">
          <b>Não confundir com:</b>{' '}
          {it.confundeCom.map((c, n) => (
            <span key={c}>{n > 0 && ', '}<a href={href(`album/${c}`)}>{nomeCurto(getItem(c))}</a></span>
          ))}
        </p>
      )}
    </div>
  )
}

// ---------- Carta do álbum (miniatura) ----------
export function Carta({ it }: { it: Item }) {
  const p = useProgresso((s) => s.itens[it.id])
  const n = nivel(p)
  const bloqueada = n === 0
  const foto = fotoPrincipal(it)
  return (
    <a className={`carta ${bloqueada ? 'bloqueada' : ''} ${it.tipo === 'instr' ? 'g-' + it.grupo.v : it.absorcao.v === 'absorvivel' ? 'f-abs' : 'f-inabs'}`} href={href(`album/${it.id}`)}>
      <div className="carta-foto">
        {foto ? <img src={imgUrl(foto.src)} alt="" loading="lazy" draggable={false} /> : <span className="sem">sem foto</span>}
      </div>
      <div className="carta-nome">{bloqueada ? '???' : nomeCurto(it)}</div>
      <div className="carta-nivel" title={NIVEIS[n]}>
        {[1, 2, 3, 4, 5].map((k) => <span key={k} className={k <= n ? 'on' : ''} />)}
      </div>
    </a>
  )
}

export function Barra({ valor, total, rotulo }: { valor: number; total: number; rotulo?: string }) {
  const pct = total ? Math.round((valor / total) * 100) : 0
  return (
    <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}
