describe('Deposit USDC through CCTP', () => {
  it('should claim deposit', () => {
    cy.login({ networkType: 'parentChain', networkName: 'Sepolia' });
    cy.claimCctp(0.00014, { accept: false });
    cy.claimCctp(0.00015, { accept: false });
  });
});
