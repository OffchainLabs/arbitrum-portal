import type { Chain } from 'viem';

import { NOVA_EXPLORER_URL } from '@/common/constants';

import { ether } from '../../constants';
import { ChainId } from '../../types/ChainId';
import { getBridgeUiConfigForChain } from '../bridgeUiConfig';
import { getChainMetadata, toChainMetadata } from '../networkMetadata';
import { ChainWithRpcUrl, explorerUrls, rpcURLs } from '../networks';

function getWalletChainMetadata(chainId: number) {
  const { id, name, nativeCurrency } = getChainMetadata(chainId);
  return { id, name, nativeCurrency };
}

export function chainToWagmiChain(chain: ChainWithRpcUrl): Chain {
  const metadata = toChainMetadata({
    ...chain,
    nativeTokenData: undefined,
    bridgeUiConfig:
      chain.chainId === ChainId.L3Local && !chain.nativeToken
        ? undefined
        : getBridgeUiConfigForChain(chain.chainId),
  });
  // Keep the wallet's existing unset testnet flag; pure metadata retains it.
  const { testnet: _testnet, ...walletChain } = metadata;
  return walletChain;
}

const sepoliaDefault = getChainMetadata(ChainId.Sepolia);

export const sepolia: Chain = {
  ...sepoliaDefault,
  rpcUrls: {
    ...sepoliaDefault.rpcUrls,
    // override the default public RPC with the Infura RPC
    // public RPCs are getting rate limited
    default: {
      http: [rpcURLs[ChainId.Sepolia]!],
    },
  },
};

export const arbitrumSepolia: Chain = {
  ...getWalletChainMetadata(ChainId.ArbitrumSepolia),
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumSepolia]!],
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumSepolia]!],
    },
  },
  blockExplorers: {
    etherscan: {
      name: 'Arbiscan',
      url: explorerUrls[ChainId.ArbitrumSepolia]!,
    },
    default: { name: 'Arbiscan', url: explorerUrls[ChainId.ArbitrumSepolia]! },
  },
};

export const baseSepolia: Chain = {
  ...getWalletChainMetadata(ChainId.BaseSepolia),
  nativeCurrency: ether,
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.BaseSepolia]!],
    },
    public: {
      http: [rpcURLs[ChainId.BaseSepolia]!],
    },
  },
  blockExplorers: {
    etherscan: {
      name: 'Basescan',
      url: explorerUrls[ChainId.BaseSepolia]!,
    },
    default: { name: 'Basescan', url: explorerUrls[ChainId.BaseSepolia]! },
  },
};

export const arbitrumNova: Chain = {
  ...getWalletChainMetadata(ChainId.ArbitrumNova),
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumNova]!],
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumNova]!],
    },
  },
  blockExplorers: {
    etherscan: { name: 'Arbiscan', url: NOVA_EXPLORER_URL },
    default: { name: 'Arbiscan', url: NOVA_EXPLORER_URL },
  },
};

export const base: Chain = {
  ...getWalletChainMetadata(ChainId.Base),
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.Base]!],
    },
    public: {
      http: [rpcURLs[ChainId.Base]!],
    },
  },
  blockExplorers: {
    etherscan: { name: 'Basescan', url: explorerUrls[ChainId.Base]! },
    default: { name: 'Basescan', url: explorerUrls[ChainId.Base]! },
  },
};

/**
 * For e2e testing
 */
export const localL1Network: Chain = {
  ...getWalletChainMetadata(ChainId.Local),
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.Local]!],
    },
    public: {
      http: [rpcURLs[ChainId.Local]!],
    },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: '' },
  },
};

/**
 * For e2e testing
 */
export const localL2Network: Chain = {
  ...getWalletChainMetadata(ChainId.ArbitrumLocal),
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.ArbitrumLocal]!],
    },
    public: {
      http: [rpcURLs[ChainId.ArbitrumLocal]!],
    },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://etherscan.io' },
  },
};

/**
 * For e2e testing
 */
export const localL3Network: Chain = {
  ...getWalletChainMetadata(ChainId.L3Local),
  rpcUrls: {
    default: {
      http: [rpcURLs[ChainId.L3Local]!],
    },
    public: {
      http: [rpcURLs[ChainId.L3Local]!],
    },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://etherscan.io' },
  },
};
