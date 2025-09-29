import { usePathname } from 'next/navigation'
import { BUY_EMBED_PATHNAME, EMBED_PATHNAME } from '../constants'

export function useMode() {
  const pathname = usePathname()
  const embedMode =
    pathname === EMBED_PATHNAME || pathname === BUY_EMBED_PATHNAME

  return { embedMode, pathname }
}
