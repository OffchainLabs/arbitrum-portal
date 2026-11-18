import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

// Ethereum -> Arbitrum One lists every bridged token and takes ~2 min, so CI runs it alone
describe.sequential('TransferPanel LiFi Integration - Default Token (4)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(
    defaultTokenCases.filter(
      (c) => c.sourceChain === 'ethereum' && c.destinationChain === 'arbitrum-one',
    ),
  )(defaultTokenCaseTitle, assertDefaultTokenCase);
});
