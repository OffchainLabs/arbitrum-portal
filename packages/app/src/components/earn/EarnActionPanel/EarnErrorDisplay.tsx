interface EarnErrorDisplayProps {
  error: string | null | undefined;
}

export function EarnErrorDisplay({ error }: EarnErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="rounded border border-red-400 bg-red-900/50 p-3">
      <p className="text-xs text-red-400">{error}</p>
    </div>
  );
}
