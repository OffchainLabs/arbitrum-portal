'use client';

import { BigNumber, constants, utils } from 'ethers';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { mutate } from 'swr';
import { useAccount } from 'wagmi';

import { useEarnActionTabs } from '@/app-hooks/earn/useEarnActionTabs';
import { useEarnGasEstimate } from '@/app-hooks/earn/useEarnGasEstimate';
import {
  type TransactionCall,
  useEarnTransactionExecution,
} from '@/app-hooks/earn/useEarnTransactionExecution';
import { addTransactionToHistory } from '@/app-hooks/earn/useEarnTransactionHistory';
import {
  checkAmountExceedsBalance,
  getMaxAmountWithGasBuffer,
  validateTransactionStep,
} from '@/app-hooks/earn/useEarnTransactionUtils';
import { useEarnTransferReadiness } from '@/app-hooks/earn/useEarnTransferReadiness';
import {
  invalidateLiquidStakingBalances,
  useTokenBalance,
} from '@/app-hooks/earn/useLiquidStakingBalances';
import { useLiquidStakingPositions } from '@/app-hooks/earn/useLiquidStakingPositions';
import { useLiquidStakingTokenPrice } from '@/app-hooks/earn/useLiquidStakingTokenPrice';
import { useTransactionQuote } from '@/app-hooks/earn/useTransactionQuote';
import { ARB_USDC_LOGO_URL, ARB_USDT_LOGO_URL } from '@/app-lib/earn/constants';
import { OpportunityTableRow } from '@/app-types/earn/vaults';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { formatAmount, formatUSD, truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { formatTransactionError } from '@/bridge/util/isUserRejectedError';
import { Card } from '@/components/Card';
import { OpportunityCategory, Vendor } from '@/earn-api/types';
import type { StandardTransactionHistory, TransactionStep } from '@/earn-api/types';

import { EarnActionSubmitButton } from './EarnActionPanel/EarnActionSubmitButton';
import { EarnActionTabs } from './EarnActionPanel/EarnActionTabs';
import { EarnAmountInputSection } from './EarnActionPanel/EarnAmountInputSection';
import { EarnErrorDisplay } from './EarnActionPanel/EarnErrorDisplay';
import { EarnGasEstimateDisplay } from './EarnActionPanel/EarnGasEstimateDisplay';
import { EarnPositionValueCard } from './EarnActionPanel/EarnPositionValueCard';
import { EarnReceiveAmountSection } from './EarnActionPanel/EarnReceiveAmountSection';
import type { TransactionDetails } from './EarnTransactionDetailsPopup';
import { SlippageSettingsPanel } from './SlippageSettingsPanel';

interface LiquidStakingActionPanelProps {
  opportunity: OpportunityTableRow;
  initialAction?: 'buy' | 'sell';
  hidePositionOnMobile?: boolean;
  checkAndShowToS: () => Promise<boolean>;
  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
}

type ActionType = 'buy' | 'sell';

type TokenOption = {
  symbol: string;
  address: string;
  decimals: number;
  logoUrl: string;
};

// Hardcoded token logos for Arbitrum One
const ETH_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png';
const ARB_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png';

const BUY_TOKEN_OPTIONS: TokenOption[] = [
  { symbol: 'ETH', address: constants.AddressZero, decimals: 18, logoUrl: ETH_LOGO },
  {
    symbol: 'USDC',
    address: CommonAddress.ArbitrumOne.USDC,
    decimals: 6,
    logoUrl: ARB_USDC_LOGO_URL,
  },
  {
    symbol: 'USDT',
    address: CommonAddress.ArbitrumOne.USDT,
    decimals: 6,
    logoUrl: ARB_USDT_LOGO_URL,
  },
  { symbol: 'ARB', address: CommonAddress.ArbitrumOne.ARB, decimals: 18, logoUrl: ARB_LOGO },
];

const SELL_TOKEN_OPTIONS: TokenOption[] = [
  { symbol: 'ETH', address: constants.AddressZero, decimals: 18, logoUrl: ETH_LOGO },
  {
    symbol: 'USDC',
    address: CommonAddress.ArbitrumOne.USDC,
    decimals: 6,
    logoUrl: ARB_USDC_LOGO_URL,
  },
  {
    symbol: 'USDT',
    address: CommonAddress.ArbitrumOne.USDT,
    decimals: 6,
    logoUrl: ARB_USDT_LOGO_URL,
  },
  { symbol: 'ARB', address: CommonAddress.ArbitrumOne.ARB, decimals: 18, logoUrl: ARB_LOGO },
];

const DEFAULT_BUY_TOKEN: TokenOption = {
  symbol: 'ETH',
  address: constants.AddressZero,
  decimals: 18,
  logoUrl: ETH_LOGO,
};
const DEFAULT_SELL_TOKEN: TokenOption = {
  symbol: 'ETH',
  address: constants.AddressZero,
  decimals: 18,
  logoUrl: ETH_LOGO,
};

// Internal Components
interface TokenIconProps {
  src?: string;
  alt: string;
  symbol: string;
  size?: 'sm' | 'md';
}

function TokenIcon({ src, alt, symbol, size = 'md' }: TokenIconProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={`relative ${sizeClass} rounded-full overflow-hidden`}>
      <SafeImage
        src={src}
        alt={alt}
        className={`${sizeClass} rounded-full`}
        fallback={
          <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
            {symbol[0]}
          </div>
        }
      />
    </div>
  );
}

