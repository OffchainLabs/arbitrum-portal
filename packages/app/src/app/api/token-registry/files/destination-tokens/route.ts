import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import {
  getDestinationTokens,
  getEligibleDestinationTokens,
} from '@/app/src/token-registry/server/registryFiles';

export const revalidate = 3_600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenList = await getDestinationTokens({
    sourceChainId: Number(searchParams.get('sourceChainId')),
    sourceTokenAddress: (searchParams.get('sourceToken') ?? '').toLowerCase(),
    // Without one, the tokens of every destination chain.
    destinationChainId: searchParams.get('destinationChainId')
      ? Number(searchParams.get('destinationChainId'))
      : undefined,
    query: searchParams.get('q') ?? undefined,
  });

  return NextResponse.json(tokenList, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

const addressSchema = z
  .string()
  .refine(isAddress)
  .transform((address) => address.toLowerCase());
const eligibilitySchema = z.object({
  sourceChainId: z.number().int().positive(),
  sourceToken: addressSchema,
  candidates: z
    .array(z.object({ chainId: z.number().int().positive(), address: addressSchema }))
    .max(200),
});

export async function POST(request: NextRequest) {
  const parsed = eligibilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid token eligibility request' }, { status: 400 });
  }
  const tokenList = await getEligibleDestinationTokens({
    sourceChainId: parsed.data.sourceChainId,
    sourceTokenAddress: parsed.data.sourceToken,
    candidates: parsed.data.candidates,
  });
  return NextResponse.json(tokenList, { headers: { 'Cache-Control': 'private, no-store' } });
}
