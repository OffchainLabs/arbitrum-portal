/*
 * Playwright port of tests/support/common.ts.
 *
 * The original is Cypress-shaped: it reads `Cypress.env(...)` and registers `cy.task`s. This
 * version takes an explicit `E2EConfig` object (provided by the `e2eEnv` fixture) and exposes
 * the same network helpers plus the node-side funding/balance/activity helpers used by
 * globalSetup. Nothing here touches the browser; page interactions live in actions.ts.
 */
import { EthBridger, MultiCaller } from '@arbitrum/sdk';
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Signer, Wallet, ethers, utils } from 'ethers';

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

export const getNetworkSlug = (cfg: E2EConfig, network: 'parent' | 'child') => {
  const networkName = network === 'parent' ? getL1NetworkName(cfg) : getL2NetworkName(cfg);
  return networkName.toLowerCase().replace(' ', '-');
};

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
export const invalidTokenAddress = utils.computeAddress(utils.randomBytes(32));

export const moreThanZeroBalance = /0(\.\d+)/;

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

export async function getCustomDestinationAddress() {
  console.log('Getting custom destination address...');
  return (await Wallet.createRandom().getAddress()).toLowerCase();
}

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

/**
 * Keeps mining on both chains so batches get posted sooner (deposits confirm faster). This is
 * started fire-and-forget from globalSetup and runs for the whole test run, exactly like the
 * Cypress `setupNodeEvents` did.
 */
export async function generateActivityOnChains({
  parentProvider,
  childProvider,
  wallet,
}: {
  parentProvider: Provider;
  childProvider: Provider;
  wallet: Wallet;
}) {
  const keepMining = async (miner: Signer) => {
    /* eslint-disable no-await-in-loop */
    while (true) {
      await (
        await miner.sendTransaction({
          to: await miner.getAddress(),
          value: 0,
          // random data to make the tx heavy, so that batches are posted sooner (since they're posted according to calldata size)
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000010c3c627574746f6e20636c6173733d226e61766261722d746f67676c65722220747970653d22627574746f6e2220646174612d746f67676c653d22636f6c6c617073652220646174612d7461726765743d22236e6176626172537570706f72746564436f6e74656e742220617269612d636f6e74726f6c733d226e6176626172537570706f72746564436f6e74656e742220617269612d657870616e6465643d2266616c73652220617269612d6c6162656c3d223c253d20676574746578742822546f67676c65206e617669676174696f6e222920253e223e203c7370616e20636c6173733d226e61766261722d746f67676c65722d69636f6e223e3c2f7370616e3e203c2f627574746f6e3e0000000000000000000000000000000000000000',
        })
      ).wait();

      await wait(100);
    }
    /* eslint-enable no-await-in-loop */
  };
  // whilst waiting for status we mine on both parentChain and childChain
  console.log('Generating activity on parentChain...');
  const minerParent = Wallet.createRandom().connect(parentProvider);

  const decimals = await getNativeTokenDecimals({
    parentProvider,
    childProvider,
  });

  await fundEth({
    address: await minerParent.getAddress(),
    provider: parentProvider,
    sourceWallet: wallet,
    networkType: 'parentChain',
    amount: utils.parseUnits('0.2', decimals),
  });

  console.log('Generating activity on childChain...');
  const minerChild = Wallet.createRandom().connect(childProvider);

  await fundEth({
    address: await minerChild.getAddress(),
    provider: childProvider,
    sourceWallet: wallet,
    networkType: 'childChain',
    amount: utils.parseEther('0.2'),
  });

  await Promise.allSettled([keepMining(minerParent), keepMining(minerChild)]);
}

/**
 * Keeps logging assertion status so withdrawals become claimable. Started fire-and-forget from
 * globalSetup.
 */
export async function checkForAssertions({
  parentProvider,
  testType,
}: {
  parentProvider: Provider;
  testType: 'regular' | 'orbit-eth' | 'orbit-custom';
}) {
  // Classic rollup ABI (pre-BoLD)
  const classicAbi = [
    'function latestConfirmed() public view returns (uint64)',
    'function latestNodeCreated() public view returns (uint64)',
  ];

  // BoLD rollup ABI — latestConfirmed returns bytes32, no latestNodeCreated
  const boldAbi = [
    'function latestConfirmed() public view returns (bytes32)',
    'function getAssertion(bytes32) public view returns (tuple(uint64 firstChildBlock, uint64 secondChildBlock, uint64 createdAtBlock, bool isFirstChild, uint8 status, bytes32 configHash))',
    'event AssertionCreated(bytes32 indexed assertionHash, bytes32 indexed parentAssertionHash, tuple(tuple(bytes32 globalState, uint8 machineStatus) beforeState, tuple(bytes32 globalState, uint8 machineStatus) afterState) assertion, bytes32 afterInboxBatchAcc, uint256 inboxMaxCount, bytes32 wasmModuleRoot, uint256 requiredStake, address challengeManager, uint64 confirmPeriodBlocks)',
  ];

  let rollupAddress: string;

  switch (testType) {
    case 'orbit-eth':
      rollupAddress = defaultL3Network.ethBridge.rollup;
      break;
    case 'orbit-custom':
      rollupAddress = defaultL3CustomGasTokenNetwork.ethBridge.rollup;
      break;
    default:
      rollupAddress = defaultL2Network.ethBridge.rollup;
  }

  const parentChainId = (await parentProvider.getNetwork()).chainId;

  // Detect BoLD vs classic by trying the classic latestNodeCreated()
  const classicContract = new ethers.Contract(rollupAddress, classicAbi, parentProvider);
  let isBold = false;
  try {
    await classicContract.latestNodeCreated();
  } catch {
    isBold = true;
    console.log(`Rollup ${rollupAddress} on ChainId ${parentChainId} is a BoLD rollup`);
  }

  if (isBold) {
    const boldContract = new ethers.Contract(rollupAddress, boldAbi, parentProvider);
    /* eslint-disable no-await-in-loop */
    while (true) {
      try {
        const latestConfirmed = await boldContract.latestConfirmed();
        const assertion = await boldContract.getAssertion(latestConfirmed);
        const createdAtBlock = assertion.createdAtBlock.toNumber();
        // Count assertions created since the latest confirmed
        const events = await boldContract.queryFilter('AssertionCreated', createdAtBlock, 'latest');
        console.log(
          `***** BoLD assertion status on ChainId ${parentChainId}: ${events.length} assertions since confirmed block ${createdAtBlock}, latest confirmed: ${latestConfirmed.slice(0, 10)}...`,
        );
      } catch (e) {
        console.log(
          `Could not fetch BoLD assertions for '${rollupAddress}' on ChainId ${parentChainId}`,
          e,
        );
      }
      await wait(10000);
    }
    /* eslint-enable no-await-in-loop */
  } else {
    /* eslint-disable no-await-in-loop */
    while (true) {
      try {
        console.log(
          `***** Assertion status on ChainId ${parentChainId}: ${(
            await classicContract.latestNodeCreated()
          ).toString()} created / ${(await classicContract.latestConfirmed()).toString()} confirmed`,
        );
      } catch (e) {
        console.log(
          `Could not fetch assertions for '${rollupAddress}' on ChainId ${parentChainId}`,
          e,
        );
      }
      await wait(10000);
    }
    /* eslint-enable no-await-in-loop */
  }
}
