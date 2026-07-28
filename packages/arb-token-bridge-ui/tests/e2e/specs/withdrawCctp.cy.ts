describe('Withdraw USDC through CCTP', () => {
  it('should claim deposit', () => {
    cy.login({ networkType: 'childChain', networkName: 'Arbitrum Sepolia' });
    cy.changeMetamaskNetwork('Sepolia');
    cy.claimCctp(0.00012, { accept: true });
    cy.claimCctp(0.00013, { accept: true });
  });
});
