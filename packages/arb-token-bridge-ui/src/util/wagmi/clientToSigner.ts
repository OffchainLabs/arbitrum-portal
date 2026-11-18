// from https://github.com/wevm/wagmi/blob/651aa72827a79f38a89f5a64209592816c8e6492/site/react/guides/ethers.md#connector-client--signer
import { providers } from 'ethers';
import type { Account, Chain, Client, Transport } from 'viem';

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}
