/*
 * `litro bake --setup-command` entry point. Runs the chain prep from globalSetup once against a
 * booted testnode and writes the result into the image's exported config, so CI jobs booting the
 * baked image skip it (see `loadPrebakedState` in globalSetup.ts).
 *
 * Needs PRIVATE_KEY_CUSTOM, PRIVATE_KEY_USER, NEXT_PUBLIC_INFURA_KEY, and E2E_ORBIT /
 * E2E_ORBIT_CUSTOM_GAS_TOKEN / ORBIT_CUSTOM_GAS_TOKEN set for the variant being baked.
 */
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { copyFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function getConfigDir(): string {
  const dir = process.env.ARBITRUM_TESTNODE_CONFIG_DIR;
  if (!dir) {
    throw new Error('ARBITRUM_TESTNODE_CONFIG_DIR missing; run this through `litro bake`.');
  }
  return dir;
}
const configDir = getConfigDir();

process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1 ??= process.env.ARBITRUM_TESTNODE_L1_RPC_URL;
process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2 ??= process.env.ARBITRUM_TESTNODE_L2_RPC_URL;
process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3 ??= process.env.ARBITRUM_TESTNODE_L3_RPC_URL;

// The network registry imports this file statically, so it must match the image before the
// setup module loads.
copyFileSync(
  join(configDir, 'localNetwork.json'),
  resolve(__dirname, '../../../src/util/networksNitroTestnode.generated.json'),
);

async function main() {
  const { isNonZeroAddress, prepareChain, PREBAKED_STATE_FILE } = await import('./globalSetup');
  const { registerLocalNetwork } = await import('../../../src/util/networks');
  await registerLocalNetwork();

  const isOrbitTest = [process.env.E2E_ORBIT, process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN].includes(
    'true',
  );
  const childProvider = new StaticJsonRpcProvider(
    isOrbitTest
      ? process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3
      : process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2,
  );
  const ethBridger = await EthBridger.fromProvider(childProvider);
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider);
  const isCustomFeeToken = isNonZeroAddress(ethBridger.nativeToken);

  const state = await prepareChain({
    erc20Bridger,
    ethBridger,
    isCustomFeeToken,
    userWalletAddress: new Wallet(process.env.PRIVATE_KEY_USER!).address,
  });

  writeFileSync(join(configDir, PREBAKED_STATE_FILE), JSON.stringify(state, null, 2));
  console.log(`Wrote ${PREBAKED_STATE_FILE}:`, state);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
