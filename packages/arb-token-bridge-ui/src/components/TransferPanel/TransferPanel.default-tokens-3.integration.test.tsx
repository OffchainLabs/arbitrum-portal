import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

describe.sequential('TransferPanel LiFi Integration - Default Token (3)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases.slice(9))(defaultTokenCaseTitle, assertDefaultTokenCase);
});
