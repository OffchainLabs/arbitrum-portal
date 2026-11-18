import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

describe.sequential('TransferPanel LiFi Integration - Default Token (3)', () => {
  setupTransferPanelLifiIntegrationSuite();

  // Ethereum -> Arbitrum One takes ~2 min alone, so it has its own file
  it.each(
    defaultTokenCases
      .slice(9)
      .filter((c) => !(c.sourceChain === 'ethereum' && c.destinationChain === 'arbitrum-one')),
  )(defaultTokenCaseTitle, assertDefaultTokenCase);
});
