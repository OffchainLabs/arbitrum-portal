import { ChildToParentMessage, ChildToParentTransactionEvent, EventArgs } from '@arbitrum/sdk';
import { L2ToL1TransactionEvent as ClassicL2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/abi/ArbSys';
import { Signer } from '@ethersproject/abstract-signer';
import { JsonRpcProvider } from '@ethersproject/providers';
import { useLocalStorage } from '@rehooks/local-storage';
import { TokenList } from '@uniswap/token-lists';
import { BigNumber } from 'ethers';
import { useCallback, useState } from 'react';
import { Chain } from 'viem';
import { useAccount } from 'wagmi';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { CommonAddress } from '../util/CommonAddressUtils';
import { getL2NativeToken } from '../util/L2NativeUtils';
import {
  isLifiOnlyToken,
  isTokenAvailableOnChain,
  tokenListTokenToBridgeToken,
} from '../util/TokenListUtils';
import {
  fetchErc20Data,
  getL1ERC20Address,
  getL2ERC20Address,
  isValidErc20,
  l1TokenIsDisabled,
} from '../util/TokenUtils';
import { mergeBridgeTokens } from '../util/mergeBridgeTokens';
import { isNetwork } from '../util/networks';
import {
  ArbTokenBridge,
  ContractStorage,
  ERC20BridgeToken,
  L2ToL1EventResult,
  L2ToL1EventResultPlus,
  TokenType,
} from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useBalance } from './useBalance';

export const wait = (ms = 0) => {
  return new Promise((res) => setTimeout(res, ms));
};

function isClassicL2ToL1TransactionEvent(
  event: ChildToParentTransactionEvent,
): event is EventArgs<ClassicL2ToL1TransactionEvent> {
  return typeof (event as any).batchNumber !== 'undefined';
}

export function getExecutedMessagesCacheKey({
  event,
  l2ChainId,
}: {
  event: L2ToL1EventResult;
  l2ChainId: number;
}) {
  return isClassicL2ToL1TransactionEvent(event)
    ? `l2ChainId: ${l2ChainId}, batchNumber: ${event.batchNumber.toString()}, indexInBatch: ${event.indexInBatch.toString()}`
    : `l2ChainId: ${l2ChainId}, position: ${event.position.toString()}`;
}

export function getUniqueIdOrHashFromEvent(event: L2ToL1EventResult): BigNumber {
  const anyEvent = event as any;

  // Nitro
  if (anyEvent.hash) {
    return anyEvent.hash as BigNumber;
  }

  // Classic
  return anyEvent.uniqueId as BigNumber;
}

class TokenDisabledError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'TokenDisabledError';
  }
}

export interface TokenBridgeParams {
  l1: { provider: JsonRpcProvider; network: Chain };
  l2: { provider: JsonRpcProvider; network: Chain };
}

