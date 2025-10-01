import Link from 'next/link';

import { BRIDGE_LINK } from '@/common/constants';
import { Card } from '@/components/Card';
import { ExternalLink } from '@/components/ExternalLink';
import { FAQs } from '@/components/FAQs';

const faqContent = [
  {
    q: 'What is Arbitrum?',
    a: (
      <>
        A technology suite designed to scale Ethereum. You can use Arbitrum chains to do all things
        you do on Ethereum — use Web3 apps, deploy smart contracts, etc., but your transactions will
        be cheaper and faster. Learn more{' '}
        <ExternalLink
          className="underline"
          href="https://docs.arbitrum.io/welcome/arbitrum-gentle-introduction"
        >
          here
        </ExternalLink>
        .
      </>
    ),
  },
  {
    q: 'How do I move funds to Arbitrum?',
    a: (
      <>
        You can withdraw ETH into Arbitrum from most centralized exchanges. You can also bridge ETH
        from Ethereum using the{' '}
        <Link className="underline" href={BRIDGE_LINK}>
          official Arbitrum bridge
        </Link>
        .
      </>
    ),
  },
  {
    q: 'What is $ARB?',
    a: (
      <>
        Arbitrum&apos;s governance token, an ERC-20 token native to the Arbitrum One chain. Owning
        $ARB makes you a member of the{' '}
        <ExternalLink
          className="underline"
          href="https://docs.arbitrum.foundation/dao-glossary#arbitrum-dao"
        >
          Arbitrum DAO
        </ExternalLink>{' '}
        and allows you to participate in Arbitrum&apos;s on-chain governance.
      </>
    ),
  },
];

export const HomePageFAQs = () => (
  <Card>
    <div className="flex h-full flex-col gap-4">
      <div className="text-2xl">Frequently Asked Questions</div>
      <hr className="border-white/40" />

      <FAQs content={faqContent} />
    </div>
  </Card>
);
