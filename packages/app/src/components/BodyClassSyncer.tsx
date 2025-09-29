'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import { useEffect } from 'react';

export function BodyClassSyncer() {
  const segments = useSelectedLayoutSegments();
  /**
   * To avoid override of CSS, we scope tailwind CSS with id.
   * We need class to be on body rather than layout wrapper because of portal.
   */
  useEffect(() => {
    const isBridgeRoute = segments.includes('bridge');
    document.body.classList.add(isBridgeRoute ? 'bridge-wrapper' : 'portal-wrapper');

    return () => {
      document.body.classList.remove('bridge-wrapper', 'portal-wrapper');
    };
  }, [segments]);

  return null;
}
