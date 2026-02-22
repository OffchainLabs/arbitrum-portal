import { NextRequest } from 'next/server';

import { CategoryRouter } from '../../../../CategoryRouter';
import {
  assertCorsOriginAllowed,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from '../../../../lib/http';
import {
  ValidationError,
  assertAddress,
  assertOptionalAddress,
  assertPositiveNumberString,
  parseEarnNetwork,
  parseOpportunityCategory,
} from '../../../../lib/validation';
import {
  EARN_TRANSACTION_ACTIONS,
  type EarnTransactionAction,
  type TransactionQuoteRequest,
} from '../../../../types';

/**
 * Get transaction quote - "How do I execute this?"
 * Returns transaction steps for a specific action with a specific amount.
 * Fetched when user enters amount (debounced).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { category: string; id: string } },
) {
  try {
    assertCorsOriginAllowed(request);

    const requestBody = await request.json().catch(() => {
      throw new ValidationError('INVALID_JSON', 'Request body must be valid JSON');
    });
    if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
      throw new ValidationError('INVALID_BODY', 'Request body must be an object');
    }

    const parsedRequest = requestBody as Partial<TransactionQuoteRequest>;
    const {
      action: rawAction,
      amount: rawAmount,
      category: bodyCategory,
      network: rawNetwork,
      userAddress: rawUserAddress,
      inputTokenAddress: rawInputTokenAddress,
      outputTokenAddress: rawOutputTokenAddress,
      slippage,
      simulate,
    } = parsedRequest;
    const pathCategory = parseOpportunityCategory(params.category);

    // Ensure category in body matches path param
    if (bodyCategory && bodyCategory !== pathCategory) {
      throw new ValidationError(
        'CATEGORY_MISMATCH',
        `Category in path (${pathCategory}) does not match category in body (${bodyCategory})`,
      );
    }

    if (!rawAction) {
      throw new ValidationError('MISSING_ACTION', 'action is required');
    }

    if (!EARN_TRANSACTION_ACTIONS.includes(rawAction)) {
      throw new ValidationError(
        'INVALID_ACTION',
        `action must be one of: ${EARN_TRANSACTION_ACTIONS.join(', ')}`,
      );
    }
    const action = rawAction as EarnTransactionAction;

    if (typeof rawAmount !== 'string') {
      throw new ValidationError('INVALID_AMOUNT', 'amount must be a string');
    }
    const amount = assertPositiveNumberString(rawAmount, 'amount');
    const userAddress = assertAddress(rawUserAddress ?? null, 'userAddress');
    const network = parseEarnNetwork(rawNetwork ?? null);
    const opportunityId = assertAddress(params.id, 'opportunityId');
    const inputTokenAddress = assertOptionalAddress(rawInputTokenAddress, 'inputTokenAddress');
    const outputTokenAddress = assertOptionalAddress(rawOutputTokenAddress, 'outputTokenAddress');

    if (slippage !== undefined) {
      if (
        typeof slippage !== 'number' ||
        !Number.isFinite(slippage) ||
        slippage < 0 ||
        slippage > 100
      ) {
        throw new ValidationError(
          'INVALID_SLIPPAGE',
          'slippage must be a number between 0 and 100',
        );
      }
    }

    if (simulate !== undefined && typeof simulate !== 'boolean') {
      throw new ValidationError('INVALID_SIMULATE', 'simulate must be a boolean');
    }

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(pathCategory);
    const quote = await adapter.getTransactionQuote(
      opportunityId,
      {
        ...parsedRequest,
        category: pathCategory,
        action,
        amount,
        userAddress,
        inputTokenAddress,
        outputTokenAddress,
      },
      network,
    );

    // No caching - transaction quote is dynamic based on amount and user state
    return jsonResponse(request, quote, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error preparing transaction:', error);
    return errorResponse(request, error, {
      code: 'TRANSACTION_QUOTE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get transaction quote',
    });
  }
}

export function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}
