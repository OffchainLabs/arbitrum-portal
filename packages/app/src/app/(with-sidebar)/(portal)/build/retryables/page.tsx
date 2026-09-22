import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Metadata } from 'next';
import Link from 'next/link';

import { RetryableRedeemer } from '@/app-components/RetryableRedeemer/RetryableRedeemer';
import { SearchParamsProps } from '@/app/src/types';

const metadataContent = {
  title: 'Retryable tickets',
  description:
    'Check the status of a cross-chain message to an Arbitrum chain, and redeem it if it was not redeemed automatically.',
};

export function generateMetadata(): Metadata {
  return {
    title: metadataContent.title,
    description: metadataContent.description,
    openGraph: {
      title: metadataContent.title,
      description: metadataContent.description,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: metadataContent.title,
      description: metadataContent.description,
    },
  };
}

export default async function RetryablesPage(props: SearchParamsProps) {
  const searchParams = await props.searchParams;

  const chainId = Number(searchParams.chainId);
  const txHash = typeof searchParams.tx === 'string' ? searchParams.tx : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/build" className="arb-hover flex w-fit items-center gap-2 text-sm text-white/70">
        <ArrowLeftIcon className="h-4 w-4" />
        Build &amp; Monitor
      </Link>

      <div className="flex justify-center">
        <RetryableRedeemer
          initialChainId={Number.isNaN(chainId) ? undefined : chainId}
          initialTxHash={txHash}
        />
      </div>
    </div>
  );
}
