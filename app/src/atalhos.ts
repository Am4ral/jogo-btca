// Atalhos de teclado (Mac): 1–9 escolhem a opção visível correspondente; Enter aciona o botão principal.
import { useEffect } from 'react'

const visivel = (el: Element) => {
  const r = (el as HTMLElement).getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

export function useAtalhos() {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return
      // dentro de um diálogo aberto, os atalhos valem só para ele
      const raiz: ParentNode = document.querySelector('.modal') ?? document
      if (/^[1-9]$/.test(e.key)) {
        const opcoes = [...raiz.querySelectorAll('.opcao:not(:disabled), .candidato:not(:disabled)')].filter(visivel)
        const el = opcoes[Number(e.key) - 1] as HTMLElement | undefined
        if (el) { e.preventDefault(); el.click(); el.focus() }
        return
      }
      if (e.key === 'Enter' && (alvo === document.body || !alvo.matches('button, a'))) {
        const prim = [...raiz.querySelectorAll('.btn.primario:not(:disabled)')].filter(visivel).pop() as HTMLElement | undefined
        if (prim) { e.preventDefault(); prim.click() }
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])
}
