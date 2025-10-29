'use client';

import { BigNumber, utils } from 'ethers';
import { useState } from 'react';
import { useAccount } from 'wagmi';

import { useActions } from '../../hooks/earn/useActions';
import { useVaultTransaction } from '../../hooks/earn/useVaultTransaction';
import { useVaultTransactionContext } from '../../hooks/earn/useVaultTransactionContext';
import { DetailedVault } from '../../types/vaults';
import { formatAmount } from '../../util/NumberUtils';
import { Button } from '../common/Button';

interface VaultActionPanelProps {
  vault: DetailedVault;
}

// example transactionContext:
// {
//   "currentDepositStep": "deposit",
//   "depositSteps": [
//       {
//           "actions": [
//               "approve",
//               "deposit"
//           ],
//           "actionsUrl": "/v2/transactions/deposit/0x2cd28Cda6825C4967372478E87D004637B73F996/arbitrum/0x724dc807b04555b71ed48a6896b6F41593b8C637",
//           "name": "deposit"
//       }
//   ],
//   "currentRedeemStep": "redeem",
//   "redeemSteps": [
//       {
//           "actions": [
//               "redeem"
//           ],
//           "actionsUrl": "/v2/transactions/redeem/0x2cd28Cda6825C4967372478E87D004637B73F996/arbitrum/0x724dc807b04555b71ed48a6896b6F41593b8C637",
//           "name": "redeem"
//       }
//   ],
//   "lpToken": {
//       "address": "0x724dc807b04555b71ed48a6896b6F41593b8C637",
//       "tokenCaip": "eip155:42161/erc20:0x724dc807b04555b71ed48a6896b6F41593b8C637",
//       "name": "Aave Arbitrum USDCn",
//       "symbol": "aArbUSDCn",
//       "decimals": 6,
//       "balanceNative": "5243",
//       "balanceUsd": "0.00524228"
//   },
//   "asset": {
//       "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
//       "assetCaip": "eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
//       "name": "USD Coin",
//       "symbol": "USDC",
//       "decimals": 6,
//       "assetGroup": "USD",
//       "balanceNative": "15745",
//       "balanceUsd": "0.01574286",
//       "positionValueInAsset": "5243"
//   },
//   "additionalAssets": [],
//   "childrenPositions": []
// }

type ActionType = 'supply' | 'withdraw';
type TxState = 'idle' | 'loading' | 'success';