export const useArbTokenBridge = (params: TokenBridgeParams): ArbTokenBridge => {
  const { l1, l2 } = params;
  const { address: walletAddress } = useAccount();
  const [bridgeTokens, setBridgeTokens] = useState<ContractStorage<ERC20BridgeToken> | undefined>(
    undefined,
  );

  const [{ destinationAddress }] = useArbQueryParams();

  const {
    erc20: [, updateErc20L1Balance],
  } = useBalance({
    chainId: l1.network.id,
    walletAddress,
  });
  const {
    erc20: [, updateErc20L2Balance],
  } = useBalance({
    chainId: l2.network.id,
    walletAddress,
  });
  const {
    erc20: [, updateErc20L1CustomDestinationBalance],
  } = useBalance({
    chainId: l1.network.id,
    walletAddress: destinationAddress,
  });
  const {
    erc20: [, updateErc20CustomDestinationL2Balance],
  } = useBalance({
    chainId: l2.network.id,
    walletAddress: destinationAddress,
  });

  interface ExecutedMessagesCache {
    [id: string]: boolean;
  }

  const [executedMessagesCache, setExecutedMessagesCache] = useLocalStorage<ExecutedMessagesCache>(
    'arbitrum:bridge:executed-messages',
    {},
  ) as [ExecutedMessagesCache, React.Dispatch<ExecutedMessagesCache>, React.Dispatch<void>];

  const removeTokensFromList = (listID: string) => {
    setBridgeTokens((prevBridgeTokens) => {
      const newBridgeTokens = { ...prevBridgeTokens };
      for (const address in bridgeTokens) {
        const token = bridgeTokens[address];
        if (!token) continue;

        token.listIds.delete(listID);

        if (token.listIds.size === 0) {
          delete newBridgeTokens[address];
        }
      }
      return newBridgeTokens;
    });
  };

  const addTokensFromList = async (arbTokenList: TokenList, listId: string) => {
    const l1ChainID = l1.network.id;
    const l2ChainID = l2.network.id;

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {};

    const candidateUnpairedTokensToAdd: ERC20BridgeToken[] = [];

    for (const tokenData of arbTokenList.tokens) {
      const bridgeToken = tokenListTokenToBridgeToken({
        token: tokenData,
        listId,
        parentChainId: l1ChainID,
        childChainId: l2ChainID,
      });

      if (!bridgeToken) {
        continue;
      }

      if (!isLifiOnlyToken(bridgeToken) && bridgeToken.l2Address) {
        bridgeTokensToAdd[bridgeToken.address] = bridgeToken;
      }
      // Save potentially unpaired tokens. Giant lists (for example CMC) currently hurt page
      // performance, so only add their paired tokens.
      else if (arbTokenList.tokens.length < 1000) {
        candidateUnpairedTokensToAdd.push(bridgeToken);
      }
    }

    // Add one-sided tokens only when no paired token uses the same storage address.
    const addressesOfPairedTokens = new Set(
      Object.keys(bridgeTokensToAdd).map(
        (address) =>
          address.toLowerCase() /* lists should have the checksummed case anyway, but just in case (pun unintended) */,
      ),
    );
    for (const unpairedToken of candidateUnpairedTokensToAdd) {
      if (!addressesOfPairedTokens.has(unpairedToken.address.toLowerCase())) {
        bridgeTokensToAdd[unpairedToken.address] = unpairedToken;
      }
    }

    // Callback is used here, so we can add listId to the set of listIds rather than creating a new set everytime
    setBridgeTokens((oldBridgeTokens) => {
      const l1Addresses: string[] = [];
      const l2Addresses: string[] = [];

      // USDC is not on any token list as it's unbridgeable
      // but we still want to detect its balance on user's wallet
      if (isNetwork(l2ChainID).isArbitrumOne) {
        l2Addresses.push(CommonAddress.ArbitrumOne.USDC);
      }
      if (isNetwork(l2ChainID).isArbitrumSepolia) {
        l2Addresses.push(CommonAddress.ArbitrumSepolia.USDC);
      }

      for (const tokenAddress in bridgeTokensToAdd) {
        const tokenToAdd = bridgeTokensToAdd[tokenAddress];
        if (!tokenToAdd) {
          return;
        }
        const existingToken = oldBridgeTokens?.[tokenToAdd.address];
        bridgeTokensToAdd[tokenAddress] = mergeBridgeTokens({
          existingToken,
          incomingToken: tokenToAdd,
          incomingListId: listId,
        });
        const { address, l2Address } = bridgeTokensToAdd[tokenAddress];
        if (address && isTokenAvailableOnChain(bridgeTokensToAdd[tokenAddress], l1.network.id)) {
          l1Addresses.push(address);
        }
        if (l2Address && isTokenAvailableOnChain(bridgeTokensToAdd[tokenAddress], l2.network.id)) {
          l2Addresses.push(l2Address);
        }
      }

      updateErc20L1Balance(l1Addresses);
      updateErc20L2Balance(l2Addresses);

      return {
        ...oldBridgeTokens,
        ...bridgeTokensToAdd,
      };
    });
  };

  async function addToken(erc20L1orL2Address: string) {
    let l1Address: string;
    let l2Address: string | undefined;

    const lowercasedErc20L1orL2Address = erc20L1orL2Address.toLowerCase();
    const maybeL1Address = await getL1ERC20Address({
      erc20L2Address: lowercasedErc20L1orL2Address,
      l2Provider: l2.provider,
    });

    if (maybeL1Address) {
      // looks like l2 address was provided
      l1Address = maybeL1Address;
      l2Address = lowercasedErc20L1orL2Address;
    } else {
      // looks like l1 address was provided
      l1Address = lowercasedErc20L1orL2Address;

      l2Address = await getL2ERC20Address({
        erc20L1Address: l1Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider,
      });
    }

    const bridgeTokensToAdd: ContractStorage<ERC20BridgeToken> = {};
    const erc20Params = { address: l1Address, provider: l1.provider };

    if (!(await isValidErc20(erc20Params))) {
      throw new Error(`${l1Address} is not a valid ERC-20 token`);
    }

    const { name, symbol, decimals } = await fetchErc20Data(erc20Params);

    const isDisabled = await l1TokenIsDisabled({
      erc20L1Address: l1Address,
      l1Provider: l1.provider,
      l2Provider: l2.provider,
    });

    if (isDisabled) {
      throw new TokenDisabledError('Token currently disabled');
    }

    const l1AddressLowerCased = l1Address.toLowerCase();
    const existingToken = bridgeTokens?.[l1AddressLowerCased];
    const priceUSD = existingToken?.priceUSD || undefined;
    bridgeTokensToAdd[l1AddressLowerCased] = {
      name,
      type: TokenType.ERC20,
      symbol,
      address: l1AddressLowerCased,
      l2Address: l2Address?.toLowerCase(),
      decimals,
      listIds: new Set(),
      priceUSD,
    };

    setBridgeTokens((oldBridgeTokens) => {
      return { ...oldBridgeTokens, ...bridgeTokensToAdd };
    });

    updateErc20L1Balance([l1AddressLowerCased]);
    if (l2Address) {
      updateErc20L2Balance([l2Address]);
    }
  }

  async function addLifiTokenForChain(erc20Address: string, chainId: number) {
    const network = chainId === l1.network.id ? l1 : chainId === l2.network.id ? l2 : undefined;

    if (!network) {
      throw new Error(`Chain ${chainId} is not part of the current transfer`);
    }

    const address = erc20Address.toLowerCase();
    const erc20Params = { address, provider: network.provider };

    if (!(await isValidErc20(erc20Params))) {
      throw new Error(`${address} is not a valid ERC-20 token`);
    }

    const { name, symbol, decimals } = await fetchErc20Data(erc20Params);

    setBridgeTokens((oldBridgeTokens) => {
      const existingToken = oldBridgeTokens?.[address];
      const incomingToken: ERC20BridgeToken = {
        name,
        type: TokenType.ERC20,
        symbol,
        address,
        l2Address: chainId === l2.network.id ? address : undefined,
        decimals,
        listIds: new Set(),
        lifiOnlyChainId: chainId,
      };

      return {
        ...oldBridgeTokens,
        [address]: mergeBridgeTokens({ existingToken, incomingToken }),
      };
    });

    if (chainId === l1.network.id) {
      updateErc20L1Balance([address]);
    } else {
      updateErc20L2Balance([address]);
    }
  }

  const updateTokenData = useCallback(
    async (l1Address: string) => {
      if (typeof bridgeTokens === 'undefined') {
        return;
      }
      const l1AddressLowerCased = l1Address.toLowerCase();
      const bridgeToken = bridgeTokens[l1AddressLowerCased];

      if (!bridgeToken) {
        return;
      }

      const newBridgeTokens = { [l1AddressLowerCased]: bridgeToken };
      setBridgeTokens((oldBridgeTokens) => {
        return { ...oldBridgeTokens, ...newBridgeTokens };
      });
      const { l2Address } = bridgeToken;
      updateErc20L1Balance([l1AddressLowerCased]);
      if (destinationAddress) {
        updateErc20L1CustomDestinationBalance([l1AddressLowerCased]);
      }
      if (l2Address) {
        updateErc20L2Balance([l2Address]);
        if (destinationAddress) {
          updateErc20CustomDestinationL2Balance([l2Address]);
        }
      }
    },
    [
      bridgeTokens,
      setBridgeTokens,
      updateErc20L1Balance,
      updateErc20L2Balance,
      updateErc20L1CustomDestinationBalance,
      updateErc20CustomDestinationL2Balance,
      destinationAddress,
    ],
  );

  async function triggerOutboxToken({
    event,
    l1Signer,
  }: {
    event: L2ToL1EventResultPlus;
    l1Signer: Signer;
  }) {
    // sanity check
    if (!event) {
      throw new Error('Outbox message not found');
    }

    if (!walletAddress) {
      return;
    }

    const parentChainProvider = getProviderForChainId(event.parentChainId);
    const childChainProvider = getProviderForChainId(event.childChainId);

    const messageWriter = ChildToParentMessage.fromEvent(l1Signer, event, parentChainProvider);
    const res = await messageWriter.execute(childChainProvider);

    const rec = await res.wait();

    if (rec.status === 1) {
      addToExecutedMessagesCache([event]);
    }

    return rec;
  }

  function addL2NativeToken(erc20L2Address: string) {
    const token = getL2NativeToken(erc20L2Address, l2.network.id);

    setBridgeTokens((oldBridgeTokens) => {
      return {
        ...oldBridgeTokens,
        [`L2-NATIVE:${token.address}`]: {
          name: token.name,
          type: TokenType.ERC20,
          symbol: token.symbol,
          address: token.address,
          l2Address: token.address,
          decimals: token.decimals,
          logoURI: token.logoURI,
          listIds: new Set(),
          isL2Native: true,
        },
      };
    });
  }

  async function triggerOutboxEth({
    event,
    l1Signer,
  }: {
    event: L2ToL1EventResultPlus;
    l1Signer: Signer;
  }) {
    // sanity check
    if (!event) {
      throw new Error('Outbox message not found');
    }

    if (!walletAddress) {
      return;
    }

    const parentChainProvider = getProviderForChainId(event.parentChainId);
    const childChainProvider = getProviderForChainId(event.childChainId);

    const messageWriter = ChildToParentMessage.fromEvent(l1Signer, event, parentChainProvider);

    const res = await messageWriter.execute(childChainProvider);

    const rec = await res.wait();

    if (rec.status === 1) {
      addToExecutedMessagesCache([event]);
    }

    return rec;
  }

  function addToExecutedMessagesCache(events: L2ToL1EventResult[]) {
    const added: { [cacheKey: string]: boolean } = {};

    events.forEach((event: L2ToL1EventResult) => {
      const cacheKey = getExecutedMessagesCacheKey({
        event,
        l2ChainId: l2.network.id,
      });

      added[cacheKey] = true;
    });

    setExecutedMessagesCache({ ...executedMessagesCache, ...added });
  }

  return {
    bridgeTokens,
    eth: {
      triggerOutbox: triggerOutboxEth,
    },
    token: {
      add: addToken,
      addLifiTokenForChain,
      addL2NativeToken,
      addTokensFromList,
      removeTokensFromList,
      updateTokenData,
      triggerOutbox: triggerOutboxToken,
    },
  };
};
