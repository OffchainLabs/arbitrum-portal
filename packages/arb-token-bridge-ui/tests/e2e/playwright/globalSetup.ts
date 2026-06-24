/*
 * Playwright globalSetup. This is the Playwright replacement for the Cypress
 * `setupNodeEvents` block in synpress.config.ts.
 *
 * For the login POC it does the minimum the login flow needs:
 *   1. register the local Arbitrum network
 *   2. fund the user wallet with ETH on parent + child chains so balances render
 *   3. compute the native token symbol / decimals
 *   4. write everything the specs need to a JSON config (read back via the `e2eEnv` fixture)
 *
 * The heavier prep done by the Cypress config (deploy ERC20, WETH, approvals, the
 * generate-activity / check-assertions background loops, redeem-retryable tx) is intentionally
 * NOT ported here. Those are only needed by the transactional specs and belong to a later phase
 * (see CYPRESS_TO_PLAYWRIGHT_MIGRATION_PLAN.md, Phase 1).
 */
import { EthBridger } from '@arbitrum/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet, constants, utils } from 'ethers';

import { registerLocalNetwork } from '../../../src/util/networks';
import { writeE2EConfig } from './e2eConfig';
import { fundEth, getNativeTokenDecimals } from './support/common';

function isNonZeroAddress(address: string | undefined) {
  return (
    typeof address === 'string' && address !== constants.AddressZero && utils.isAddress(address)
  );
}

export default async function globalSetup() {
  const isOrbitTest = [process.env.E2E_ORBIT, process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN].includes(
    'true',
  );

  const infuraKey = process.env.NEXT_PUBLIC_INFURA_KEY;
  const mainnetInfuraRpcUrl = infuraKey ? `https://mainnet.infura.io/v3/${infuraKey}` : undefined;
  const sepoliaInfuraRpcUrl = infuraKey ? `https://sepolia.infura.io/v3/${infuraKey}` : undefined;

  const ethRpcUrl = (() => {
    // MetaMask comes with a default http://localhost:8545 network with 'localhost' as network name
    // On CI, the rpc is http://geth:8545 so we cannot reuse the 'localhost' network
    // MetaMask auto-detects same rpc url and blocks adding a new custom network with same rpc
    // so we have to add a / to the end of the rpc url
    if (!process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1) {
      return mainnetInfuraRpcUrl;
    }
    const url = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1;
    return url.endsWith('/') ? url : `${url}/`;
  })();

  const arbRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2;
  const l3RpcUrl = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3;
  const sepoliaRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? sepoliaInfuraRpcUrl;
  const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc';

  if (!arbRpcUrl) {
    throw new Error('NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2 variable missing.');
  }
  if (!ethRpcUrl && !isOrbitTest) {
    throw new Error('NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1 variable missing.');
  }
  if (!l3RpcUrl && isOrbitTest) {
    throw new Error('NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3 variable missing.');
  }

  const privateKeyCustom = process.env.PRIVATE_KEY_CUSTOM;
  const privateKeyUser = process.env.PRIVATE_KEY_USER;
  if (!privateKeyCustom) {
    throw new Error('PRIVATE_KEY_CUSTOM variable missing.');
  }
  if (!privateKeyUser) {
    throw new Error('PRIVATE_KEY_USER variable missing.');
  }

  await registerLocalNetwork();

  const parentProvider = new StaticJsonRpcProvider(isOrbitTest ? arbRpcUrl : ethRpcUrl);
  const childProvider = new StaticJsonRpcProvider(isOrbitTest ? l3RpcUrl : arbRpcUrl);

  const localWallet = new Wallet(
    process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN === 'true'
      ? utils.sha256(utils.toUtf8Bytes('user_fee_token_deployer'))
      : privateKeyCustom,
  );
  const userWallet = new Wallet(privateKeyUser);
  const userWalletAddress = await userWallet.getAddress();

  const ethBridger = await EthBridger.fromProvider(childProvider);
  const isCustomFeeToken = isNonZeroAddress(ethBridger.nativeToken);

  // Fund the userWallet with ETH on both chains so the bridge UI shows non-zero balances.
  await Promise.all([
    fundEth({
      address: userWalletAddress,
      provider: parentProvider,
      sourceWallet: localWallet,
      amount: utils.parseEther('2'),
      networkType: 'parentChain',
    }),
    fundEth({
      address: userWalletAddress,
      provider: childProvider,
      sourceWallet: localWallet,
      amount: utils.parseEther('2'),
      networkType: 'childChain',
    }),
  ]);

  const nativeTokenDecimals = await getNativeTokenDecimals({
    parentProvider,
    childProvider,
  });

  writeE2EConfig({
    ETH_RPC_URL: (isOrbitTest ? arbRpcUrl : ethRpcUrl) as string,
    ARB_RPC_URL: (isOrbitTest ? l3RpcUrl : arbRpcUrl) as string,
    ETH_SEPOLIA_RPC_URL: sepoliaRpcUrl as string,
    ARB_SEPOLIA_RPC_URL: arbSepoliaRpcUrl,
    ADDRESS: userWalletAddress,
    PRIVATE_KEY: userWallet.privateKey,
    INFURA_KEY: infuraKey,
    ORBIT_TEST: isOrbitTest ? '1' : '0',
    NATIVE_TOKEN_SYMBOL: isCustomFeeToken ? 'TN' : 'ETH',
    NATIVE_TOKEN_ADDRESS: ethBridger.nativeToken,
    NATIVE_TOKEN_DECIMALS: nativeTokenDecimals,
  });

  console.log(`E2E config written for ${userWalletAddress} (orbit=${isOrbitTest}).`);
}
