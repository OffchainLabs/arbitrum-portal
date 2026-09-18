import { getAccount, getConnectorClient, switchChain } from '@wagmi/core';

import { getEvmWalletConfig } from '../services/evm/walletConfig';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { addressesEqual } from '../util/AddressUtils';
import { clientToSigner } from '../util/wagmi/useEthersSigner';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

export async function switchTransferNetwork(chainId: number) {
  if (getWalletEcosystem(chainId) !== 'evm')
    throw new Error('Transfer execution is unavailable for this ecosystem.');
  return switchChain(await getEvmWalletConfig(), { chainId });
}

export async function getEvmExecutionRuntime({
  sourceChainId,
  destinationChainId,
  expectedAccount,
}: {
  sourceChainId: number;
  destinationChainId: number;
  expectedAccount?: string;
}) {
  if (
    getWalletEcosystem(sourceChainId) !== 'evm' ||
    getWalletEcosystem(destinationChainId) !== 'evm'
  )
    throw new Error('Transfer execution is unavailable for this ecosystem.');
  const wagmiConfig = await getEvmWalletConfig();
  const assertSigningAccount = async () => {
    const account = getAccount(wagmiConfig);
    if (!account.address || (expectedAccount && !addressesEqual(account.address, expectedAccount)))
      throw new Error('The signing account changed. Review the transfer and try again.');
    if (account.chainId !== sourceChainId)
      throw new Error('The signing network changed. Review the transfer and try again.');
  };
  await assertSigningAccount();
  const client = await getConnectorClient(wagmiConfig, { chainId: sourceChainId });
  if (expectedAccount && !addressesEqual(client.account.address, expectedAccount))
    throw new Error('The signing account changed. Review the transfer and try again.');
  const signer = clientToSigner(client);
  return {
    wagmiConfig,
    signer,
    assertSigningAccount,
    sourceChainProvider: getProviderForChainId(sourceChainId),
    destinationChainProvider: getProviderForChainId(destinationChainId),
  };
}
