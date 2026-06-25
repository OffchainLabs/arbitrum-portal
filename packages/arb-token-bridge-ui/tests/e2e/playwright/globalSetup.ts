/*
 * Playwright globalSetup for the regular / orbit e2e suite.
 *
 * This is the Playwright replacement for the Cypress `setupNodeEvents` block in
 * synpress.config.ts. It does all the on-chain prep (register the local network, deploy + fund a
 * test ERC20, fund the user wallet with ETH/WETH, approve tokens, handle custom-gas-token chains,
 * create a redeem-retryable tx), writes everything specs need to a JSON config (read back via the
 * `e2eEnv` fixture), then fires the generate-activity / check-assertions loops (fire-and-forget,
 * exactly like the Cypress config did; Playwright's main process stays alive for the whole run).
 */
import { Erc20Bridger, EthBridger } from '@arbitrum/sdk';
import { TestERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestERC20__factory';
import { TestWETH9__factory } from '@arbitrum/sdk/dist/lib/abi/factories/TestWETH9__factory';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, ContractFactory, Wallet, constants, utils } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

import { addressesEqual } from '../../../src/util/AddressUtils';
import { getL2ERC20Address } from '../../../src/util/TokenUtils';
import { registerLocalNetwork } from '../../../src/util/networks';
import {
  defaultL2Network,
  defaultL3CustomGasTokenNetwork,
  defaultL3Network,
} from '../../../src/util/networksNitroTestnode';
import { contractAbi, contractByteCode } from '../../../testErc20Token';
import { writeE2EConfig } from './e2eConfig';
import {
  ERC20TokenDecimals,
  ERC20TokenName,
  ERC20TokenSymbol,
  checkForAssertions,
  fundEth,
  generateActivityOnChains,
  getCustomDestinationAddress,
  getNativeTokenDecimals,
} from './support/common';

const isOrbitTest = [process.env.E2E_ORBIT, process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN].includes(
  'true',
);

const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY;
if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided');
}

const MAINNET_INFURA_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`;
const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`;

const ethRpcUrl = (() => {
  // MetaMask comes with a default http://localhost:8545 network with 'localhost' as network name
  // On CI, the rpc is http://geth:8545 so we cannot reuse the 'localhost' network
  // However, Synpress does not allow editing network name on the MetaMask extension
  // For consistency purpose, we would be using 'custom-localhost'
  // MetaMask auto-detects same rpc url and blocks adding new custom network with same rpc
  // so we have to add a / to the end of the rpc url
  if (!process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1) {
    return MAINNET_INFURA_RPC_URL;
  }
  if (process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1.endsWith('/')) {
    return process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1;
  }
  return process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1 + '/';
})();

const arbRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2;
const l3RpcUrl = process.env.NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3;
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? SEPOLIA_INFURA_RPC_URL;
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc';

const parentProvider = new StaticJsonRpcProvider(isOrbitTest ? arbRpcUrl : ethRpcUrl);
const childProvider = new StaticJsonRpcProvider(isOrbitTest ? l3RpcUrl : arbRpcUrl);

if (!process.env.PRIVATE_KEY_CUSTOM) {
  throw new Error('PRIVATE_KEY_CUSTOM variable missing.');
}
if (!process.env.PRIVATE_KEY_USER) {
  throw new Error('PRIVATE_KEY_USER variable missing.');
}

const localWallet = new Wallet(
  process.env.E2E_ORBIT_CUSTOM_GAS_TOKEN === 'true'
    ? utils.sha256(utils.toUtf8Bytes('user_fee_token_deployer'))
    : process.env.PRIVATE_KEY_CUSTOM,
);
const userWallet = new Wallet(process.env.PRIVATE_KEY_USER);

const l3Network =
  process.env.ORBIT_CUSTOM_GAS_TOKEN === 'true' ? defaultL3CustomGasTokenNetwork : defaultL3Network;

const l1WethGateway = isOrbitTest
  ? l3Network.tokenBridge!.parentWethGateway
  : defaultL2Network.tokenBridge!.parentWethGateway;

