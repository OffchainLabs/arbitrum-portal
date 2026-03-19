import { twMerge } from 'tailwind-merge';

export function PillButton({
  selected,
  disabled,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={twMerge(
        'px-3 py-0.5 text-xs font-medium rounded-full transition-colors border-0 cursor-pointer text-center',
        selected ? 'bg-white text-black' : 'text-white hover:bg-white/10',
        disabled ? 'opacity-60 cursor-default pointer-events-none' : '',
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
