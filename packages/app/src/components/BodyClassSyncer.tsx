'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function BodyClassSyncer() {
  const pathname = usePathname()
  /**
   * To avoid override of CSS, we scope tailwind CSS with id.
   * We need class to be on body rather than layout wrapper because of portal.
   */
  useEffect(() => {
    document.body.classList.add(
      pathname.includes('bridge') ? 'bridge-wrapper' : 'portal-wrapper'
    )

    return () => {
      document.body.classList.remove('bridge-wrapper', 'portal-wrapper')
    }
  }, [pathname])

  return null
}
