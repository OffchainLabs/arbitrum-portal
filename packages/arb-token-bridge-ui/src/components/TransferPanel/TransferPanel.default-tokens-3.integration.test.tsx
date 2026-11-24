import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
  isFullTokenListCase,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

describe.sequential('TransferPanel LiFi Integration - Default Token (3)', () => {
  setupTransferPanelLifiIntegrationSuite();

  // The Ethereum <-> Arbitrum One cases take up to ~2 min each, so they have their own files
  it.each(defaultTokenCases.slice(9).filter((c) => !isFullTokenListCase(c)))(
    defaultTokenCaseTitle,
    assertDefaultTokenCase,
  );
});