const l1WethAddress = isOrbitTest
  ? l3Network.tokenBridge!.parentWeth
  : defaultL2Network.tokenBridge!.parentWeth;

let l2WethAddress = isOrbitTest
  ? l3Network.tokenBridge!.childWeth
  : defaultL2Network.tokenBridge!.childWeth;

function isNonZeroAddress(address: string | undefined) {
  return (
    typeof address === 'string' && address !== constants.AddressZero && utils.isAddress(address)
  );
}

export default async function globalSetup() {
  await registerLocalNetwork();

  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider);
  const ethBridger = await EthBridger.fromProvider(childProvider);
  const isCustomFeeToken = isNonZeroAddress(ethBridger.nativeToken);

  if (!ethRpcUrl && !isOrbitTest) {
    throw new Error('NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1 variable missing.');
  }
  if (!arbRpcUrl) {
    throw new Error('NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2 variable missing.');
  }
  if (!l3RpcUrl && isOrbitTest) {
    throw new Error('NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3 variable missing.');
  }
  if (!sepoliaRpcUrl) {
    throw new Error('process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA variable missing.');
  }

  const userWalletAddress = await userWallet.getAddress();

  // Fund the userWallet. We do this to run tests on a small amount of ETH.
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

  // Deploy and fund ERC20 to Parent and Child chains
  const l1ERC20Token = await deployERC20ToParentChain();

  // Approve custom fee token if not ETH
  if (isCustomFeeToken) {
    await approveCustomFeeToken({
      signer: localWallet.connect(parentProvider),
      erc20ParentAddress: l1ERC20Token.address,
    });
    await approveCustomFeeToken({
      signer: localWallet.connect(parentProvider),
      erc20ParentAddress: erc20Bridger.nativeToken!,
    });
    await ethBridger.approveGasToken({
      parentSigner: localWallet.connect(parentProvider),
    });
  }
  if (isCustomFeeToken) {
    await fundUserWalletNativeCurrency();
  }

  await fundErc20ToParentChain(l1ERC20Token);
  await fundErc20ToChildChain({
    parentSigner: localWallet.connect(parentProvider),
    parentErc20Address: l1ERC20Token.address,
    amount: parseUnits('5', ERC20TokenDecimals),
    isCustomFeeToken,
  });
  await approveErc20(l1ERC20Token);

  if (isCustomFeeToken) {
    await approveCustomFeeToken({
      signer: userWallet.connect(parentProvider),
      erc20ParentAddress: erc20Bridger.nativeToken!,
    });
    await ethBridger.approveGasToken({
      parentSigner: userWallet.connect(parentProvider),
    });
    await erc20Bridger.approveGasToken({
      parentSigner: userWallet.connect(parentProvider),
      erc20ParentAddress: l1WethAddress,
    });
  }

  // Wrap ETH to test WETH transactions and approve its usage
  await fundWethOnParentChain();
  await approveWeth();
  if (isCustomFeeToken) {
    await approveCustomFeeToken({
      signer: userWallet.connect(parentProvider),
      erc20ParentAddress: l1WethAddress,
    });
  }

  await fundErc20ToChildChain({
    parentSigner: userWallet.connect(parentProvider),
    parentErc20Address: l1WethAddress,
    amount: utils.parseEther('0.1'),
    isCustomFeeToken,
  });

  const erc20TokenChildAddress = await getL2ERC20Address({
    erc20L1Address: l1ERC20Token.address,
    l1Provider: parentProvider,
    l2Provider: childProvider,
  });

  const redeemRetryableTestTx = await generateTestTxForRedeemRetryable();

  const nativeTokenDecimals = await getNativeTokenDecimals({
    parentProvider,
    childProvider,
  });
  const customDestinationAddress = await getCustomDestinationAddress();

  writeE2EConfig({
    ETH_RPC_URL: (isOrbitTest ? arbRpcUrl : ethRpcUrl) as string,
    ARB_RPC_URL: (isOrbitTest ? l3RpcUrl : arbRpcUrl) as string,
    ETH_SEPOLIA_RPC_URL: sepoliaRpcUrl,
    ARB_SEPOLIA_RPC_URL: arbSepoliaRpcUrl,
    ADDRESS: userWalletAddress,
    PRIVATE_KEY: userWallet.privateKey,
    INFURA_KEY,
    ERC20_TOKEN_ADDRESS_PARENT_CHAIN: l1ERC20Token.address,
    LOCAL_WALLET_PRIVATE_KEY: localWallet.privateKey,
    ORBIT_TEST: isOrbitTest ? '1' : '0',
    NATIVE_TOKEN_SYMBOL: isCustomFeeToken ? 'TN' : 'ETH',
    NATIVE_TOKEN_ADDRESS: ethBridger.nativeToken,
    NATIVE_TOKEN_DECIMALS: nativeTokenDecimals,
    CUSTOM_DESTINATION_ADDRESS: customDestinationAddress,
    ERC20_TOKEN_ADDRESS_CHILD_CHAIN: erc20TokenChildAddress,
    L1_WETH_ADDRESS: l1WethAddress,
    L2_WETH_ADDRESS: l2WethAddress,
    REDEEM_RETRYABLE_TEST_TX: redeemRetryableTestTx,
  });

  // Generate activity on chains so that assertions get posted and claims can be made.
  // Fire-and-forget: these never resolve and run for the whole test run (matches the Cypress
  // setupNodeEvents behavior). The Playwright main process stays alive until the run finishes.
  void generateActivityOnChains({
    parentProvider,
    childProvider,
    wallet: localWallet,
  }).catch((e) => console.log('generateActivityOnChains stopped:', e?.message));

  void checkForAssertions({
    parentProvider,
    testType: isCustomFeeToken
      ? 'orbit-custom'
      : process.env.E2E_ORBIT === 'true'
        ? 'orbit-eth'
        : 'regular',
  }).catch((e) => console.log('checkForAssertions stopped:', e?.message));

  console.log(`E2E config written for ${userWalletAddress} (orbit=${isOrbitTest}).`);
}

