import { usePathname } from 'next/navigation';

import { PathnameEnum } from '../constants';

export function useMode() {
  const pathname = usePathname();
  const embedMode = pathname === PathnameEnum.EMBED || pathname === PathnameEnum.EMBED_BUY;

  return { embedMode };
}
