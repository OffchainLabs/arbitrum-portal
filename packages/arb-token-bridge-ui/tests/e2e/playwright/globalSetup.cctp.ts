/*
 * Playwright globalSetup for the CCTP e2e suite (port of synpress.cctp.config.ts setupNodeEvents).
 *
 * CCTP runs on the public Sepolia / Arbitrum Sepolia testnets (not the local testnode). It funds
 * a freshly generated wallet with ETH + USDC on both testnets and pre-creates the CCTP burn
 * transactions the specs later claim, then writes the config the `e2eEnv` fixture reads.
 */
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Contract, Wallet, utils } from 'ethers';
import { Address } from 'viem';

import { ChainDomain } from '../../../src/app/api/cctp/[type]';
import { CommonAddress } from '../../../src/util/CommonAddressUtils';
import { TokenMessengerAbi } from '../../../src/util/cctp/TokenMessengerAbi';
import { writeE2EConfig } from './e2eConfig';
import { type NetworkType, fundEth, getCustomDestinationAddress } from './support/common';

const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY;
if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided');
}
if (!process.env.PRIVATE_KEY_CCTP) {
  throw new Error('PRIVATE_KEY_CCTP variable missing.');
}

const SEPOLIA_INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`;
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? SEPOLIA_INFURA_RPC_URL;
const arbSepoliaRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc';

const sepoliaProvider = new StaticJsonRpcProvider(sepoliaRpcUrl);
const arbSepoliaProvider = new StaticJsonRpcProvider(arbSepoliaRpcUrl);

// Wallet funded on Sepolia and ArbSepolia with ETH and USDC
const localWallet = new Wallet(process.env.PRIVATE_KEY_CCTP);
// Generate a new wallet every time
const userWallet = Wallet.createRandom();

async function fundUsdc({
  address, // wallet address where funding is required
  provider,
  amount,
  networkType,
  sourceWallet,
}: {
  address: string;
  provider: Provider;
  amount: BigNumber;
  sourceWallet: Wallet;
  networkType: NetworkType;
}) {
  console.log(`Funding USDC ${address} on ${networkType}...`);
  const usdcContractAddress =
    networkType === 'parentChain' ? CommonAddress.Sepolia.USDC : CommonAddress.ArbitrumSepolia.USDC;

  const contract = new ERC20__factory().connect(sourceWallet.connect(provider));
  const token = contract.attach(usdcContractAddress);
  await token.deployed();
  const tx = await token.transfer(address, amount);
  await tx.wait();
}

async function fundWallets() {
  const userWalletAddress = userWallet.address;
  console.log(`Funding wallet ${userWalletAddress}`);

  const usdcAmount = utils.parseUnits('0.00063', 6);

  const fundEthHelper = (network: 'sepolia' | 'arbSepolia', amount: BigNumber) => {
    return fundEth({
      address: userWalletAddress,
      sourceWallet: localWallet,
      ...(network === 'sepolia'
        ? { provider: sepoliaProvider, amount, networkType: 'parentChain' as const }
        : { provider: arbSepoliaProvider, amount, networkType: 'childChain' as const }),
    });
  };
  const fundUsdcHelper = (network: 'sepolia' | 'arbSepolia', amount: BigNumber = usdcAmount) => {
    return fundUsdc({
      address: userWalletAddress,
      sourceWallet: localWallet,
      amount,
      ...(network === 'sepolia'
        ? { provider: sepoliaProvider, networkType: 'parentChain' as const }
        : { provider: arbSepoliaProvider, networkType: 'childChain' as const }),
    });
  };

  const ethAmountSepolia = utils.parseEther('0.025');
  const ethAmountArbSepolia = utils.parseEther('0.006');

  // We run both deposit and withdraw CCTP specs in a single run, so fund for both.
  await Promise.all([
    fundEthHelper('sepolia', ethAmountSepolia),
    fundEthHelper('arbSepolia', ethAmountArbSepolia),
  ]);
  await Promise.all([fundUsdcHelper('sepolia'), fundUsdcHelper('arbSepolia')]);
}

async function createCctpTx(
  type: 'deposit' | 'withdrawal',
  destinationAddress: Address,
  amount: string,
) {
  console.log(`Creating CCTP transaction for ${destinationAddress}`);
  const provider = type === 'deposit' ? sepoliaProvider : arbSepoliaProvider;
  const usdcAddress =
    type === 'deposit' ? CommonAddress.Sepolia.USDC : CommonAddress.ArbitrumSepolia.USDC;
  const tokenMessengerContractAddress =
    type === 'deposit'
      ? CommonAddress.Sepolia.tokenMessengerContractAddress
      : CommonAddress.ArbitrumSepolia.tokenMessengerContractAddress;

  const signer = userWallet.connect(provider);
  const usdcContract = ERC20__factory.connect(usdcAddress, signer);

  const tx = await usdcContract.functions.approve(
    tokenMessengerContractAddress,
    utils.parseUnits(amount, 6),
  );
  await tx.wait();

  const tokenMessenger = new Contract(tokenMessengerContractAddress, TokenMessengerAbi, signer);
  await tokenMessenger.deployed();

  const depositForBurnTx = await tokenMessenger.functions.depositForBurn?.(
    utils.parseUnits(amount, 6),
    type === 'deposit' ? ChainDomain.ArbitrumOne : ChainDomain.Ethereum,
    utils.hexlify(utils.zeroPad(destinationAddress, 32)),
    usdcAddress,
  );
  await depositForBurnTx.wait();
}

export default async function globalSetup() {
  await fundWallets();

  const customAddress = await getCustomDestinationAddress();

  /**
   * - Create two deposit transactions, claimed in withdrawCctp
   * - Create two withdraw transactions, rejected in depositCctp
   */
  await createCctpTx('withdrawal', userWallet.address as Address, '0.00014');
  await createCctpTx('withdrawal', customAddress as Address, '0.00015');
  await createCctpTx('deposit', userWallet.address as Address, '0.00012');
  await createCctpTx('deposit', customAddress as Address, '0.00013');

  writeE2EConfig({
    ETH_RPC_URL: sepoliaRpcUrl,
    ARB_RPC_URL: arbSepoliaRpcUrl,
    ETH_SEPOLIA_RPC_URL: sepoliaRpcUrl,
    ARB_SEPOLIA_RPC_URL: arbSepoliaRpcUrl,
    ADDRESS: userWallet.address,
    PRIVATE_KEY: userWallet.privateKey,
    INFURA_KEY,
    ORBIT_TEST: '0',
    NATIVE_TOKEN_SYMBOL: 'ETH',
    NATIVE_TOKEN_DECIMALS: 18,
    CUSTOM_DESTINATION_ADDRESS: customAddress,
    IS_CCTP: true,
  });

  console.log(`CCTP e2e config written for ${userWallet.address}.`);
}
