import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { CategoryRouter } from '../../../../CategoryRouter';
import {
  OPPORTUNITY_CATEGORIES,
  OpportunityCategory,
  TransactionQuoteRequest,
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
    const body = (await request.json()) as TransactionQuoteRequest;
    const { action, amount, userAddress } = body;
    const category = params.category as OpportunityCategory;

    if (!OPPORTUNITY_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category: ${category}. Must be one of: ${OPPORTUNITY_CATEGORIES.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // Ensure category in body matches path param
    if (body.category && body.category !== category) {
      return NextResponse.json(
        {
          error: {
            code: 'CATEGORY_MISMATCH',
            message: `Category in path (${category}) does not match category in body (${body.category})`,
          },
        },
        { status: 400 },
      );
    }

    if (!action || !amount || !userAddress) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'action, amount, and userAddress are required',
          },
        },
        { status: 400 },
      );
    }

    if (!isAddress(userAddress)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_USER_ADDRESS',
            message: 'userAddress must be a valid Ethereum address',
          },
        },
        { status: 400 },
      );
    }

    const network = body.network || 'arbitrum';
    const opportunityId = params.id;

    const router = new CategoryRouter();
    const adapter = router.routeToAdapter(category);
    const quote = await adapter.getTransactionQuote(opportunityId, { ...body, category }, network);

    // No caching - transaction quote is dynamic based on amount and user state
    return NextResponse.json(quote, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error preparing transaction:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to get transaction quote';

    // Determine status code based on error type
    // Validation errors (amount too low, invalid input, etc.) should be 400
    // Server errors (API failures, network issues, etc.) should be 500
    const isValidationError =
      errorMessage.includes('too small') ||
      errorMessage.includes('too low') ||
      errorMessage.includes('minimum') ||
      errorMessage.includes('must be greater') ||
      errorMessage.includes('required') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('invalid');

    const statusCode = isValidationError ? 400 : 500;

    return NextResponse.json(
      {
        error: {
          code: 'TRANSACTION_QUOTE_ERROR',
          message: errorMessage,
        },
      },
      { status: statusCode },
    );
  }
}
