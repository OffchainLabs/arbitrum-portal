import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, it, vi } from 'vitest';

import { Dialog, useDialog } from '../common/Dialog';
import { expectTokenPanelContent } from './TransferPanel.integration.helpers';

function TokenPanelHarness() {
  const [dialogProps, openDialog] = useDialog();

  return (
    <>
      <button onClick={() => openDialog()}>Select Destination Token</button>
      <Dialog {...dialogProps} title="Select Destination Token" isFooterHidden>
        Token panel contents
      </Dialog>
    </>
  );
}

describe.sequential('Token panel dialog assertions', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('waits for the exit transition when animation frames are delayed', async () => {
    // Headless UI waits for multiple frames before unmounting, even without CSS
    // animations in happy-dom. Simulate a busy integration-test worker.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 750),
    );
    vi.stubGlobal('cancelAnimationFrame', clearTimeout);

    render(<TokenPanelHarness />);

    await expectTokenPanelContent({ isDestination: true });
  });
});
