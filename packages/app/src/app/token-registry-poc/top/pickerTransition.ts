import { flushSync } from 'react-dom';

let activeTransition: ViewTransition | undefined;
let transitionId = 0;

export function transitionPicker(update: () => void) {
  const id = ++transitionId;
  activeTransition?.skipTransition();
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update();
    return;
  }
  activeTransition = document.startViewTransition(() => {
    if (id === transitionId) flushSync(update);
  });
  void activeTransition.ready.catch(() => undefined);
  void activeTransition.finished.catch(() => undefined);
}
