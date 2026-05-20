import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

import { earnCacheTags } from '@/earn-api/lib/cache';
import { enforceEarnRateLimit } from '@/earn-api/lib/rateLimit';
import { createEarnPublicClient } from '@/earn-api/lib/serverPublicClient';
import {
  ValidationError,
  assertAddress,
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
    const body = assertPlainObject(await request.json());
    const chainId = parseEarnChainId(getRequestString(body, 'chainId'));
    const userAddress = assertAddress(getRequestString(body, 'userAddress'), 'userAddress');
    const txHash = assertTxHash(assertString(body.txHash, 'txHash'));

    const rateLimited = await enforceEarnRateLimit(request, { key: userAddress });
    if (rateLimited) return rateLimited;

    const client = createEarnPublicClient(chainId);
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

    for (const tag of earnCacheTags.userAction(userAddress)) revalidateTag(tag);

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
