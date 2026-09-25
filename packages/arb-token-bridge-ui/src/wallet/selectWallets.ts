export function selectWallets<Ecosystem extends string, Wallet>({
  wallets,
  sourceChainId,
  destinationChainId,
  getEcosystem,
}: {
  wallets: Record<Ecosystem, Wallet>;
  sourceChainId: number;
  destinationChainId: number;
  getEcosystem: (chainId: number) => Ecosystem;
}) {
  const sourceWallet = wallets[getEcosystem(sourceChainId)];
  const destinationWallet = wallets[getEcosystem(destinationChainId)];
  if (!sourceWallet || !destinationWallet) {
    throw new Error('Wallet is not registered for a selected chain.');
  }
  return { sourceWallet, destinationWallet };
}
