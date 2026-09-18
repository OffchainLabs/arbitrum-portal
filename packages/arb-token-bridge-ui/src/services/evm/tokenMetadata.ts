import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  fetchErc20Data,
  getL1ERC20Address,
  getL2ERC20Address,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC,
  isValidErc20,
} from '../../util/TokenUtils';
import { isNetwork } from '../../util/networks';

const commonUSDC: ERC20BridgeToken = {
  name: 'USD Coin',
  type: TokenType.ERC20,
  symbol: 'USDC',
  decimals: 6,
  listIds: new Set<string>(),
  address: '',
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};

export async function getUsdcToken({
  tokenAddress,
  parentChainId,
  childChainId,
}: {
  tokenAddress: string;
  parentChainId: number;
  childChainId: number;
}): Promise<ERC20BridgeToken | null> {
  const {
    isEthereumMainnet: isParentChainEthereumMainnet,
    isSepolia: isParentChainSepolia,
    isArbitrumOne: isParentChainArbitrumOne,
    isArbitrumSepolia: isParentChainArbitrumSepolia,
  } = isNetwork(parentChainId);

  const { isArbitrumOne: isChildArbitrumOne, isArbitrumSepolia: isChildArbitrumSepolia } =
    isNetwork(childChainId);

  // Ethereum Mainnet USDC
  if (isTokenMainnetUSDC(tokenAddress) && isParentChainEthereumMainnet && isChildArbitrumOne) {
    return {
      ...commonUSDC,
      address: CommonAddress.Ethereum.USDC,
      l2Address: CommonAddress.ArbitrumOne['USDC.e'],
    };
  }

  // Ethereum Sepolia USDC
  if (isTokenSepoliaUSDC(tokenAddress) && isParentChainSepolia && isChildArbitrumSepolia) {
    return {
      ...commonUSDC,
      address: CommonAddress.Sepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia['USDC.e'],
    };
  }

  // Arbitrum One USDC when Ethereum is the parent chain
  if (isTokenArbitrumOneNativeUSDC(tokenAddress) && isParentChainEthereumMainnet) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumOne.USDC,
      l2Address: CommonAddress.ArbitrumOne.USDC,
    };
  }

  // Arbitrum Sepolia USDC when Ethereum is the parent chain
  if (isTokenArbitrumSepoliaNativeUSDC(tokenAddress) && isParentChainSepolia) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumSepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia.USDC,
    };
  }

  // Arbitrum USDC with Orbit chains
  if (
    (isTokenArbitrumOneNativeUSDC(tokenAddress) && isParentChainArbitrumOne) ||
    (isTokenArbitrumSepoliaNativeUSDC(tokenAddress) && isParentChainArbitrumSepolia) ||
    (isTokenMainnetUSDC(tokenAddress) && isParentChainEthereumMainnet) ||
    (isTokenSepoliaUSDC(tokenAddress) && isParentChainSepolia)
  ) {
    let childChainUsdcAddress;
    try {
      childChainUsdcAddress = (
        await getL2ERC20Address({
          erc20L1Address: tokenAddress,
          l1Provider: getProviderForChainId(parentChainId),
          l2Provider: getProviderForChainId(childChainId),
        })
      ).toLowerCase();
    } catch {
      // could be never bridged before
    }

    return {
      ...commonUSDC,
      address: tokenAddress,
      l2Address: childChainUsdcAddress,
    };
  }

  return null;
}

export async function getTokenData(address: string, chainId: number) {
  return fetchErc20Data({ address, provider: getProviderForChainId(chainId) });
}
export async function getValidatedTokenData(address: string, chainId: number) {
  const params = { address, provider: getProviderForChainId(chainId) };
  if (!(await isValidErc20(params))) throw new Error(address + ' is not a valid ERC-20 token');
  return fetchErc20Data(params);
}
export async function getParentTokenAddress(address: string, chainId: number) {
  return getL1ERC20Address({ erc20L2Address: address, l2Provider: getProviderForChainId(chainId) });
}
