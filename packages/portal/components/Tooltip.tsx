import Tippy from '@tippyjs/react';

export type TooltipProps = {
  show?: boolean;
  children: React.ReactNode;
  content?: React.ReactNode;
};

export function Tooltip({
  show = true,
  content,
  children,
}: TooltipProps): JSX.Element {
  if (!show) {
    return <>{children}</>;
  }

  return (
    <Tippy
      className="rounded-lg bg-black px-8 py-4 text-sm leading-6 shadow-tooltip"
      content={content}
      placement="bottom"
      duration={[200, 50]}
      interactive={true}
      appendTo={() => document.body}
    >
      <div>{children}</div>
    </Tippy>
  );
}
