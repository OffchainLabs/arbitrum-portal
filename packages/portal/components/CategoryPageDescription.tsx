import Image from 'next/image';
import { Category } from '../common/types';
import { Card } from './Card';

const descriptions: { [id: string]: React.ReactNode } = {
  defi: 'DeFi, short for Decentralized Finance, is a way to do financial activities like lending, borrowing, and trading using blockchain technology instead of traditional banks. It uses smart contracts to automate processes and removes the need for intermediaries, making finance more accessible and open to everyone.',
  nfts: 'An NFT, short for Non-Fungible Token, is a unique digital asset that is stored on a blockchain and can be used to represent ownership of anything from artwork to music to videos. It is a digital certificate of authenticity that makes it impossible to counterfeit or forge, and it also provides a secure way to track ownership.',
  'bridges-and-on-ramps': (
    <>
      Bridges allow users to move their assets between different blockchains.
      <br />
      <br />
      On-ramps allow users to buy cryptocurrencies and other digital assets with
      fiat currency, which is the traditional form of money.
    </>
  ),
  gaming:
    'Web3 gaming is a new paradigm in gaming that uses blockchain technology to give players more control over their in-game assets and experiences. It allows players to own their in-game assets and can trade them with other players. This is in contrast to traditional gaming, where players do not own their in-game assets.',
  'infra-and-tools': (
    <>
      Infra projects provide the foundation for decentralized applications. It
      allows users to own their data and assets, and it ensures that
      transactions are secure and transparent.
      <br />
      <br />
      Tool projects make it easier for developers to build and deploy Web3
      applications. They provide a variety of features that help developers to
      interact with the blockchain, develop smart contracts, and test their
      applications.
    </>
  ),
  'ai-and-depin': (
    <>
      AI can analyze network usage patterns to optimize performance or forecast
      demand, creating more efficient and intelligent decentralized
      infrastructures that scale seamlessly with user needs.
      <br />
      <br />
      DePIN leverages blockchain to coordinate decentralized resources, like
      storage or wireless networks, enabling participants to contribute and earn
      tokens for real-world assets.
    </>
  ),
};

export const CategoryPageDescription = ({
  category,
}: {
  category: Category;
}) => {
  const description = descriptions[category.slug];
  if (!description) return null;

  if (category.slug === 'defi') {
    return (
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-12">
        <Card className="col-span-2 lg:col-span-10">{description}</Card>
        <Card
          cardType="externalLink"
          href="https://l2beat.com/scaling/projects/arbitrum"
          className="col-span-1 flex flex-col items-center justify-center gap-3 p-2 text-xs lg:p-1"
        >
          <Image
            alt="L2Beat Logo"
            src={'/images/l2beat.svg'}
            width={45}
            height={30}
            className="h-8 w-8 rounded-md"
          />
          L2Beat
        </Card>
        <Card
          cardType="externalLink"
          href="https://defillama.com/chain/Arbitrum"
          className="col-span-1 flex flex-col items-center justify-center gap-3 p-2 text-xs lg:p-1"
        >
          <Image
            alt="Defillama Logo"
            src={'/images/defillama.webp'}
            width={30}
            height={30}
            className="h-8 w-8 rounded-md"
          />
          Defillama
        </Card>
      </div>
    );
  }

  return <Card>{description}</Card>;
};
