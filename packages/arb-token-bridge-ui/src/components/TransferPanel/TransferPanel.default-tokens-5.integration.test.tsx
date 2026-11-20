import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
  isFullTokenListCase,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

// Arbitrum One -> Ethereum lists every bridged token and takes up to ~2 min, so CI runs it alone
describe.sequential('TransferPanel LiFi Integration - Default Token (5)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(
    defaultTokenCases.filter((c) => isFullTokenListCase(c) && c.sourceChain === 'arbitrum-one'),
  )(defaultTokenCaseTitle, assertDefaultTokenCase, 240_000);
});
