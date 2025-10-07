import { Metadata } from 'next';

import { SearchParamsProps } from '@/app/src/types';
import { PathnameEnum } from '@/bridge/constants';

import BridgePageWrapper from '../BridgePageWrapper';

export const metadata: Metadata = {
  title: 'On-Ramp to Arbitrum',
  description:
    "On-ramp directly to Arbitrum with one of several third party providers. Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum's security model. Arbitrum is a Layer 2 Optimistic Rollup.",
};

export default async function BridgeBuyPage(props: SearchParamsProps) {
  const searchParams = await props.searchParams;
  return <BridgePageWrapper searchParams={searchParams} redirectPath={PathnameEnum.BUY} />;
}
