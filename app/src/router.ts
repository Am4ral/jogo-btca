// Roteador mínimo por hash (funciona em qualquer hospedagem estática e offline).
import { useSyncExternalStore } from 'react'

const sub = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const get = () => window.location.hash.replace(/^#\/?/, '') || ''

export function useRota(): string[] {
  const h = useSyncExternalStore(sub, get, get)
  return h.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
}
export function useQuery(): URLSearchParams {
  const h = useSyncExternalStore(sub, get, get)
  return new URLSearchParams(h.split('?')[1] ?? '')
}
export const ir = (rota: string) => {
  window.location.hash = '/' + rota.replace(/^\//, '')
  window.scrollTo(0, 0)
}
export const href = (rota: string) => '#/' + rota.replace(/^\//, '')
