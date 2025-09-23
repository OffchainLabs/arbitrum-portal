import { twMerge } from 'tailwind-merge';

export const OrbitStatusBadge = ({ status }: { status: string | null }) => {
  if (!status || status.length === 0) {
    status = 'In Development';
  }

  const isMainnet = status.toLowerCase() === 'mainnet';
  const isTestnet = status.toLowerCase() === 'testnet';

  return (
    <span
      className={twMerge(
        'inline-flex items-start justify-start gap-2 break-words rounded px-1.5 py-0.5 text-xs font-normal capitalize text-white',
        isMainnet && 'bg-blue',
        isTestnet && 'border border-blue',
        !isMainnet && !isTestnet && 'border border-dashed border-blue',
      )}
    >
      {status}
    </span>
  );
};
