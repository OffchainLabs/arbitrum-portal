import { MoonPay } from '@moonpay/moonpay-node';
import { NextResponse } from 'next/server';

import { isOnrampServiceEnabled } from '../../util/featureFlag';

const moonPayApiKey = process.env.MOONPAY_SK;

const isMoonPayEnabled = isOnrampServiceEnabled('moonpay');

export async function POST(req: Request) {
  if (!isMoonPayEnabled) {
    return NextResponse.json({ message: 'MoonPay is not supported' }, { status: 404 });
  }

  if (typeof moonPayApiKey === 'undefined') {
    throw new Error('MOONPAY_SK variable missing.');
  }
  const moonPay = new MoonPay(moonPayApiKey);

  try {
    if (!req.body) {
      return NextResponse.json({ message: 'Request body is required' }, { status: 400 });
    }

    const body = await req.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ message: 'URL is required' }, { status: 400 });
    }

    if (typeof url !== 'string') {
      return NextResponse.json({ message: 'URL must be a string' }, { status: 400 });
    }

    if (url.length > 2000) {
      return NextResponse.json({ message: 'URL is too long' }, { status: 414 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ message: 'Invalid URL format' }, { status: 400 });
    }

    const signedUrl = moonPay.url.generateSignature(url, {
      returnFullUrl: true,
    });

    if (!signedUrl) {
      return NextResponse.json({ message: 'Failed to generate signature' }, { status: 500 });
    }

    const isSignatureValid = moonPay.url.isSignatureValid(signedUrl);

    if (!isSignatureValid) {
      return NextResponse.json({ message: 'Generated signature is invalid' }, { status: 500 });
    }

    const signatureFromSignedUrl = signedUrl.split('signature=')[1];

    if (!signatureFromSignedUrl) {
      return NextResponse.json(
        { message: 'Failed to extract signature from URL' },
        { status: 500 },
      );
    }

    const signature = decodeURIComponent(signatureFromSignedUrl);

    if (!signature) {
      return NextResponse.json({ message: 'Failed to decode signature' }, { status: 500 });
    }

    return NextResponse.json({ signature }, { status: 200 });
  } catch (error) {
    console.error('MoonPay API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
