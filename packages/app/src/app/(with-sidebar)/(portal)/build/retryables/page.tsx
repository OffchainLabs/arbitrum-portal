import { Metadata } from 'next';
import Link from 'next/link';

import { RetryableRedeemer } from '@/app-components/RetryableRedeemer/RetryableRedeemer';
import { EarnBackButtonLabel, earnBackButtonClassName } from '@/app-components/earn/EarnBackButton';
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
    <div className="flex justify-center">
      <div className="flex w-full max-w-[560px] flex-col gap-8">
        <Link href="/build" className={earnBackButtonClassName}>
          <EarnBackButtonLabel />
        </Link>

        <h1 className="text-4xl tracking-[-0.02em]">Retryable Tickets</h1>

        <RetryableRedeemer
          initialChainId={Number.isNaN(chainId) ? undefined : chainId}
          initialTxHash={txHash}
        />
      </div>
    </div>
  );
}
