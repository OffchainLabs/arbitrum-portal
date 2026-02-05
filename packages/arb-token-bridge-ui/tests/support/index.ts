import '@synthetixio/synpress/support';
import logCollector from 'cypress-terminal-report/src/installLogsCollector';

import './commands';
import { getL1NetworkConfig, getL2NetworkConfig, getL2TestnetNetworkConfig } from './common';

logCollector({
  collectTypes: ['cy:command', 'cy:log', 'cons:debug', 'cons:error', 'cons:info', 'cons:warn'],
});

Cypress.on('window:before:load', (win) => {
  (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((level) => {
    const original = win.console[level];
    win.console[level] = (...args: unknown[]) => {
      try {
        Cypress.log({
          name: `console.${level}`,
          message: args.map((arg) => {
            if (typeof arg === 'string') return arg;
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }),
        });
      } catch {
        // no-op
      }
      original.apply(win.console, args as []);
    };
  });
});

before(() => {
  // connect to sepolia to avoid connecting to localhost twice and failing
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'sepolia')
    .task('getNetworkSetupComplete')
    .then((complete) => {
      if (!complete) {
        // L1
        // only CI setup is required, Metamask already has localhost
        if (Cypress.env('ETH_RPC_URL') !== 'http://localhost:8545') {
          cy.addMetamaskNetwork(getL1NetworkConfig());
        }

        // L2
        cy.addMetamaskNetwork(getL2NetworkConfig());
        cy.addMetamaskNetwork(getL2TestnetNetworkConfig());

        cy.task('setNetworkSetupComplete');
      }
    });
});
