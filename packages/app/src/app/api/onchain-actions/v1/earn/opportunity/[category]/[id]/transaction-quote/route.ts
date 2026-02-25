import { NextRequest } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import { errorResponse, jsonResponse, optionsResponse } from '../../../../lib/http';
import {
  ValidationError,
  assertAddress,
  assertOptionalAddress,
  assertOptionalBoolean,
  assertOptionalFiniteNumber,
  assertOptionalString,
  assertPlainObject,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    const parsedJson = await request.json().catch(() => {
      throw new ValidationError('INVALID_JSON', 'Request body must be valid JSON');
    });
    const parsedRequest = assertPlainObject(parsedJson);

    const rawAction = assertString(parsedRequest.action, 'action');
    const rawAmount = assertString(parsedRequest.amount, 'amount');
    const bodyCategoryRaw = assertOptionalString(parsedRequest.category, 'category');
    const rawChainId = assertOptionalFiniteNumber(parsedRequest.chainId, {
      field: 'chainId',
    });
    const rawUserAddress = assertString(parsedRequest.userAddress, 'userAddress');
    const rawInputTokenAddress = assertOptionalString(
      parsedRequest.inputTokenAddress,
      'inputTokenAddress',
    );
    const rawOutputTokenAddress = assertOptionalString(
      parsedRequest.outputTokenAddress,
      'outputTokenAddress',
    );
    const rawRolloverTargetOpportunityId = assertOptionalString(
      parsedRequest.rolloverTargetOpportunityId,
      'rolloverTargetOpportunityId',
    );
    const rawRolloverAmount = assertOptionalString(parsedRequest.rolloverAmount, 'rolloverAmount');
    const slippage = assertOptionalFiniteNumber(parsedRequest.slippage, {
      field: 'slippage',
      min: 0,
      max: 100,
    });
    const simulate = assertOptionalBoolean(parsedRequest.simulate, 'simulate');

    const pathCategory = parseOpportunityCategory(params.category);
    const bodyCategory = bodyCategoryRaw ? parseOpportunityCategory(bodyCategoryRaw) : undefined;

    if (bodyCategory && bodyCategory !== pathCategory) {
      throw new ValidationError(
        'CATEGORY_MISMATCH',
        `Category in path (${pathCategory}) does not match category in body (${bodyCategory})`,
      );
    }

    if (!isEarnTransactionAction(rawAction)) {
      throw new ValidationError(
        'INVALID_ACTION',
        `action must be one of: ${EARN_TRANSACTION_ACTIONS.join(', ')}`,
      );
    }
    const action = rawAction;

    const amount = assertPositiveNumberString(rawAmount, 'amount');
    const userAddress = assertAddress(rawUserAddress, 'userAddress');
    if (rawChainId !== undefined && !Number.isInteger(rawChainId)) {
      throw new ValidationError('INVALID_CHAIN_ID', 'chainId must be an integer');
    }
    const chainId = parseEarnChainId(rawChainId === undefined ? null : String(rawChainId));
    const opportunityId = assertAddress(params.id, 'opportunityId');
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
    const quote = await adapter.getTransactionQuote(
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

    return jsonResponse(quote, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error preparing transaction:', error);
    return errorResponse(error, {
      code: 'TRANSACTION_QUOTE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get transaction quote',
    });
  }
}

export function OPTIONS() {
  return optionsResponse();
}
