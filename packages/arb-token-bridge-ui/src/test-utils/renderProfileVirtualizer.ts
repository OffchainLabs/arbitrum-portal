// The integration setup mocks react-virtualized's List with one that renders every row with a new
// style object, which would add offscreen rows and their re-renders to the profile. The profile
// keeps the real List, which only renders the rows in view, and only mocks AutoSizer, which reads
// its size from the DOM. Loaded after the integration setup, so this mock replaces its own.
import type { ReactNode } from 'react';
import { vi } from 'vitest';

vi.mock('react-virtualized', async (importActual) => ({
  ...(await importActual<typeof import('react-virtualized')>()),
  AutoSizer: ({ children }: { children: (size: { width: number; height: number }) => ReactNode }) =>
    children({ width: 500, height: 700 }),
}));