export function VaultActionPanel({ vault }: VaultActionPanelProps) {
  const { address: walletAddress } = useAccount();

  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>('supply');
  const [txState, setTxState] = useState<TxState>('idle');
  const [txError, setTxError] = useState<string | null>(null);

  // Fetch transaction context
  const {
    transactionContext,
    isLoading: contextLoading,
    refetch: refetchContext,
  } = useVaultTransactionContext(
    walletAddress || null,
    vault.network?.name || 'arbitrum',
    vault.address,
  );

  // Get data from transactionContext
  const asset = (transactionContext as any)?.asset;
  const lpToken = (transactionContext as any)?.lpToken;

  // Asset data (for deposits)
  const assetDecimals = asset?.decimals || 18;
  const assetSymbol = asset?.symbol || vault.asset.symbol;
  const assetBalanceRaw = BigNumber.from(asset?.balanceNative ?? '0');
  const assetBalance = Number(utils.formatUnits(assetBalanceRaw, assetDecimals));
  const assetUsdValue = parseFloat(asset?.balanceUsd ?? '0');

  // LP Token data (for withdrawals)
  const lpTokenDecimals = lpToken?.decimals || 18;
  const lpTokenSymbol = lpToken?.symbol || vault.lpToken?.symbol || 'LP';
  const lpTokenBalanceRaw = BigNumber.from(lpToken?.balanceNative ?? '0');
  const lpTokenBalance = Number(utils.formatUnits(lpTokenBalanceRaw, lpTokenDecimals));
  const lpTokenUsdValue = parseFloat(lpToken?.balanceUsd ?? '0');

  // Convert amount to raw units for API call
  const amountInRawUnits =
    amount && parseFloat(amount) > 0
      ? utils
          .parseUnits(amount, selectedAction === 'supply' ? assetDecimals : lpTokenDecimals)
          .toString()
      : '0';

  // Fetch actions for the selected action
  const { actions, isLoading: actionsLoading } = useActions({
    action: selectedAction === 'supply' ? 'deposit' : 'redeem',
    userAddress: walletAddress || null,
    vault,
    amount: amountInRawUnits,
    assetAddress:
      selectedAction === 'supply' ? asset?.address || vault.asset.address : vault.asset.address,
  });

  // Transaction execution hook
  const { executeTx, isBatchSupported, currentActionIndex, isExecuting } = useVaultTransaction(
    actions,
    amount,
    () => {
      setTxState('success');
      // Refetch context to get updated balances
      refetchContext();
    },
  );

  // Check available actions
  const hasDeposit = (transactionContext as any)?.depositSteps?.some((step: any) =>
    step.actions?.includes('deposit'),
  );
  const hasRedeem = (transactionContext as any)?.redeemSteps?.some((step: any) =>
    step.actions?.includes('redeem'),
  );

  const currentApr: string = (() => {
    const ctxApr = (transactionContext as any)?.apy;
    if (typeof ctxApr === 'number') return `${ctxApr.toFixed(2)}%`;
    if (typeof (vault as any)?.apy === 'object') {
      const v = (vault as any).apy?.['7day']?.total;
      if (typeof v === 'number') return `${v.toFixed(2)}%`;
    }
    if (typeof (vault as any)?.apy === 'number') return `${(vault as any).apy}%`;
    return '—';
  })();

  // todo: fix the logic here later
  const estimatedTxCostUsd: string = (() => {
    const cost =
      (transactionContext as any)?.estimatedCosts?.usd ??
      (transactionContext as any)?.gas?.usd ??
      null;
    if (typeof cost === 'number') return `$${cost.toFixed(2)} USD`;
    return '-';
  })();

  const handleMaxClick = () => {
    if (selectedAction === 'supply') {
      setAmount(utils.formatUnits(assetBalanceRaw, assetDecimals));
    } else {
      setAmount(utils.formatUnits(lpTokenBalanceRaw, lpTokenDecimals));
    }
  };

  // Get current balance based on selected action
  const currentBalance = selectedAction === 'supply' ? assetBalance : lpTokenBalance;
  const currentBalanceRaw = selectedAction === 'supply' ? assetBalanceRaw : lpTokenBalanceRaw;
  const currentDecimals = selectedAction === 'supply' ? assetDecimals : lpTokenDecimals;
  const currentSymbol = selectedAction === 'supply' ? assetSymbol : lpTokenSymbol;
  const currentUsdValue = selectedAction === 'supply' ? assetUsdValue : lpTokenUsdValue;

  const isAmountValid = amount && parseFloat(amount) > 0 && parseFloat(amount) <= currentBalance;
  const isAmountExceedsBalance = amount && parseFloat(amount) > currentBalance;

  // Handle transaction execution
  const handleTransaction = async () => {
    if (!isAmountValid || !actions || actions.length === 0) return;

    setTxState('loading');
    setTxError(null);

    try {
      await executeTx();
    } catch (error) {
      setTxState('idle');
      setTxError(error instanceof Error ? error.message : 'Transaction failed');
    }
  };

  // If context is loading, show loading state
  if (contextLoading) {
    return (
      <div className="bg-[#191919] rounded-[10px] flex flex-col gap-5 p-5">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-700 border-t-white"></div>
          <span className="ml-3 text-gray-400">Loading transaction context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#191919] rounded-[10px] flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Your supply</h3>
        <div className="opacity-50 size-3">
          <svg width="12.5" height="12.5" viewBox="0 0 12.5 12.5" fill="none">
            <path
              d="M6.25 0C2.798 0 0 2.798 0 6.25c0 3.452 2.798 6.25 6.25 6.25 3.452 0 6.25-2.798 6.25-6.25C12.5 2.798 9.702 0 6.25 0zm0 11.458c-2.874 0-5.208-2.334-5.208-5.208S3.376 1.042 6.25 1.042 11.458 3.376 11.458 6.25 9.124 11.458 6.25 11.458z"
              fill="white"
            />
            <path
              d="M6.25 4.167c-.345 0-.625.28-.625.625v2.916c0 .345.28.625.625.625s.625-.28.625-.625V4.792c0-.345-.28-.625-.625-.625zM6.25 8.333c-.345 0-.625.28-.625.625v.417c0 .345.28.625.625.625s.625-.28.625-.625v-.417c0-.345-.28-.625-.625-.625z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Position Value Card */}
      <div className="bg-[#212121] rounded-[10px] flex flex-col pb-[38px] pt-[10px] px-[15px]">
        <div className="flex flex-col gap-2 mb-[-28px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#999999]">Position Value</span>
            <Button
              variant="secondary"
              onClick={handleMaxClick}
              className="px-[10px] py-0 h-5 text-[10px]"
            >
              MAX
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[28px] font-normal text-white leading-[1.15] tracking-[-0.56px]">
              {formatAmount(lpTokenBalanceRaw, {
                decimals: lpTokenDecimals,
                symbol: lpTokenSymbol,
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#999999]">${lpTokenUsdValue.toFixed(2)} USD</span>
              {lpToken?.pctChange !== null && lpToken?.pctChange !== undefined && (
                <span
                  className={`text-sm ${lpToken.pctChange >= 0 ? 'text-[#96d18e]' : 'text-red-400'}`}
                >
                  {lpToken.pctChange >= 0 ? '+' : ''}
                  {Math.abs(lpToken.pctChange).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current APR */}
      <div className="flex justify-between items-center py-2">
        <span className="text-sm font-medium text-white">Current APR</span>
        <span className="text-sm font-medium text-white">{currentApr}</span>
      </div>

      {/* Action Tabs */}
      <div className="bg-white/5 rounded-[10px] flex gap-[2px] p-[2px]">
        {hasDeposit && (
          <button
            onClick={() => setSelectedAction('supply')}
            className={`flex-1 rounded-[10px] px-6 py-[18px] text-sm font-medium text-white transition-all ${
              selectedAction === 'supply'
                ? 'bg-white/10 shadow-[0px_25px_30px_-20px_rgba(0,0,0,0.1)]'
                : 'bg-white/5 opacity-70'
            }`}
          >
            Supply
          </button>
        )}
        {hasRedeem && (
          <button
            onClick={() => setSelectedAction('withdraw')}
            className={`flex-1 rounded-[10px] px-6 py-[18px] text-sm font-medium text-white transition-all ${
              selectedAction === 'withdraw'
                ? 'bg-white/10 shadow-[0px_25px_30px_-20px_rgba(0,0,0,0.1)]'
                : 'bg-white/5 opacity-70'
            }`}
          >
            Withdraw
          </button>
        )}
      </div>

      {/* Amount to allocate */}
      <div className="bg-[#212121] rounded-[10px] flex flex-col pb-[38px] pt-[10px] px-[15px]">
        <div className="flex flex-col gap-2 mb-[-28px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#999999]">Amount to allocate</span>
            <Button
              variant="secondary"
              onClick={handleMaxClick}
              className="px-[10px] py-0 h-5 text-[10px]"
            >
              MAX
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-[28px] font-normal text-white leading-[1.15] tracking-[-0.56px] placeholder-gray-500 focus:outline-none h-[34px]"
            />
            <div className="bg-[#333333] rounded-[10px] flex gap-1 items-center px-[10px] py-[5px]">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-xs text-white font-bold">Ξ</span>
              </div>
              <span className="text-lg font-medium text-white">{currentSymbol}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-[#999999]">
            <span>
              {(() => {
                const amt = parseFloat(amount || '0');
                if (!amt || !isFinite(amt)) return '$0.00 USD';
                const perUnitUsd = currentBalance > 0 ? currentUsdValue / currentBalance : 0;
                return `$${(amt * perUnitUsd).toFixed(2)} USD`;
              })()}
            </span>
            <span>
              Balance:{' '}
              {formatAmount(currentBalanceRaw, {
                decimals: currentDecimals,
                symbol: currentSymbol,
              })}
            </span>
          </div>
        </div>
        {isAmountExceedsBalance && (
          <div className="mt-2 text-sm text-red-400">
            Insufficient balance. You have{' '}
            {formatAmount(currentBalanceRaw, {
              decimals: currentDecimals,
              symbol: currentSymbol,
            })}{' '}
            available.
          </div>
        )}
      </div>

      {/* Transaction Steps */}
      {actions && actions.length > 1 && txState !== 'idle' && (
        <div className="mb-6">
          <h4 className="text-white mb-3">Transaction Steps</h4>
          <div className="flex gap-2">
            {actions.map((_, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  index < currentActionIndex
                    ? 'bg-green-600 text-white'
                    : index === currentActionIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <span className="capitalize">
                  {index === actions.length - 1
                    ? selectedAction
                    : actions[index]?.name || `Step ${index + 1}`}
                </span>
                {index === currentActionIndex && isExecuting && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Details */}
      <div className="flex flex-col gap-3 pt-3">
        <div className="flex items-center">
          <span className="text-sm text-white/50">Transaction Details</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#737373]">APY</span>
          <span className="text-sm text-white">{currentApr}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#737373]">Transaction Cost</span>
          <span className="text-sm text-white">{estimatedTxCostUsd}</span>
        </div>
      </div>

      {/* Error Display */}
      {txError && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">{txError}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-8">
        <Button
          variant="primary"
          onClick={handleTransaction}
          disabled={!isAmountValid || isExecuting || actionsLoading}
          className="w-full py-5 rounded-[15px] bg-[#325ee6] border-[#163db6] text-base"
        >
          {isExecuting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isBatchSupported
                ? 'Executing...'
                : `Step ${currentActionIndex + 1} of ${actions?.length || 0}...`}
            </div>
          ) : txState === 'success' ? (
            'Transaction Complete'
          ) : (
            `${selectedAction === 'supply' ? 'Supply' : 'Withdraw'}`
          )}
        </Button>
      </div>
    </div>
  );
}
