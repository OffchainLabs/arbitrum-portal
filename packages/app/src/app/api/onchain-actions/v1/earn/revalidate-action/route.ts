import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

import { requireEarnApiKey } from '@/earn-api/lib/apiKeyAuth';
import { earnCacheTags } from '@/earn-api/lib/cache';
import { enforceEarnRateLimit } from '@/earn-api/lib/rateLimit';
import { createServerSidePublicClient } from '@/earn-api/lib/serverPublicClient';
import {
  ValidationError,
  assertAddress,
  assertOptionalAddress,
  assertPlainObject,
  assertString,
  parseEarnChainId,
} from '@/earn-api/lib/validation';

function getRequestString(body: Record<string, unknown>, field: string) {
  const value = body[field];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

function assertTxHash(value: unknown): `0x${string}` {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new ValidationError('INVALID_TX_HASH', 'txHash must be a valid transaction hash');
  }
  return value as `0x${string}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireEarnApiKey(request);
    if (auth instanceof NextResponse) return auth;

    const body = assertPlainObject(await request.json());
    const chainId = parseEarnChainId(getRequestString(body, 'chainId'));
    const userAddress = assertAddress(getRequestString(body, 'userAddress'), 'userAddress');
    const txHash = assertTxHash(assertString(body.txHash, 'txHash'));
    const opportunityId = assertOptionalAddress(
      getRequestString(body, 'opportunityId'),
      'opportunityId',
    );

    const rateLimited = await enforceEarnRateLimit(request, { key: userAddress });
    if (rateLimited) return rateLimited;

    const client = createServerSidePublicClient(chainId);
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      timeout: 5_000,
      pollingInterval: 500,
    });

    if (receipt.status !== 'success') {
      throw new ValidationError('TX_NOT_SUCCESSFUL', 'Transaction is not successful', 409);
    }
    if (getAddress(receipt.from) !== getAddress(userAddress)) {
      throw new ValidationError(
        'TX_SENDER_MISMATCH',
        'Transaction sender does not match userAddress',
        403,
      );
    }

    for (const tag of earnCacheTags.userAction(userAddress, opportunityId)) {
      revalidateTag(tag, 'max');
    }

    return NextResponse.json(
      { revalidated: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    // Don't surface raw upstream errors — viem/RPC errors can include request
    // URLs that contain provider API keys.
    console.error('Earn revalidate-action failed:', error);
    return NextResponse.json(
      { message: 'Failed to revalidate earn action', code: 'EARN_ACTION_REVALIDATION_ERROR' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
