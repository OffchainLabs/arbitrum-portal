import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import {
  ValidationError,
  assertAddress,
  assertOptionalAddress,
  assertOptionalBoolean,
  assertOptionalFiniteNumber,
  assertOptionalString,
  assertPositiveNumberString,
  assertString,
  parseEarnChainId,
  parseOpportunityCategory,
} from '../../../../lib/validation';
import { EARN_TRANSACTION_ACTIONS, type EarnTransactionAction } from '../../../../types';

const router = new CategoryRouter();

function isEarnTransactionAction(value: string): value is EarnTransactionAction {
  return EARN_TRANSACTION_ACTIONS.includes(value as EarnTransactionAction);
}

function parseOptionalBooleanQuery(value: string | null): unknown {
  if (value === null) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

function parseOptionalNumberQuery(value: string | null): unknown {
  if (value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

async function getTransactionQuote(input: {
  category: string;
  opportunityId: string;
  action: unknown;
  amount: unknown;
  chainId?: unknown;
  userAddress?: unknown;
  inputTokenAddress?: unknown;
  outputTokenAddress?: unknown;
  rolloverTargetOpportunityId?: unknown;
  rolloverAmount?: unknown;
  slippage?: unknown;
  simulate?: unknown;
}) {
  const rawAction = assertString(input.action, 'action');
  const rawAmount = assertString(input.amount, 'amount');
  const rawChainId = assertOptionalFiniteNumber(input.chainId, {
    field: 'chainId',
  });
  const rawUserAddress = assertOptionalString(input.userAddress, 'userAddress');
  const rawInputTokenAddress = assertOptionalString(input.inputTokenAddress, 'inputTokenAddress');
  const rawOutputTokenAddress = assertOptionalString(
    input.outputTokenAddress,
    'outputTokenAddress',
  );
  const rawRolloverTargetOpportunityId = assertOptionalString(
    input.rolloverTargetOpportunityId,
    'rolloverTargetOpportunityId',
  );
  const rawRolloverAmount = assertOptionalString(input.rolloverAmount, 'rolloverAmount');
  const slippage = assertOptionalFiniteNumber(input.slippage, {
    field: 'slippage',
    min: 0,
    max: 100,
  });
  const simulate = assertOptionalBoolean(input.simulate, 'simulate');

  const pathCategory = parseOpportunityCategory(input.category);

  if (!isEarnTransactionAction(rawAction)) {
    throw new ValidationError(
      'INVALID_ACTION',
      `action must be one of: ${EARN_TRANSACTION_ACTIONS.join(', ')}`,
    );
  }
  const action = rawAction;

  const amount = assertPositiveNumberString(rawAmount, 'amount');
  const userAddress = assertOptionalAddress(rawUserAddress, 'userAddress');
  if (rawChainId !== undefined && !Number.isInteger(rawChainId)) {
    throw new ValidationError('INVALID_CHAIN_ID', 'chainId must be an integer');
  }
  const chainId = parseEarnChainId(rawChainId === undefined ? null : String(rawChainId));
  const opportunityId = assertAddress(input.opportunityId, 'opportunityId');
  const inputTokenAddress = assertOptionalAddress(rawInputTokenAddress, 'inputTokenAddress');
  const outputTokenAddress = assertOptionalAddress(rawOutputTokenAddress, 'outputTokenAddress');
  const rolloverTargetOpportunityId = assertOptionalAddress(
    rawRolloverTargetOpportunityId,
    'rolloverTargetOpportunityId',
  );
  const rolloverAmount = rawRolloverAmount
    ? assertPositiveNumberString(rawRolloverAmount, 'rolloverAmount')
    : undefined;

  const adapter = router.routeToAdapter(pathCategory);
  return adapter.getTransactionQuote(
    opportunityId,
    {
      category: pathCategory,
      action,
      amount,
      userAddress,
      inputTokenAddress,
      outputTokenAddress,
      slippage,
      simulate,
      chainId,
      rolloverTargetOpportunityId,
      rolloverAmount,
    },
    chainId,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const url = new URL(request.url);
    const quoteInput = {
      category: params.category,
      opportunityId: params.id,
      action: url.searchParams.get('action'),
      amount: url.searchParams.get('amount'),
      chainId: parseOptionalNumberQuery(url.searchParams.get('chainId')),
      userAddress: url.searchParams.get('userAddress'),
      inputTokenAddress: url.searchParams.get('inputTokenAddress'),
      outputTokenAddress: url.searchParams.get('outputTokenAddress'),
      rolloverTargetOpportunityId: url.searchParams.get('rolloverTargetOpportunityId'),
      rolloverAmount: url.searchParams.get('rolloverAmount'),
      slippage: parseOptionalNumberQuery(url.searchParams.get('slippage')),
      simulate: parseOptionalBooleanQuery(url.searchParams.get('simulate')),
    };

    const rateLimitKey = `quote-rl:${params.category}:${params.id}:${[
      quoteInput.action,
      quoteInput.amount,
      quoteInput.chainId,
      quoteInput.userAddress,
      quoteInput.inputTokenAddress,
      quoteInput.outputTokenAddress,
      quoteInput.slippage,
      quoteInput.simulate,
      quoteInput.rolloverTargetOpportunityId,
      quoteInput.rolloverAmount,
    ].join(':')}`;

    const getRateLimitedQuote = unstable_cache(
      async () => getTransactionQuote(quoteInput),
      [rateLimitKey],
      {
        revalidate: 10,
        tags: ['transaction-quote-rl', rateLimitKey],
      },
    );

    const quote = await getRateLimitedQuote();

    return NextResponse.json(quote, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error preparing transaction:', error);
    const routeError = error as { message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        message: routeError.message ?? 'Failed to get transaction quote',
        code: routeError.code ?? 'TRANSACTION_QUOTE_ERROR',
      },
      { status: routeError.status ?? 500 },
    );
  }
}
