'use client';

import { BigNumber, utils } from 'ethers';
import { useState } from 'react';
import { useAccount } from 'wagmi';

import { Card } from '../../../../portal/components/Card';
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

export function VaultActionPanel({ vault }: VaultActionPanelProps) {
  const { address: walletAddress } = useAccount();

  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActionType>('supply');

  // Fetch transaction context
  const { transactionContext, isLoading: contextLoading } = useVaultTransactionContext(
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

  // If context is loading, show basic supply form
  if (contextLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-700 border-t-white"></div>
          <span className="ml-3 text-gray-400">Loading transaction context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 flex flex-col gap-4 p-4">
      <Card>
        {/* Your supply section */}
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-white">Your supply</h3>
        </div>

        {/* Position Value */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Position Value</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-white">
                {formatAmount(lpTokenBalanceRaw, {
                  decimals: lpTokenDecimals,
                  symbol: lpTokenSymbol,
                })}
              </div>
              <div className="text-sm text-gray-400">${lpTokenUsdValue.toFixed(2)} USD</div>
            </div>
            {lpToken?.pctChange !== null && lpToken?.pctChange !== undefined && (
              <div
                className={`text-sm font-medium ${lpToken.pctChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {lpToken.pctChange >= 0 ? '+' : ''}
                {Math.abs(lpToken.pctChange).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Current APR */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-white">Current APR</span>
          <span className="text-white">{currentApr}</span>
        </div>
      </Card>

      {/* Action Tabs */}
      <div className="flex gap-2 mb-6">
        {hasDeposit && (
          <Button
            variant={selectedAction === 'supply' ? 'primary' : 'secondary'}
            onClick={() => setSelectedAction('supply')}
            className="px-4 py-2"
          >
            Supply
          </Button>
        )}
        {hasRedeem && (
          <Button
            variant={selectedAction === 'withdraw' ? 'primary' : 'secondary'}
            onClick={() => setSelectedAction('withdraw')}
            className="px-4 py-2"
          >
            Withdraw
          </Button>
        )}
      </div>

      {/* Amount to allocate */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-400">Amount to allocate</label>
          <Button variant="secondary" onClick={handleMaxClick} className="px-2 py-1 text-xs">
            MAX
          </Button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg mb-2">
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-2xl"
          />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs text-white font-bold">Ξ</span>
            </div>
            <span className="text-white font-medium">{currentSymbol}</span>
          </div>
        </div>

        <div className="flex justify-between text-sm text-gray-400">
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

      {/* Transaction Details */}
      <div className="mb-6">
        <h4 className="text-white mb-3">Transaction Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">APY</span>
            <span className="text-white">{currentApr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Transaction Cost</span>
            <span className="text-white">{estimatedTxCostUsd}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button
        variant="primary"
        onClick={() => {}}
        disabled={!isAmountValid}
        className="w-full py-3"
      >
        {selectedAction === 'supply' ? 'Supply' : 'Withdraw'}
      </Button>
    </div>
  );
}
