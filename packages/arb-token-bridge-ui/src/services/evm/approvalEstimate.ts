import { getEvmWalletConfig } from './walletConfig';

export async function fetchNativeApprovalGas({
  parentChainId,
  ...params
}: {
  sourceChainId: number;
  destinationChainId: number;
  parentChainId: number;
  sourceChainErc20Address?: string;
  destinationChainErc20Address?: string;
}) {
  const [{ getConnectorClient }, { clientToSigner }, { BridgeTransferStarterFactory }] =
    await Promise.all([
      import('@wagmi/core'),
      import('../../util/wagmi/useEthersSigner'),
      import('../../token-bridge-sdk/BridgeTransferStarterFactory'),
    ]);
  const config = await getEvmWalletConfig();
  const client = await getConnectorClient(config, { chainId: parentChainId });
  return BridgeTransferStarterFactory.create(params).approveNativeCurrencyEstimateGas({
    signer: clientToSigner(client),
  });
}
