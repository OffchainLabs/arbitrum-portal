import { synpressCommandsForMetaMask } from '@synthetixio/synpress/cypress/support';
import logCollector from 'cypress-terminal-report/src/installLogsCollector';

import './commands';
import { getL1NetworkConfig, getL2NetworkConfig, getL2TestnetNetworkConfig } from './common';

function toSynpressNetwork({
  networkName,
  rpcUrl,
  chainId,
  symbol,
}: ReturnType<typeof getL1NetworkConfig>) {
  return {
    name: networkName,
    rpcUrl,
    chainId,
    symbol,
  };
}

logCollector({
  collectTypes: ['cy:command', 'cy:log', 'cons:debug', 'cons:error', 'cons:info', 'cons:warn'],
});

synpressCommandsForMetaMask();

before(() => {
  cy.importWalletFromPrivateKey(Cypress.env('PRIVATE_KEY'));
  cy.switchNetwork('Sepolia', true);

  cy.task('getNetworkSetupComplete').then((complete) => {
    if (!complete) {
      // L1
      if (Cypress.env('ETH_RPC_URL') !== 'http://localhost:8545') {
        cy.addNetwork(toSynpressNetwork(getL1NetworkConfig()));
      }

      // L2
      cy.addNetwork(toSynpressNetwork(getL2NetworkConfig()));
      cy.addNetwork(toSynpressNetwork(getL2TestnetNetworkConfig()));

      cy.task('setNetworkSetupComplete');
    }
  });
});