async function approveCustomFeeToken({
  signer,
  erc20ParentAddress,
  amount,
}: {
  signer: Wallet;
  erc20ParentAddress: string;
  amount?: BigNumber;
}) {
  console.log('Approving custom fee token...');
  const childErc20Bridger = await Erc20Bridger.fromProvider(childProvider);

  await childErc20Bridger.approveGasToken({
    parentSigner: signer,
    erc20ParentAddress,
    amount,
  });
}

async function fundUserWalletNativeCurrency() {
  const childEthBridger = await EthBridger.fromProvider(childProvider);
  const decimals = await getNativeTokenDecimals({
    parentProvider,
    childProvider,
  });

  const address = await userWallet.getAddress();

  const tokenContract = TestERC20__factory.connect(
    childEthBridger.nativeToken!,
    localWallet.connect(parentProvider),
  );

  const userBalance = await tokenContract.balanceOf(address);
  const shouldFund = userBalance.lt(utils.parseUnits('0.3', decimals));

  if (!shouldFund) {
    console.log(`User wallet has enough custom native currency for testing, skip funding...`);
    return;
  }

  console.log(`Funding native currency to user wallet on L2...`);

  const tx = await tokenContract.transfer(address, utils.parseUnits('3', decimals));
  await tx.wait();
}

async function deployERC20ToParentChain() {
  console.log('Deploying ERC20...');
  const signer = localWallet.connect(parentProvider);
  const factory = new ContractFactory(contractAbi, contractByteCode, signer);
  const l1TokenContract = await factory.deploy(
    ERC20TokenName,
    ERC20TokenSymbol,
    parseUnits('100', ERC20TokenDecimals).toString(),
  );
  console.log('Deployed ERC20:', {
    symbol: await l1TokenContract.symbol(),
    address: l1TokenContract.address,
    supply: formatUnits(await l1TokenContract.balanceOf(localWallet.address), ERC20TokenDecimals),
  });
  return l1TokenContract;
}

