import { describe, it } from 'vitest';

import {
  assertDefaultTokenCase,
  defaultTokenCaseTitle,
  defaultTokenCases,
} from './TransferPanel.default-tokens.cases';
import { setupTransferPanelLifiIntegrationSuite } from './TransferPanel.integration.helpers';

describe.sequential('TransferPanel LiFi Integration - Default Token (2)', () => {
  setupTransferPanelLifiIntegrationSuite();

  it.each(defaultTokenCases.slice(3, 9))(defaultTokenCaseTitle, assertDefaultTokenCase);
});
