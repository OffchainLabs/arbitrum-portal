import { synpressCommandsForMetaMask } from '@synthetixio/synpress/cypress/support';
import logCollector from 'cypress-terminal-report/src/installLogsCollector';

import './commands';
import { getL1NetworkConfig, getL2NetworkConfig, getL2TestnetNetworkConfig } from './common';

Cypress.on('uncaught:exception', () => false);

logCollector({
  collectTypes: ['cy:command', 'cy:log', 'cons:debug', 'cons:error', 'cons:info', 'cons:warn'],
});

synpressCommandsForMetaMask();

before(() => {
  cy.importWalletFromPrivateKey(Cypress.env('PRIVATE_KEY'));
  cy.switchNetwork({ networkName: 'Sepolia', isTestnet: true });

  cy.task('getNetworkSetupComplete').then((complete) => {
    if (!complete) {
      // L1
      if (Cypress.env('ETH_RPC_URL') !== 'http://localhost:8545') {
        cy.addNetwork(getL1NetworkConfig());
      }

      // L2
      cy.addNetwork(getL2NetworkConfig());
      cy.addNetwork(getL2TestnetNetworkConfig());

      cy.task('setNetworkSetupComplete');
    }
  });
});