async function deployERC20ToChildChain(erc20L1Address: string) {
  const bridger = await Erc20Bridger.fromProvider(childProvider);
  const deploy = await bridger.deposit({
    amount: BigNumber.from(0),
    erc20ParentAddress: erc20L1Address,
    parentSigner: localWallet.connect(parentProvider),
    childProvider,
  });
  await deploy.wait();

  // store deployed weth address
  if (addressesEqual(erc20L1Address, l1WethAddress)) {
    l2WethAddress = await getL2ERC20Address({
      erc20L1Address: l1WethAddress,
      l1Provider: parentProvider,
      l2Provider: childProvider,
    });
  }
}

function getWethContract(provider: StaticJsonRpcProvider, tokenAddress: string) {
  return TestWETH9__factory.connect(tokenAddress, userWallet.connect(provider));
}

async function fundWethOnParentChain() {
  console.log(`Funding WETH...`);
  const tx = await getWethContract(parentProvider, l1WethAddress).deposit({
    value: utils.parseEther('0.3'),
  });
  await tx.wait();
}

async function approveWeth() {
  console.log('Approving WETH...');
  const tx = await getWethContract(parentProvider, l1WethAddress).approve(
    l1WethGateway,
    constants.MaxInt256,
  );
  await tx.wait();
}

async function approveErc20(l1ERC20Token: Contract) {
  console.log('Approving ERC20...');
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider);
  const approvalTx = await erc20Bridger.approveToken({
    erc20ParentAddress: l1ERC20Token.address,
    parentSigner: userWallet.connect(parentProvider),
    amount: parseUnits('1', ERC20TokenDecimals), // only approve 1 token for deposits, later we will need MAX amount approval during approve tests
  });
  await approvalTx.wait();
}

async function fundErc20ToParentChain(l1ERC20Token: Contract) {
  console.log('Funding ERC20 on Parent Chain...');
  // Send deployed ERC-20 to the test userWallet
  const transferTx = await l1ERC20Token
    .connect(localWallet.connect(parentProvider))
    .transfer(userWallet.address, parseUnits('5', ERC20TokenDecimals));
  await transferTx.wait();
}

async function fundErc20ToChildChain({
  parentErc20Address,
  parentSigner,
  amount,
  isCustomFeeToken,
}: {
  parentErc20Address: string;
  parentSigner: Wallet;
  amount: BigNumber;
  isCustomFeeToken: boolean;
}) {
  // deploy any token that's not WETH
  // only deploy WETH for custom fee token chains because it's not deployed there
  if (!addressesEqual(parentErc20Address, l1WethAddress) || isCustomFeeToken) {
    // first deploy the ERC20 to L2 (if not, it might throw a gas error later)
    await deployERC20ToChildChain(parentErc20Address);
  }

  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider);

  // approve the ERC20 token for spending
  const approvalTx = await erc20Bridger.approveToken({
    erc20ParentAddress: parentErc20Address,
    parentSigner,
    amount: constants.MaxUint256,
  });
  await approvalTx.wait();

  const depositTx = await erc20Bridger.deposit({
    parentSigner,
    childProvider,
    erc20ParentAddress: parentErc20Address,
    amount,
    destinationAddress: userWallet.address,
  });
  const depositRec = await depositTx.wait();

  // wait for funds to reach L2
  await depositRec.waitForChildTransactionReceipt(childProvider);
}

async function generateTestTxForRedeemRetryable() {
  console.log('Adding a test transaction for redeeming retryable...');

  const walletAddress = userWallet.address;
  const erc20Token = {
    symbol: 'WETH',
    decimals: 18,
    address: l1WethAddress,
  };
  const amount = utils.parseUnits('0.001', erc20Token.decimals);
  const erc20Bridger = await Erc20Bridger.fromProvider(childProvider);
  const depositRequest = await erc20Bridger.getDepositRequest({
    parentProvider,
    childProvider,
    from: walletAddress,
    erc20ParentAddress: erc20Token.address,
    amount,
    retryableGasOverrides: {
      gasLimit: { base: BigNumber.from(0) },
    },
  });
  const tx = await erc20Bridger.deposit({
    ...depositRequest,
    parentSigner: userWallet.connect(parentProvider),
    childProvider,
    retryableGasOverrides: {
      gasLimit: {
        base: BigNumber.from(0),
      },
    },
  });
  const receipt = await tx.wait();
  return receipt.transactionHash;
}
