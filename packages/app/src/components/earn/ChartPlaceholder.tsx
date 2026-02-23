export function ChartPlaceholder({ label = 'Chart' }: { label?: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded border border-white/10 bg-white/5">
      <p className="text-sm text-white/50">{label} coming soon</p>
    </div>
  );
}
