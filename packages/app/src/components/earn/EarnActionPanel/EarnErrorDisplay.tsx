interface EarnErrorDisplayProps {
  error: string | null | undefined;
}

export function EarnErrorDisplay({ error }: EarnErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="p-3 bg-red-900/50 border border-red-400 rounded-lg">
      <p className="text-red-400 text-xs">{error}</p>
    </div>
  );
}
