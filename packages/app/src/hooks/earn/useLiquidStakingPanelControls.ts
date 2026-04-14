'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback, useState } from 'react';

import type { OpportunityTableRow } from '@/app-types/earn/vaults';
import { OpportunityCategory } from '@/earn-api/types';

import {
  ETH_TOKEN_OPTION,
  type EarnTokenOption,
} from '../../components/earn/earnTokenDropdownOptions';

export type LiquidStakingAction = 'buy' | 'sell';

interface UseLiquidStakingPanelControlsParams {
  opportunity: OpportunityTableRow;
  initialAction: LiquidStakingAction;
}

export function useLiquidStakingPanelControls({
  opportunity,
  initialAction,
}: UseLiquidStakingPanelControlsParams): {
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedAction: LiquidStakingAction;
  selectedBuyToken: EarnTokenOption;
  selectedSellToken: EarnTokenOption;
  slippagePercent: number;
  onActionChange: (action: LiquidStakingAction) => void;
  onBuyTokenSelect: (token: EarnTokenOption) => void;
  onSellTokenSelect: (token: EarnTokenOption) => void;
  onSlippageChange: (value: number) => void;
  resetAmount: () => void;
} {
  const posthog = usePostHog();
  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<LiquidStakingAction>(() => initialAction);
  const [selectedBuyToken, setSelectedBuyToken] = useState(ETH_TOKEN_OPTION);
  const [selectedSellToken, setSelectedSellToken] = useState(ETH_TOKEN_OPTION);
  const [slippagePercent, setSlippagePercent] = useState(0.5);

  const resetPanel = useCallback(() => {
    setAmount('');
  }, []);

  const onActionChange = useCallback(
    (action: LiquidStakingAction) => {
      if (action === selectedAction) {
        return;
      }

      setSelectedAction(action);
      resetPanel();
      posthog?.capture('Earn Action Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.LiquidStaking,
        action,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: opportunity.chainId,
      });
    },
    [
      opportunity.chainId,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      resetPanel,
      selectedAction,
    ],
  );

  const onBuyTokenSelect = useCallback(
    (token: EarnTokenOption) => {
      if (selectedBuyToken.address.toLowerCase() === token.address.toLowerCase()) {
        return;
      }

      setSelectedBuyToken(token);
      posthog?.capture('Earn Input Token Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.LiquidStaking,
        action: selectedAction,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: opportunity.chainId,
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
      });
    },
    [
      opportunity.chainId,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      selectedAction,
      selectedBuyToken.address,
    ],
  );

  const onSellTokenSelect = useCallback(
    (token: EarnTokenOption) => {
      if (selectedSellToken.address.toLowerCase() === token.address.toLowerCase()) {
        return;
      }

      setSelectedSellToken(token);
      posthog?.capture('Earn Input Token Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.LiquidStaking,
        action: selectedAction,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: opportunity.chainId,
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
      });
    },
    [
      opportunity.chainId,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      selectedAction,
      selectedSellToken.address,
    ],
  );

  const onSlippageChange = useCallback(
    (value: number) => {
      if (value === slippagePercent) {
        return;
      }

      setSlippagePercent(value);
      posthog?.capture('Earn Slippage Updated', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.LiquidStaking,
        action: selectedAction,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: opportunity.chainId,
        slippagePercent: value,
      });
    },
    [
      opportunity.chainId,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      selectedAction,
      slippagePercent,
    ],
  );

  return {
    amount,
    onAmountChange: setAmount,
    selectedAction,
    selectedBuyToken,
    selectedSellToken,
    slippagePercent,
    onActionChange,
    onBuyTokenSelect,
    onSellTokenSelect,
    onSlippageChange,
    resetAmount: () => setAmount(''),
  };
}
