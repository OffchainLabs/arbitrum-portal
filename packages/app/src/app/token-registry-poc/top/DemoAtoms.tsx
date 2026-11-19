'use client';

import { useState } from 'react';

import { TopToken } from '@/app/src/token-registry/registryFiles';
import { ChainId } from '@/bridge/types/ChainId';
import { getBridgeUiConfigForChain } from '@/bridge/util/bridgeUiConfig';

export function Icon({
  name,
  size = 18,
}: {
  name:
    | 'back'
    | 'down'
    | 'swap'
    | 'close'
    | 'search'
    | 'settings'
    | 'clock'
    | 'check'
    | 'wallet'
    | 'copy'
    | 'external'
    | 'info'
    | 'gas'
    | 'user';
  size?: number;
}) {
  const paths = {
    back: 'M19 12H5m7-7-7 7 7 7',
    down: 'm6 9 6 6 6-6',
    swap: 'M8 3v16m-4-4 4 4 4-4M16 21V5m-4 4 4-4 4 4',
    close: 'm6 6 12 12M6 18 18 6',
    search: 'm21 21-5-5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
    settings:
      'M9.5 3h5l.7 2.2 2 .9 2.1-.5 2.5 4.3-1.5 1.7v2.3l1.5 1.7-2.5 4.3-2.1-.5-2 .9-.7 2.2h-5l-.7-2.2-2-.9-2.1.5-2.5-4.3 1.5-1.7v-2.3L2.2 9.9l2.5-4.3 2.1.5 2-.9.7-2.2ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    check: 'm5 12 4 4L19 6',
    wallet: 'M20 8V5H4v14h16V8Zm-4 3h6v5h-6v-5Z',
    copy: 'M9 9h12v12H9V9ZM15 5V3H3v12h2',
    external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
    info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    gas: 'M4 21V4h10v17M2 21h14M6 7h6m2 5h3v5a2 2 0 0 0 4 0V7l-3-3',
    user: 'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

// Chain logos sit on a white disc. Base's logo is white, so it sits on Base blue.
const CHAIN_IMAGE_BACKGROUNDS: Partial<Record<number, string>> = {
  [ChainId.Base]: '#0052ff',
};

export function ChainImage({ chainId, size = 24 }: { chainId: number; size?: number }) {
  return (
    <span
      className="chain-ic"
      style={{
        width: size,
        height: size,
        background: CHAIN_IMAGE_BACKGROUNDS[chainId] ?? '#fff',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getBridgeUiConfigForChain(chainId).network.logo}
        alt=""
        width={size}
        height={size}
      />
    </span>
  );
}

export function TokenImage({
  token,
  size = 40,
  badge = true,
}: {
  token: TopToken;
  size?: number;
  badge?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const badgeSize = Math.round(size * 0.44);
  return (
    <span className="tok" style={{ width: size, height: size }} aria-hidden="true">
      {token.logoURI && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="tok-img"
          src={token.logoURI}
          onError={() => setFailed(true)}
          alt=""
          width={size}
          height={size}
        />
      ) : (
        <span className="tok-mono" style={{ fontSize: Math.max(9, size * 0.34) }}>
          {token.symbol.slice(0, 3)}
        </span>
      )}
      {badge && (
        <span
          className="tok-badge"
          style={{ width: badgeSize, height: badgeSize, boxShadow: '0 0 0 2px var(--surface-2)' }}
        >
          <ChainImage chainId={token.chainId} size={badgeSize} />
        </span>
      )}
    </span>
  );
}

export function AllNetworks({ size = 24 }: { size?: number }) {
  return (
    <span className="allnet-ic" style={{ width: size, height: size }} aria-hidden="true">
      {['#325ee6', '#12aaff', '#94d08e', '#e8b959'].map((color) => (
        <i key={color} style={{ background: color }} />
      ))}
    </span>
  );
}
export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}
export function usd(amount: number | undefined) {
  return amount === undefined || !Number.isFinite(amount)
    ? '—'
    : amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      });
}
export function quantity(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { maximumFractionDigits: n > 1 ? 4 : 8 })
    : '—';
}
export function duration(ms: number | undefined) {
  return ms === undefined
    ? 'Estimating'
    : ms >= 86400000
      ? `~${Math.ceil(ms / 86400000)} days`
      : ms >= 60000
        ? `~${Math.ceil(ms / 60000)} min`
        : `~${Math.ceil(ms / 1000)} sec`;
}
export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
