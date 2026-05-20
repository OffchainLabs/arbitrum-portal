import { sanitizeEarnError } from '@/app-lib/earn/errorUtils';

interface EarnErrorDisplayProps {
  error: unknown;
}

export function EarnErrorDisplay({ error }: EarnErrorDisplayProps) {
  const message = sanitizeEarnError(error);
  if (!message) return null;

  return (
    <div className="p-3 bg-red-900/50 border border-red-400 rounded">
      <p className="text-red-400 text-xs">{message}</p>
    </div>
  );
}
