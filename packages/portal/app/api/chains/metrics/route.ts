import { NextResponse } from 'next/server';
import { DuneAPIError, fetchChainMetricsFromDune } from './utils';

export async function GET() {
  try {
    // Use server-side environment variable for the API key
    if (!process.env.DUNE_API_KEY) {
      throw new DuneAPIError('Dune API key is not configured', 511);
    }

    // Fetch chain metrics from Dune
    const chainsData = await fetchChainMetricsFromDune(
      process.env.DUNE_API_KEY,
    );

    // Set cache headers - 5 minutes cache
    const response = NextResponse.json({
      data: chainsData,
      timestamp: new Date().toISOString(),
      source: 'dune',
    });

    response.headers.set('Cache-Control', 'public, s-maxage=300');

    return response;
  } catch (error) {
    console.error('Error in chains metrics endpoint:', error);

    if (error instanceof DuneAPIError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.name,
          timestamp: new Date().toISOString(),
        },
        { status: error.statusCode },
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while processing the request',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