interface TokenDisplayButtonProps {
  token: TokenOption | { symbol: string; logoUrl?: string };
  showDropdown?: boolean;
  onClick?: () => void;
}

function TokenDisplayButton({ token, showDropdown = false, onClick }: TokenDisplayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-neutral-200 rounded flex gap-2 items-center px-4 py-2 text-base font-medium text-white border border-neutral-200 focus:outline-none"
    >
      <TokenIcon src={token.logoUrl} alt={`${token.symbol} logo`} symbol={token.symbol} />
      <span>{token.symbol}</span>
      {showDropdown && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

interface TokenSelectorDropdownProps {
  options: TokenOption[];
  selected: TokenOption;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (token: TokenOption) => void;
}

function TokenSelectorDropdown({
  options,
  selected,
  isOpen,
  onToggle,
  onSelect,
}: TokenSelectorDropdownProps) {
  return (
    <div className="relative token-dropdown">
      <TokenDisplayButton token={selected} showDropdown onClick={onToggle} />
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden z-50 min-w-[200px]">
          {options.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(token);
              }}
              className={`w-full flex gap-2 items-center px-4 py-2 text-base font-medium text-white transition-all ${
                selected.symbol === token.symbol
                  ? 'bg-neutral-200 opacity-100'
                  : 'opacity-50 hover:opacity-75'
              }`}
            >
              <TokenIcon src={token.logoUrl} alt={`${token.symbol} logo`} symbol={token.symbol} />
              <span>{token.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
      {text && <span className="text-gray-400 text-sm">{text}</span>}
    </div>
  );
}

export function LiquidStakingActionPanel({
  opportunity,
  initialAction = 'buy',
  hidePositionOnMobile = false,
  checkAndShowToS,
  showTransactionDetails,
}: LiquidStakingActionPanelProps) {
  const posthog = usePostHog();
  const { address: walletAddress, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>(initialAction);

  // Update selectedAction when initialAction changes
  useEffect(() => {
    setSelectedAction(initialAction);
  }, [initialAction]);

  const [txError, setTxError] = useState<string | null>(null);

  // Reset amount and error when action changes
  useEffect(() => {
    setAmount('');
    setTxError(null);
  }, [selectedAction]);
  const [isBuyTokenDropdownOpen, setIsBuyTokenDropdownOpen] = useState(false);
  const [isSellTokenDropdownOpen, setIsSellTokenDropdownOpen] = useState(false);
  const [slippagePercent, setSlippagePercent] = useState(0.5);

  const outputTokenAddress = opportunity.id.toLowerCase();
  const outputTokenSymbol = opportunity.token;
  const requestChainId = opportunity.chainId;
  const { priceUsd: tokenPrice } = useLiquidStakingTokenPrice(outputTokenAddress);

  const { wstETHBalance, weETHBalance } = useLiquidStakingPositions();
  const userBalance = useMemo(() => {
    if (outputTokenAddress === CommonAddress.ArbitrumOne.WSTETH.toLowerCase()) {
      return wstETHBalance;
    } else if (outputTokenAddress === CommonAddress.ArbitrumOne.WEETH.toLowerCase()) {
      return weETHBalance;
    }
    return null;
  }, [outputTokenAddress, wstETHBalance, weETHBalance]);

  // Check if user has a position (balance > 0)
  const hasPosition = isConnected && userBalance && userBalance.gt(0);

  const actionTabs = useEarnActionTabs({
    primaryAction: { id: 'buy', label: 'Buy' },
    secondaryAction: { id: 'sell', label: 'Sell' },
    hasSecondaryAction: !!hasPosition,
    selectedAction,
    setSelectedAction: setSelectedAction as (action: string) => void,
  });

  const [selectedBuyToken, setSelectedBuyToken] = useState<TokenOption>(DEFAULT_BUY_TOKEN);
  const [selectedSellToken, setSelectedSellToken] = useState<TokenOption>(DEFAULT_SELL_TOKEN);

  const fromTokenAddress =
    selectedAction === 'buy'
      ? selectedBuyToken?.address || constants.AddressZero
      : outputTokenAddress;
  const toTokenAddress =
    selectedAction === 'buy'
      ? outputTokenAddress
      : selectedSellToken?.address || constants.AddressZero;

  // Convert amount to raw units for API
  const amountInRawUnits = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '0';
    const decimals = selectedAction === 'buy' ? selectedBuyToken?.decimals || 18 : 18;
    try {
      return utils.parseUnits(truncateExtraDecimals(amount, decimals), decimals).toString();
    } catch {
      return '0';
    }
  }, [amount, selectedAction, selectedBuyToken]);

  const selectedTokenAddress =
    selectedAction === 'buy' &&
    selectedBuyToken &&
    selectedBuyToken.address !== constants.AddressZero
      ? selectedBuyToken.address
      : null;

  const { balance: ethBalance, refetch: refetchEthBalance } = useTokenBalance({
    tokenAddress: null, // null for native ETH
    chainId: requestChainId,
    enabled: isConnected && selectedAction === 'buy',
  });
  const { balance: erc20Balance, refetch: refetchErc20Balance } = useTokenBalance({
    tokenAddress: selectedTokenAddress,
    chainId: requestChainId,
    enabled: isConnected && !!selectedTokenAddress,
  });

  const currentBalanceRaw = useMemo(() => {
    if (!isConnected) return BigNumber.from('0');
    if (selectedAction === 'buy') {
      if (!selectedBuyToken) return BigNumber.from('0');
      if (selectedBuyToken.address === constants.AddressZero) {
        return ethBalance || BigNumber.from('0');
      } else {
        return erc20Balance || BigNumber.from('0');
      }
    } else {
      return userBalance || BigNumber.from('0');
    }
  }, [isConnected, selectedAction, selectedBuyToken, ethBalance, erc20Balance, userBalance]);

  const amountExceedsBalance = useMemo(
    () =>
      checkAmountExceedsBalance(amountInRawUnits, currentBalanceRaw, isConnected, walletAddress),
    [amountInRawUnits, currentBalanceRaw, isConnected, walletAddress],
  );

  const {
    data: transactionQuote,
    isLoading: routeLoading,
    error: routeError,
  } = useTransactionQuote({
    opportunityId: opportunity.id,
    category: OpportunityCategory.LiquidStaking,
    chainId: opportunity.chainId,
    action: 'swap',
    amount: amountInRawUnits,
    userAddress: walletAddress || null,
    inputTokenAddress: fromTokenAddress,
    outputTokenAddress: toTokenAddress,
    slippage: slippagePercent,
    enabled: amountInRawUnits !== '0' && !!walletAddress && !amountExceedsBalance,
  });

  // Extract receive amount from transaction quote
  const receiveAmount = useMemo(() => {
    if (!transactionQuote?.receiveAmount) return null;
    const receiveDecimals = selectedAction === 'sell' ? (selectedSellToken?.decimals ?? 18) : 18;

    try {
      return utils.formatUnits(transactionQuote.receiveAmount, receiveDecimals);
    } catch {
      return null;
    }
  }, [transactionQuote, selectedAction, selectedSellToken]);

  const currentDecimals = selectedAction === 'buy' ? selectedBuyToken?.decimals || 18 : 18;
  const currentSymbol =
    selectedAction === 'buy' ? selectedBuyToken?.symbol || 'ETH' : outputTokenSymbol;

  // Use unified transfer readiness hook
  const transferReadiness = useEarnTransferReadiness({
    amount,
    amountBalance: currentBalanceRaw,
    amountDecimals: currentDecimals,
    amountSymbol: currentSymbol,
    nativeBalance: ethBalance || undefined,
    chainId: requestChainId,
    transactionSteps: transactionQuote?.transactionSteps,
    apiGasEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress,
  });

  // Use unified gas estimation hook
  const {
    estimate: estimatedTxCostUsd,
    isLoading: isGasEstimateLoading,
    error: gasEstimateError,
  } = useEarnGasEstimate({
    transactionSteps: transactionQuote?.transactionSteps,
    chainId: requestChainId,
    walletAddress: walletAddress || undefined,
    apiEstimate: transactionQuote?.estimatedGasUsd,
    enabled: isConnected && !!walletAddress && !amountExceedsBalance,
  });

  const handleTransactionSuccess = useCallback(
    async (txHash: string | undefined) => {
      const submittedAmountRaw = amountInRawUnits;
      setAmount('');

      // Refetch balances after transaction
      // Refetch ETH balance if buying with ETH
      if (selectedAction === 'buy' && selectedBuyToken?.address === constants.AddressZero) {
        refetchEthBalance();
      }
      // Refetch ERC20 balance if buying with ERC20 token
      if (selectedAction === 'buy' && selectedTokenAddress) {
        refetchErc20Balance();
      }
      // Invalidate all token balances to ensure liquid staking positions are refreshed
      if (walletAddress) {
        mutate(invalidateLiquidStakingBalances(walletAddress, requestChainId));
      }

      // Extract transaction details for popup and history
      const timestamp = Math.floor(Date.now() / 1000);
      const txChainId = requestChainId;
      const quoteReceiveAmount = transactionQuote?.receiveAmount;
      const hasReceiveAmount = Boolean(quoteReceiveAmount && /^\d+$/.test(quoteReceiveAmount));
      const inputAmountRaw = submittedAmountRaw;
      const inputTokenSymbol = currentSymbol;
      const inputTokenDecimals = currentDecimals;
      const inputAssetLogo =
        selectedAction === 'buy'
          ? selectedBuyToken?.logoUrl || opportunity.tokenIcon
          : opportunity.tokenIcon;
      const historyAmountRaw: string = hasReceiveAmount
        ? quoteReceiveAmount || submittedAmountRaw
        : submittedAmountRaw;
      const historyTokenSymbol: string = hasReceiveAmount
        ? selectedAction === 'buy'
          ? outputTokenSymbol
          : (selectedSellToken?.symbol ?? currentSymbol)
        : currentSymbol;
      const historyTokenDecimals = hasReceiveAmount
        ? selectedAction === 'buy'
          ? 18
          : (selectedSellToken?.decimals ?? currentDecimals)
        : currentDecimals;
      const historyAssetLogo = hasReceiveAmount
        ? selectedAction === 'buy'
          ? opportunity.tokenIcon
          : selectedSellToken?.logoUrl || opportunity.tokenIcon
        : opportunity.tokenIcon;

      const transactionDetails = {
        action: selectedAction,
        amount: historyAmountRaw,
        tokenSymbol: historyTokenSymbol,
        decimals: historyTokenDecimals,
        assetLogo: historyAssetLogo,
        chainId: txChainId,
        txHash, // Include txHash so it shows in the popup
        timestamp,
        protocolName: opportunity.protocol,
        protocolLogo: opportunity.protocolIcon,
        networkFee: estimatedTxCostUsd
          ? {
              amount: estimatedTxCostUsd.eth,
              usd: estimatedTxCostUsd.usd ?? '0.00',
            }
          : undefined,
        opportunityName: opportunity.token || 'Liquid Staking',
      };

      if (txHash) {
        posthog?.capture('Earn Transaction Succeeded', {
          page: 'Earn',
          section: 'Action Panel',
          category: OpportunityCategory.LiquidStaking,
          action: selectedAction,
          opportunityId: opportunity.id,
          opportunityName: opportunity.name,
          protocol: opportunity.protocol,
          chainId: requestChainId,
          transactionHash: txHash,
          walletConnected: isConnected,
          inputToken: inputTokenSymbol,
          inputAmountRaw,
          outputToken: historyTokenSymbol,
          outputAmountRaw: hasReceiveAmount ? historyAmountRaw : undefined,
          slippagePercent,
        });
      }

      // Add transaction to history cache (optimistic update)
      if (walletAddress && txHash) {
        const newTransaction: StandardTransactionHistory = {
          timestamp,
          eventType: selectedAction === 'buy' ? 'buy' : 'sell',
          assetAmountRaw: historyAmountRaw,
          assetSymbol: historyTokenSymbol,
          decimals: historyTokenDecimals,
          assetLogo: historyAssetLogo,
          inputAssetAmountRaw: inputAmountRaw,
          inputAssetSymbol: inputTokenSymbol,
          inputAssetDecimals: inputTokenDecimals,
          inputAssetLogo,
          outputAssetAmountRaw: hasReceiveAmount ? historyAmountRaw : undefined,
          outputAssetSymbol: hasReceiveAmount ? historyTokenSymbol : undefined,
          outputAssetDecimals: hasReceiveAmount ? historyTokenDecimals : undefined,
          outputAssetLogo: hasReceiveAmount ? historyAssetLogo : undefined,
          chainId: txChainId,
          transactionHash: txHash,
        };

        await addTransactionToHistory({
          category: OpportunityCategory.LiquidStaking,
          opportunityId: opportunity.id,
          userAddress: walletAddress,
          chainId: requestChainId,
          vendor: Vendor.LiFi,
          transaction: newTransaction,
        });
      }

      // Show transaction details popup after receipt is confirmed (with tick animation)
      if (txHash) {
        showTransactionDetails(transactionDetails, true);
      }
    },
    [
      amountInRawUnits,
      currentDecimals,
      selectedAction,
      currentSymbol,
      outputTokenSymbol,
      opportunity.tokenIcon,
      opportunity.name,
      opportunity.protocol,
      opportunity.protocolIcon,
      opportunity.token,
      opportunity.id,
      walletAddress,
      selectedBuyToken,
      selectedSellToken,
      refetchEthBalance,
      refetchErc20Balance,
      selectedTokenAddress,
      requestChainId,
      transactionQuote?.receiveAmount,
      estimatedTxCostUsd,
      isConnected,
      posthog,
      showTransactionDetails,
      slippagePercent,
    ],
  );

  // Build transaction calls from API response (simplified - no client-side approval checks)
  const buildBatchCalls = useCallback(async (): Promise<TransactionCall[]> => {
    if (!transactionQuote?.transactionSteps || transactionQuote.transactionSteps.length === 0) {
      throw new Error('No transaction steps found');
    }

    return transactionQuote.transactionSteps.map((step: TransactionStep, index: number) => {
      validateTransactionStep(step, index);

      let value: bigint | undefined;
      if (step.value) {
        const valueStr = step.value.toString().toLowerCase().trim();
        const isZero =
          valueStr === '0' ||
          valueStr === '0x0' ||
          valueStr === '0x' ||
          BigInt(step.value) === BigInt(0);

        value = isZero ? undefined : BigInt(step.value);
      }

      return {
        to: step.to as `0x${string}`,
        data: step.data as `0x${string}`,
        value,
        chainId: step.chainId,
      };
    });
  }, [transactionQuote]);

  const { executeTx, isExecuting } = useEarnTransactionExecution({
    chainId: requestChainId,
    buildCalls: buildBatchCalls,
    onTransactionFinished: async ({ txHash }) => {
      // Handle success with txHash (hook handles both batch and sequential)
      await handleTransactionSuccess(txHash);
    },
    inputAmount: amount,
  });

  const handleTransaction = async () => {
    if (
      !transferReadiness.isReady ||
      !transactionQuote?.transactionSteps ||
      transactionQuote.transactionSteps.length === 0 ||
      !walletAddress
    )
      return;

    // Check ToS before proceeding (hook validates but doesn't show popup)
    const tosAccepted = await checkAndShowToS();
    if (!tosAccepted) return;

    setTxError(null);

    try {
      // useEarnTransactionExecution handles both batch and sequential execution
      // including EIP-7702 fallback automatically
      await executeTx();
    } catch (error) {
      setTxError(formatTransactionError(error));
    }
  };

  const handleMaxClick = () => {
    const isNativeBuy =
      selectedAction === 'buy' && selectedBuyToken?.address === constants.AddressZero;
    const maxAmount = getMaxAmountWithGasBuffer({
      balanceRaw: currentBalanceRaw,
      decimals: currentDecimals,
      isNativeAsset: Boolean(isNativeBuy),
      estimatedGasEth: estimatedTxCostUsd?.eth,
    });
    setAmount(maxAmount);
  };

  const handleActionChange = useCallback(
    (action: string) => {
      if (action === selectedAction) return;
      setSelectedAction(action as ActionType);
      setAmount('');
      setTxError(null);
      posthog?.capture('Earn Action Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.LiquidStaking,
        action,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: requestChainId,
        walletConnected: isConnected,
      });
    },
    [
      isConnected,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      requestChainId,
      selectedAction,
    ],
  );

  const handleSlippageChange = (value: number) => {
    if (value === slippagePercent) return;
    setSlippagePercent(value);
    posthog?.capture('Earn Slippage Updated', {
      page: 'Earn',
      section: 'Action Panel',
      category: OpportunityCategory.LiquidStaking,
      action: selectedAction,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      protocol: opportunity.protocol,
      chainId: requestChainId,
      slippagePercent: value,
    });
  };

  const handleBuyTokenSelect = (token: TokenOption) => {
    if (selectedBuyToken?.address.toLowerCase() === token.address.toLowerCase()) {
      setIsBuyTokenDropdownOpen(false);
      return;
    }
    setSelectedBuyToken(token);
    setIsBuyTokenDropdownOpen(false);
    posthog?.capture('Earn Input Token Selected', {
      page: 'Earn',
      section: 'Action Panel',
      category: OpportunityCategory.LiquidStaking,
      action: selectedAction,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      protocol: opportunity.protocol,
      chainId: requestChainId,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
    });
  };

  const handleSellTokenSelect = (token: TokenOption) => {
    if (selectedSellToken?.address.toLowerCase() === token.address.toLowerCase()) {
      setIsSellTokenDropdownOpen(false);
      return;
    }
    setSelectedSellToken(token);
    setIsSellTokenDropdownOpen(false);
    posthog?.capture('Earn Input Token Selected', {
      page: 'Earn',
      section: 'Action Panel',
      category: OpportunityCategory.LiquidStaking,
      action: selectedAction,
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      protocol: opportunity.protocol,
      chainId: requestChainId,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.token-dropdown')) {
        setIsBuyTokenDropdownOpen(false);
        setIsSellTokenDropdownOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, []);

  const currentBalanceFormatted = formatAmount(currentBalanceRaw, {
    decimals: currentDecimals,
    symbol: currentSymbol,
  });
  const currentBalanceAmount = useMemo(
    () => Number(utils.formatUnits(currentBalanceRaw, currentDecimals)),
    [currentBalanceRaw, currentDecimals],
  );
  const inputTokenUnitUsd = useMemo(() => {
    if (selectedAction === 'sell') {
      return tokenPrice;
    }

    if (tokenPrice == null || !receiveAmount) {
      return null;
    }

    const inputAmount = Number(amount);
    const receiveAmountNumber = Number(receiveAmount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      return null;
    }
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return null;
    }

    return (receiveAmountNumber * tokenPrice) / inputAmount;
  }, [selectedAction, tokenPrice, receiveAmount, amount]);
  const currentUsdValue = useMemo(() => {
    if (inputTokenUnitUsd == null || !Number.isFinite(currentBalanceAmount)) {
      return undefined;
    }

    return currentBalanceAmount * inputTokenUnitUsd;
  }, [currentBalanceAmount, inputTokenUnitUsd]);

  const positionValue = useMemo(() => {
    if (!isConnected || !userBalance || !userBalance.gt(0)) return undefined;

    const balanceInTokens = parseFloat(utils.formatUnits(userBalance, 18));
    const usdValue =
      tokenPrice !== null && !isNaN(balanceInTokens)
        ? formatUSD(balanceInTokens * tokenPrice)
        : '—';

    return {
      amount: formatAmount(userBalance, {
        decimals: 18,
        symbol: outputTokenSymbol,
      }),
      usdValue,
    };
  }, [isConnected, userBalance, outputTokenSymbol, tokenPrice]);

  const inputTokenSelector =
    selectedAction === 'buy' ? (
      <TokenSelectorDropdown
        options={BUY_TOKEN_OPTIONS}
        selected={selectedBuyToken}
        isOpen={isBuyTokenDropdownOpen}
        onToggle={() => setIsBuyTokenDropdownOpen(!isBuyTokenDropdownOpen)}
        onSelect={handleBuyTokenSelect}
      />
    ) : (
      <div className="bg-neutral-200 rounded flex gap-2 items-center px-4 py-2">
        <TokenIcon src={opportunity.tokenIcon} alt={outputTokenSymbol} symbol={outputTokenSymbol} />
        <span className="text-base font-medium text-white">{outputTokenSymbol}</span>
      </div>
    );

  const receiveAmountTokenSelector =
    selectedAction === 'sell' ? (
      <TokenSelectorDropdown
        options={SELL_TOKEN_OPTIONS}
        selected={selectedSellToken || SELL_TOKEN_OPTIONS[0]}
        isOpen={isSellTokenDropdownOpen}
        onToggle={() => setIsSellTokenDropdownOpen(!isSellTokenDropdownOpen)}
        onSelect={handleSellTokenSelect}
      />
    ) : undefined;

  const receiveAmountDisplay = useMemo(() => {
    if (!receiveAmount) {
      return null;
    }

    const receiveAmountNumber = Number(receiveAmount);
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return null;
    }

    return `${receiveAmountNumber.toFixed(6)}${
      selectedAction === 'sell' ? ` ${selectedSellToken?.symbol || ''}` : ''
    }`;
  }, [receiveAmount, selectedAction, selectedSellToken]);
  const receiveUsdValue = useMemo(() => {
    if (!receiveAmount || selectedAction !== 'buy' || tokenPrice === null) {
      return undefined;
    }

    const receiveAmountNumber = parseFloat(receiveAmount);
    if (!Number.isFinite(receiveAmountNumber) || receiveAmountNumber <= 0) {
      return undefined;
    }

    return `~${formatUSD(receiveAmountNumber * tokenPrice)}`;
  }, [receiveAmount, selectedAction, tokenPrice]);

  const transactionDetails = useMemo(() => {
    const details = [];
    if (opportunity.apy) {
      details.push({ label: 'APY', value: opportunity.apy });
    }
    details.push({
      label: 'Transaction Cost',
      value: (
        <EarnGasEstimateDisplay
          estimate={estimatedTxCostUsd}
          isLoading={isGasEstimateLoading}
          error={gasEstimateError}
        />
      ),
    });
    return details;
  }, [opportunity.apy, estimatedTxCostUsd, isGasEstimateLoading, gasEstimateError]);

  return (
    <Card className="bg-neutral-50 rounded flex flex-col gap-4 p-4 !overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">
          {selectedAction === 'buy' ? 'Buy' : 'Sell'} {outputTokenSymbol}
        </h3>
      </div>

      {/* Position Value Card */}
      {positionValue && (
        <EarnPositionValueCard
          positionValue={positionValue}
          className={hidePositionOnMobile ? 'hidden lg:flex' : undefined}
        />
      )}

      {/* Action Tabs */}
      <EarnActionTabs
        tabs={actionTabs}
        selectedAction={selectedAction}
        onActionChange={handleActionChange}
      />

      {/* Amount Input Section */}
      <EarnAmountInputSection
        amount={amount}
        onAmountChange={setAmount}
        onMaxClick={handleMaxClick}
        label={selectedAction === 'buy' ? `Swap for ${outputTokenSymbol}` : 'Amount to sell'}
        inputToken={{
          symbol: currentSymbol,
          logoUrl: selectedAction === 'buy' ? selectedBuyToken?.logoUrl : opportunity.tokenIcon,
        }}
        inputTokenSelector={inputTokenSelector}
        currentBalance={currentBalanceFormatted}
        currentBalanceAmount={currentBalanceAmount}
        currentUsdValue={currentUsdValue}
        isAmountExceedsBalance={amountExceedsBalance}
        isConnected={isConnected}
        decimals={currentDecimals}
        validationError={
          routeError?.message ||
          (transferReadiness.errorMessage
            ? typeof transferReadiness.errorMessage === 'string'
              ? transferReadiness.errorMessage
              : String(transferReadiness.errorMessage)
            : null)
        }
      />

      {/* Receive Amount Section */}
      <EarnReceiveAmountSection
        label="You will receive"
        amount={receiveAmountDisplay}
        isLoading={routeLoading}
        token={{
          symbol: selectedAction === 'buy' ? outputTokenSymbol : selectedSellToken?.symbol || 'ETH',
          logoUrl: selectedAction === 'buy' ? opportunity.tokenIcon : selectedSellToken?.logoUrl,
        }}
        tokenSelector={receiveAmountTokenSelector}
        usdValue={receiveUsdValue}
      />

      {/* Transaction Details */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center">
          <span className="text-xs text-white">Transaction Details</span>
        </div>
        <SlippageSettingsPanel
          slippagePercent={slippagePercent}
          onSlippageChange={handleSlippageChange}
        />
        {transactionDetails.map((detail, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-xs text-gray-650">{detail.label}</span>
            <span className="text-xs text-white">{detail.value}</span>
          </div>
        ))}
      </div>

      {/* Error Display - Only show transaction execution errors, not validation errors */}
      <EarnErrorDisplay error={txError || null} />

      {/* Submit Button */}
      <EarnActionSubmitButton
        label={
          isExecuting ? (
            <LoadingSpinner text="Executing..." />
          ) : selectedAction === 'buy' ? (
            'Buy'
          ) : (
            'Sell'
          )
        }
        onClick={handleTransaction}
        isSubmitting={isExecuting}
        disabled={
          !transferReadiness.isReady ||
          routeLoading ||
          !transactionQuote ||
          transferReadiness.isLoading
        }
        isConnected={isConnected}
      />
    </Card>
  );
}
