import { getL1NetworkName, getL2NetworkName } from '../../support/common';

describe('Switch Networks', () => {
  context('User is on test network L1', () => {
    it('should show L1 and L2 chains correctly', () => {
      cy.login({ networkType: 'parentChain' });
      cy.findSourceChainButton(getL1NetworkName());
      cy.findDestinationChainButton(getL2NetworkName());
    });

    it('should select another arbitrum chain from the network popup', () => {
      cy.login({ networkType: 'parentChain' });
      cy.findSourceChainButton(getL1NetworkName()).click();

      cy.findByText('Select Source Network').should('be.visible');
      cy.findByRole('button', { name: 'Switch to Nitro Testnode L3' }).should('be.visible').click();

      cy.findSourceChainButton('Nitro Testnode L3');
      cy.findDestinationChainButton('Nitro Testnode L2');
    });

    context(
      'User is connected to Ethereum, source chain is Ethereum and destination chain is Arbitrum',
      () => {
        it('should switch "from: Ethereum" to "from: Arbitrum" successfully', () => {
          cy.login({ networkType: 'parentChain' });
          cy.findSourceChainButton(getL1NetworkName());

          cy.findByRole('button', { name: /Switch Networks/i })
            .should('be.visible')
            .click();

          cy.findSourceChainButton(getL2NetworkName());
        });
      },
    );
  });
});
