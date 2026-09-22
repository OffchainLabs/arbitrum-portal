import type { Config } from '@wagmi/core';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { isLifiTransfer } from '../app/api/crosschain-transfers/utils';
import { LifiTransferStarter } from '../token-bridge-sdk/LifiTransferStarter';
import type { SolanaTransferStarter } from '../token-bridge-sdk/SolanaTransferStarter';
import { addressesEqual } from '../util/AddressUtils';
import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import { createSolanaTransferStarter } from '../wallet/solana';
import { getEvmExecutionRuntime } from './evmExecutionRuntime';
import type { TransferWallet } from './executeTransfer';

type EvmResolution = {
  ecosystem: 'evm';
  starter: LifiTransferStarter;
  wagmiConfig: Config;
  assertSigningAccount: () => Promise<void>;
};

type SolanaResolution = {
  ecosystem: 'solana';
  starter: SolanaTransferStarter;
};

export type LifiTransferStarterResolution = EvmResolution | SolanaResolution;

export async function resolveLifiTransferStarter({
  route,
  wallet,
  sourceChainErc20Address,
  destinationChainErc20Address,
}: {
  route: LifiCrosschainTransfersRoute;
  wallet: TransferWallet;
  sourceChainErc20Address?: string;
  destinationChainErc20Address?: string;
}): Promise<LifiTransferStarterResolution> {
  const { fromChainId, toChainId } = route;
  if (!isLifiTransfer({ sourceChainId: fromChainId, destinationChainId: toChainId })) {
    throw new Error('LiFi execution is unavailable for this chain pair.');
  }
  if (!wallet.isConnected || !wallet.account.address) {
    throw new Error('The source wallet is not connected.');
  }
  if (route.fromAddress && !addressesEqual(route.fromAddress, wallet.account.address)) {
    throw new Error('The connected wallet does not match the account that requested this route.');
  }

  const sourceEcosystem = getWalletEcosystem(fromChainId);
  if (wallet.ecosystem !== sourceEcosystem) {
    throw new Error('The selected wallet does not match the source chain.');
  }

  switch (sourceEcosystem) {
    case 'evm': {
      const runtime = await getEvmExecutionRuntime({
        sourceChainId: fromChainId,
        destinationChainId: toChainId,
        expectedAccount: wallet.account.address,
      });
      return {
        ecosystem: 'evm',
        starter: new LifiTransferStarter({
          sourceChainProvider: runtime.sourceChainProvider,
          destinationChainProvider: runtime.destinationChainProvider,
          sourceChainErc20Address,
          destinationChainErc20Address,
          lifiRoute: route,
        }),
        wagmiConfig: runtime.wagmiConfig,
        assertSigningAccount: runtime.assertSigningAccount,
      };
    }
    case 'solana':
      if (!wallet.sendTransaction || !wallet.confirmTransaction) {
        throw new Error('The connected Solana wallet cannot execute transactions.');
      }
      return {
        ecosystem: 'solana',
        starter: createSolanaTransferStarter({ lifiRoute: route, wallet }),
      };
  }
}
