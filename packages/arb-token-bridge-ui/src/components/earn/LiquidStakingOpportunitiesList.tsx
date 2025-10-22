import { useRouter } from 'next/navigation';
import React from 'react';

// TODO: Replace with real API data
const mockOpportunities = [
  {
    id: '1',
    vault: 'Lido Staked ETH',
    protocol: 'Lido',
    apy: 3.5,
    tvl: '$1.2B',
    token: 'ETH',
  },
  {
    id: '2',
    vault: 'Rocket Pool ETH',
    protocol: 'Rocket Pool',
    apy: 3.2,
    tvl: '$800M',
    token: 'ETH',
  },
];

export function LiquidStakingOpportunitiesList() {
  const router = useRouter();

  return (
    <div className="w-full">
      <h2 className="mb-4 text-xl font-bold text-white">Liquid Staking Opportunities</h2>

      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Vault</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Token</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">APY</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">TVL</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Protocol</th>
            </tr>
          </thead>
          <tbody>
            {mockOpportunities.map((opp) => (
              <tr
                key={opp.id}
                className="cursor-pointer border-b border-gray-700 transition-colors hover:bg-gray-800"
                onClick={() => router.push(`/earn/market/${opp.id}`)}
              >
                <td className="px-4 py-4 text-sm font-medium text-white">{opp.vault}</td>
                <td className="px-4 py-4 text-sm text-gray-300">{opp.token}</td>
                <td className="px-4 py-4 text-sm font-medium text-green-500">{opp.apy}%</td>
                <td className="px-4 py-4 text-sm text-gray-300">{opp.tvl}</td>
                <td className="px-4 py-4 text-sm text-gray-300">{opp.protocol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
