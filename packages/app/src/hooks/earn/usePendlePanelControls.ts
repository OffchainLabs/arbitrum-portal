'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useState } from 'react';

import { OpportunityCategory } from '@/earn-api/types';
import type { StandardOpportunityFixedYield } from '@/earn-api/types';

import type { EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';
import type { PendleAction } from './pendlePanelUtils';

interface UsePendlePanelControlsParams {
  opportunity: StandardOpportunityFixedYield;
  initialAction: PendleAction;
  settlementTokens: EarnTokenOption[];
}

export function usePendlePanelControls({
  opportunity,
  initialAction,
  settlementTokens,
}: UsePendlePanelControlsParams) {
  const posthog = usePostHog();

  const [amount, setAmount] = useState('');
  const [selectedAction, setSelectedAction] = useState<PendleAction>(initialAction);
  const [selectedInputToken, setSelectedInputToken] = useState<EarnTokenOption | null>(null);
  const [selectedRedeemOutputToken, setSelectedRedeemOutputToken] =
    useState<EarnTokenOption | null>(null);
  const [selectedRolloverTargetId, setSelectedRolloverTargetId] = useState<string | null>(null);
  const [slippagePercent, setSlippagePercent] = useState(0.5);

  useEffect(() => {
    setSelectedAction(initialAction);
    setAmount('');
  }, [initialAction]);

  useEffect(() => {
    if (!settlementTokens.length) {
      setSelectedInputToken(null);
      setSelectedRedeemOutputToken(null);
      return;
    }

    setSelectedInputToken((current) => {
      if (!current) {
        return settlementTokens[0] ?? null;
      }

      return (
        settlementTokens.find(
          (token) => token.address.toLowerCase() === current.address.toLowerCase(),
        ) ??
        settlementTokens[0] ??
        null
      );
    });

    setSelectedRedeemOutputToken((current) => {
      if (!current) {
        return settlementTokens[0] ?? null;
      }

      return (
        settlementTokens.find(
          (token) => token.address.toLowerCase() === current.address.toLowerCase(),
        ) ??
        settlementTokens[0] ??
        null
      );
    });
  }, [settlementTokens]);

  const onActionChange = useCallback(
    (action: PendleAction, isRolloverEnabled: boolean) => {
      if (action === selectedAction) {
        return;
      }

      if (action === 'rollover' && !isRolloverEnabled) {
        return;
      }

      setSelectedAction(action);
      setAmount('');
      posthog?.capture('Earn Action Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.FixedYield,
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
      selectedAction,
    ],
  );

  const onTokenSelect = useCallback(
    (token: EarnTokenOption, mode: 'enter' | 'exit' | 'redeem') => {
      const currentToken = mode === 'enter' ? selectedInputToken : selectedRedeemOutputToken;
      if (currentToken?.address.toLowerCase() === token.address.toLowerCase()) {
        return;
      }

      if (mode === 'enter') {
        setSelectedInputToken(token);
      } else {
        setSelectedRedeemOutputToken(token);
      }

      posthog?.capture('Earn Input Token Selected', {
        page: 'Earn',
        section: 'Action Panel',
        category: OpportunityCategory.FixedYield,
        action: selectedAction,
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        protocol: opportunity.protocol,
        chainId: opportunity.chainId,
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
        selector: mode,
      });
    },
    [
      opportunity.chainId,
      opportunity.id,
      opportunity.name,
      opportunity.protocol,
      posthog,
      selectedAction,
      selectedInputToken,
      selectedRedeemOutputToken,
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
        category: OpportunityCategory.FixedYield,
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

  const resetAmount = useCallback(() => setAmount(''), []);

  return {
    amount,
    setAmount,
    selectedAction,
    setSelectedAction,
    selectedInputToken,
    selectedRedeemOutputToken,
    selectedRolloverTargetId,
    setSelectedRolloverTargetId,
    slippagePercent,
    onActionChange,
    onTokenSelect,
    onSlippageChange,
    resetAmount,
  };
}
