'use client';

import { Bars3Icon } from '@heroicons/react/24/outline';
import { useState } from 'react';

// MobileHeaderToggleMenu - Placeholder for mobile navigation
// TODO: Replace with proper mobile navigation in Phase 2 (mobile responsiveness)
export const MobileHeaderToggleMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center justify-center rounded-lg border border-gray-8 bg-gray-8 p-2 text-white transition-colors hover:bg-gray-8/80"
      aria-label="Toggle mobile menu"
    >
      <Bars3Icon className="h-6 w-6" />
      {/* Mobile menu content will be implemented in Phase 2 */}
    </button>
  );
};
