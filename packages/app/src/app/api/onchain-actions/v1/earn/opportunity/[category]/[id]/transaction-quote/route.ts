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
import { TransactionQuoteRequest } from '../../../../types';

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

    const body = (await request.json()) as TransactionQuoteRequest;
    const category = parseOpportunityCategory(params.category);

    // Ensure category in body matches path param
    if (body.category && body.category !== category) {
      throw new ValidationError(
        'CATEGORY_MISMATCH',
        `Category in path (${category}) does not match category in body (${body.category})`,
      );
    }

    const action = body.action;
    if (!action) {
      throw new ValidationError('MISSING_ACTION', 'action is required');
    }
    const amount = assertPositiveNumberString(body.amount, 'amount');
    const userAddress = assertAddress(body.userAddress ?? null, 'userAddress');
    const network = parseEarnNetwork(body.network ?? null);
    const opportunityId = assertAddress(params.id, 'opportunityId');
    const inputTokenAddress = assertOptionalAddress(body.inputTokenAddress, 'inputTokenAddress');
    const outputTokenAddress = assertOptionalAddress(body.outputTokenAddress, 'outputTokenAddress');

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);
    const quote = await adapter.getTransactionQuote(
      opportunityId,
      {
        ...body,
        category,
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
