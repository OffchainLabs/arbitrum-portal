import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

import type { Vault } from '@/types/vault';

import { vaultsSdk } from '../../services/vaultsSdk';

export const actionsQueryKey = ['actions'] as const;

export type Action =
  | 'deposit'
  | 'redeem'
  | 'request-redeem'
  | 'claim-redeem'
  | 'claim-rewards'
  | 'start-redeem-cooldown';

interface ActionsArgs {
  address: Address | undefined;
  action: Action;
  vault: Vault;
  assetAddress?: Address | undefined;
  amount: string;
  all?: boolean;
  ignoreAmount?: boolean;
  simulate?: boolean;
}

export function useActionsQuery({
  address,
  action,
  vault,
  assetAddress,
  amount,
  all,
  ignoreAmount,
  simulate,
}: ActionsArgs) {
  const { data, isFetching } = useQuery({
    queryKey: [
      ...actionsQueryKey,
      {
        assetAddress: assetAddress ?? vault.asset.address,
        network: vault.network.name,
        vaultAddress: vault.address,
        userAddress: address,
        simulate,
        amount,
        all,
        action,
        ignoreAmount,
      },
    ] as const,
    async queryFn({ queryKey }) {
      const { action, userAddress, network, vaultAddress, simulate, assetAddress, amount, all } =
        queryKey[1];
      if (!action || !userAddress || (ignoreAmount ? false : amount === '0')) {
        return null;
      }

      return await vaultsSdk.getActions({
        path: {
          action,
          userAddress,
          network,
          vaultAddress,
        },
        query: {
          simulate,
          assetAddress,
          amount,
          all,
        },
      });
    },
  });

  return { data, isFetching };
}

export type Actions = ReturnType<typeof useActionsQuery>['data'];
