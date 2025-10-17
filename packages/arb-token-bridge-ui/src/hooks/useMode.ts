import { usePathname } from 'next/navigation';

import { PathnameEnum } from '../constants';

export function useMode() {
  const pathname = usePathname();
  const embedMode = pathname.startsWith(PathnameEnum.EMBED);

  return { embedMode };
}
