import { usePathname } from 'next/navigation'

export function useMode() {
  const pathname = usePathname()
  const embedMode = pathname === '/bridge/embed'

  return { embedMode }
}
