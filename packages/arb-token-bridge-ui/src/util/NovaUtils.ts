import { BigNumber, constants, utils } from 'ethers';

import { ChainId } from '../types/ChainId';
import { addressesEqual } from './AddressUtils';

/**
 * Arbitrum Nova is in a minimized maintenance state. Deposits into Nova are restricted to a small
 * amount of ETH so users can still fund the gas needed to withdraw their remaining funds.
 * Withdrawals out of Nova are unaffected.
 */
export const NOVA_MAX_ETH_DEPOSIT_AMOUNT = 0.01;

export const NOVA_MINIMIZED_STATE_LINK =
  'https://snapshot.org/#/s:arbitrumfoundation.eth/proposal/0x002b8264f83d19f88d17dc48a92d1e92638285a6592c491255fa7b14c955da81';

/**
 * Nova is only ever reachable as a destination by depositing from Ethereum: no Orbit chain declares
 * Nova as its parent, and Nova only appears under `lifiDestinationChainIds[ChainId.Ethereum]`.
 *
 * Keying on the destination chain (rather than `childChain.id` or `isDepositMode`) is what keeps
 * withdrawals working: Nova to Ethereum has `childChain.id === ArbitrumNova`, and Nova to Arbitrum
 * One is deliberately marked `isDepositMode: true` in `getNetworksRelationship`.
 */
export function isNovaDestination(destinationChainId: number): boolean {
  return destinationChainId === ChainId.ArbitrumNova;
}

export type NovaDepositBlockReason = 'eth-only' | 'amount-capped';

function isNativeEthAddress(address: string | undefined): boolean {
  return !address || addressesEqual(address, constants.AddressZero);
}

/**
 * Returns why a transfer into Nova must be blocked, or `null` if it is allowed.
 *
 * Takes plain values rather than reading hooks so it stays unit-testable, following the same
 * dependency-injection shape as `util/chainFilter.ts`.
 */
export function getNovaDepositBlockReason({
  destinationChainId,
  selectedTokenAddress,
  destinationTokenAddress,
  amount,
}: {
  destinationChainId: number;
  selectedTokenAddress: string | undefined;
  destinationTokenAddress: string | undefined;
  amount: BigNumber;
}): NovaDepositBlockReason | null {
  if (!isNovaDestination(destinationChainId)) {
    return null;
  }

  /**
   * `selectedToken === null` is not on its own a reliable "is ETH" test: the LiFi list for
   * Ethereum <> Nova contains a real AddressZero entry, so `?token=0x0000...0` resolves to a
   * non-null token object for plain ETH.
   *
   * The destination side matters too. A LiFi swap (`?destinationToken=<erc20>`) delivers an ERC20
   * into Nova even when the source asset is native ETH.
   */
  if (!isNativeEthAddress(selectedTokenAddress) || !isNativeEthAddress(destinationTokenAddress)) {
    return 'eth-only';
  }

  if (amount.gt(utils.parseEther(String(NOVA_MAX_ETH_DEPOSIT_AMOUNT)))) {
    return 'amount-capped';
  }

  return null;
}
