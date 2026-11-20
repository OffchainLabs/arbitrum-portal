import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
  isFullTokenListCase,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

// Ethereum -> Arbitrum One lists every bridged token and takes up to ~2 min, so CI runs it alone
describe.sequential('TransferPanel LiFi Integration - Default Token (4)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases.filter((c) => isFullTokenListCase(c) && c.sourceChain === 'ethereum'))(
    defaultTokenCaseTitle,
    assertDefaultTokenCase,
    240_000,
  );
});
