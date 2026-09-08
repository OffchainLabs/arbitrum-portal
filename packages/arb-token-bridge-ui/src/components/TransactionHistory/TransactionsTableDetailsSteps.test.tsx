import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { TransactionFailedOnNetwork } from './TransactionsTableDetailsSteps';

const sender = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('TransactionFailedOnNetwork', () => {
  it('offers settlement after 7 days for a native transfer to the sender without refund metadata', () => {
    const html = renderToStaticMarkup(
      <TransactionFailedOnNetwork
        networkName="Robinhood Chain"
        tx={{ assetType: AssetType.ETH, sender, destination: sender.toUpperCase() }}
      />,
    );

    expect(html).toContain(
      'You can retry now or wait for your funds to settle successfully on Robinhood Chain 7 days after your initial transaction.',
    );
    expect(html).not.toContain('lost forever');
  });

  it.each([
    { assetType: AssetType.ERC20, sender, destination: sender },
    { assetType: AssetType.ETH, sender, destination: '0x1111111111111111111111111111111111111111' },
    { assetType: AssetType.ETH, sender, destination: undefined },
    { assetType: AssetType.ETH, sender: undefined, destination: undefined },
  ])(
    'keeps the retry warning for $assetType with sender $sender and destination $destination',
    (tx) => {
      const html = renderToStaticMarkup(
        <TransactionFailedOnNetwork networkName="Robinhood Chain" tx={tx} />,
      );

      expect(html).toContain('lost forever');
      expect(html).not.toContain('settle successfully');
    },
  );
});
