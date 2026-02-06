export interface TabConfig {
  href: string;
  label: string;
  pathMatch: string;
}

export const toolsTabs: readonly TabConfig[] = [
  { href: '/build', label: 'Build & Monitor', pathMatch: '/build' },
  { href: '/learn', label: 'Stats & Docs', pathMatch: '/learn' },
] as const;

export const chainsTabs: readonly TabConfig[] = [
  { href: '/chains/ecosystem', label: 'Navigator', pathMatch: '/chains/ecosystem' },
  { href: '/chains/metrics', label: 'Stats', pathMatch: '/chains/metrics' },
] as const;
