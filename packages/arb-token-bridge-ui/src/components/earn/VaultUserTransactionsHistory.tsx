'use client';

import { SafeImage } from 'arb-token-bridge-ui/src/components/common/SafeImage';
import { DetailedVault } from 'arb-token-bridge-ui/src/types/vaults';
import { formatAmount } from 'arb-token-bridge-ui/src/util/NumberUtils';
import dayjs from 'dayjs';
import { utils } from 'ethers';
import { useAccount } from 'wagmi';

import { Card } from '@/components/Card';

import { initializeDayjs } from '../../../../app/src/initialization';
import { useVaultUserTransactionsHistory } from '../../hooks/earn/useVaultUserTransactionsHistory';
import {
  getStandardizedDate,
  getStandardizedTime,
  normalizeTimestamp,
} from '../../state/app/utils';
import { shortenAddress } from '../../util/CommonUtils';
import { getExplorerUrl } from '../../util/networks';
import { ExternalLink } from '../common/ExternalLink';

initializeDayjs();

interface VaultUserTransactionsHistoryProps {
  vault: DetailedVault;
}

export function VaultUserTransactionsHistory({ vault }: VaultUserTransactionsHistoryProps) {
  const { address: walletAddress } = useAccount();

  const { events, isLoading, error, refetch } = useVaultUserTransactionsHistory(
    walletAddress || null,
    vault.network.name,
    vault.address,
  );

  if (!walletAddress) return null;

  return (
    <Card className="rounded-lg flex flex-col gap-3 bg-[#191919] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-white">Your transactions in {vault.name}</h3>
        <button
          className="text-xs text-white/60 hover:text-white"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-white/60 text-sm">
          Loading transactions...
        </div>
      )}

      {error && <div className="text-xs text-red-400">Failed to load: {error}</div>}

      {!isLoading && !error && (!events || events.items === 0) && (
        <div className="text-xs text-white/50">No transactions found.</div>
      )}

      {!isLoading && !error && events && events.items > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/60">
                <th className="py-2 pr-2">Time</th>
                <th className="py-2 pr-2">Event</th>
                <th className="py-2 pr-2">Asset</th>
                <th className="py-2 pr-2">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {[...events.data]
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((row, idx) => {
                  const assetAmountFormatted = formatAmount(
                    // row.assetAmountNative is in smallest units
                    utils
                      .parseUnits('1', 0)
                      .mul(0)
                      .add(row.assetAmountNative || '0'),
                    {
                      decimals: events.asset.decimals,
                      symbol: events.asset.symbol,
                    },
                  );
                  const txUrl = `${getExplorerUrl(vault.network.chainId)}/tx/${row.transactionHash}`;

                  return (
                    <tr
                      key={`${row.transactionHash}-${row.logIndex}-${idx}`}
                      className="border-t border-white/10"
                    >
                      <td
                        className="py-2 pr-2 text-white/80 whitespace-nowrap"
                        title={`${getStandardizedDate(normalizeTimestamp(row.timestamp))} ${getStandardizedTime(
                          normalizeTimestamp(row.timestamp),
                        )}`}
                      >
                        {dayjs.unix(row.timestamp).fromNow()}
                      </td>
                      <td className="py-2 pr-2 capitalize text-white/90">{row.eventType}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 text-white">
                          <SafeImage
                            src={events.asset.assetLogo || ''}
                            alt={events.asset.symbol}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span>{assetAmountFormatted}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-white/60 font-mono">
                        <ExternalLink href={txUrl} className="underline">
                          {shortenAddress(row.transactionHash)}
                        </ExternalLink>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
