/*
 * Playwright port of tests/support/common.ts.
 *
 * The original is Cypress-shaped: it reads `Cypress.env(...)` and registers `cy.task`s. This
 * version takes an explicit `E2EConfig` object (provided by the `e2eEnv` fixture) and exposes
 * the same network helpers plus the node-side funding/balance helpers used by globalSetup.
 */
import { EthBridger, MultiCaller } from '@arbitrum/sdk';
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Wallet } from 'ethers';

import { MULTICALL_TESTNET_ADDRESS } from '../../../../src/constants';
import {
  defaultL2Network,
  defaultL3CustomGasTokenNetwork,
  defaultL3Network,
} from '../../../../src/util/networksNitroTestnode';
import { type E2EConfig } from '../e2eConfig';

export type NetworkType = 'parentChain' | 'childChain';
export type NetworkName =
  | 'Nitro Testnode L1'
  | 'Nitro Testnode L2'
  | 'Nitro Testnode L3'
  | 'Arbitrum Sepolia'
  | 'Ethereum'
  | 'Sepolia';

export type NetworkConfig = {
  networkName: NetworkName;
  rpcUrl: string;
  chainId: number;
  symbol: string;
  isTestnet: boolean;
  multiCall: string;
};

export const getL1NetworkName = (cfg: E2EConfig) => getL1NetworkConfig(cfg).networkName;
export const getL2NetworkName = (cfg: E2EConfig) => getL2NetworkConfig(cfg).networkName;

export const getL1NetworkConfig = (cfg: E2EConfig): NetworkConfig => {
  const isOrbitTest = cfg.ORBIT_TEST === '1';

  return {
    networkName: isOrbitTest ? 'Nitro Testnode L2' : 'Nitro Testnode L1',
    rpcUrl: cfg.ETH_RPC_URL,
    chainId: isOrbitTest ? 412346 : 1337,
    symbol: 'ETH',
    isTestnet: true,
    multiCall: isOrbitTest
      ? defaultL2Network.tokenBridge!.childMultiCall
      : defaultL2Network.tokenBridge!.parentMultiCall,
  };
};

export const getL2NetworkConfig = (cfg: E2EConfig): NetworkConfig => {
  const isOrbitTest = cfg.ORBIT_TEST === '1';
  const nativeTokenSymbol = cfg.NATIVE_TOKEN_SYMBOL ?? 'ETH';
  const isCustomFeeToken = nativeTokenSymbol !== 'ETH';

  const l3Network = isCustomFeeToken ? defaultL3CustomGasTokenNetwork : defaultL3Network;

  return {
    networkName: isOrbitTest ? 'Nitro Testnode L3' : 'Nitro Testnode L2',
    rpcUrl: cfg.ARB_RPC_URL,
    chainId: isOrbitTest ? 333333 : 412346,
    symbol: nativeTokenSymbol,
    isTestnet: true,
    multiCall: isOrbitTest
      ? l3Network.tokenBridge!.childMultiCall
      : defaultL2Network.tokenBridge!.childMultiCall,
  };
};

export const getL1TestnetNetworkConfig = (cfg: E2EConfig): NetworkConfig => {
  return {
    networkName: 'Sepolia',
    rpcUrl: cfg.ETH_SEPOLIA_RPC_URL,
    chainId: 11155111,
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS,
  };
};

export const getL2TestnetNetworkConfig = (cfg: E2EConfig): NetworkConfig => {
  return {
    networkName: 'Arbitrum Sepolia',
    rpcUrl: cfg.ARB_SEPOLIA_RPC_URL,
    chainId: 421614,
    symbol: 'ETH',
    isTestnet: true,
    multiCall: MULTICALL_TESTNET_ADDRESS,
  };
};

export const ERC20TokenName = 'Test Arbitrum Token';
export const ERC20TokenSymbol = 'TESTARB';
export const ERC20TokenDecimals = 18;

export function getZeroToLessThanOneToken(symbol: string) {
  return new RegExp(`0(\\.\\d+)* ${symbol}`);
}

export async function getInitialETHBalance(
  rpcURL: string,
  walletAddress: string,
): Promise<BigNumber> {
  const provider = new StaticJsonRpcProvider(rpcURL);
  return await provider.getBalance(walletAddress);
}

export async function getInitialERC20Balance({
  tokenAddress,
  multiCallerAddress,
  rpcURL,
  address,
}: {
  tokenAddress: string;
  multiCallerAddress: string;
  rpcURL: string;
  address: string;
}): Promise<BigNumber | undefined> {
  const provider = new StaticJsonRpcProvider(rpcURL);
  const multiCaller = new MultiCaller(provider, multiCallerAddress);
  const [tokenData] = await multiCaller.getTokenData([tokenAddress], {
    balanceOf: { account: address },
  });
  return tokenData?.balance;
}

export const wait = (ms = 0): Promise<void> => {
  return new Promise((res) => setTimeout(res, ms));
};

export async function fundEth({
  address, // wallet address where funding is required
  provider,
  sourceWallet, // source wallet that will fund the `address`
  networkType,
  amount,
}: {
  address: string;
  provider: Provider;
  sourceWallet: Wallet;
  networkType: NetworkType;
  amount: BigNumber;
}) {
  console.log(`Funding ETH ${address} on ${networkType}...`);
  const balance = await provider.getBalance(address);
  // Fund only if the balance is less than the requested amount
  if (balance.lt(amount)) {
    const tx = await sourceWallet.connect(provider).sendTransaction({
      to: address,
      value: amount,
    });
    await tx.wait();
  }
}

export async function getNativeTokenDecimals({
  parentProvider,
  childProvider,
}: {
  parentProvider: Provider;
  childProvider: Provider;
}) {
  const multiCaller = await MultiCaller.fromProvider(parentProvider);
  const ethBridger = await EthBridger.fromProvider(childProvider);
  const isCustomFeeToken = typeof ethBridger.nativeToken !== 'undefined';

  const nativeToken = isCustomFeeToken
    ? (
        await multiCaller.getTokenData([ethBridger.nativeToken!], {
          decimals: true,
        })
      )[0]
    : undefined;

  return nativeToken?.decimals ?? 18;
}
