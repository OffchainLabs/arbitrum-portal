import { vi } from 'vitest';

vi.mock('next/font/local', () => ({
  default: vi.fn(() => ({
    style: {
      fontFamily: 'Roboto, sans-serif',
    },
  })),
}));

// Outside the Next router, usePathname has no context to read and returns null.
vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual<typeof import('next/navigation')>()),
  usePathname: vi.fn(() => '/'),
}));
