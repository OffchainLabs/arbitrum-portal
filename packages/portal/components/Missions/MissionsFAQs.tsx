import { FAQs } from '@/components/FAQs';

import { ExternalLink } from '../ExternalLink';

const faqContent = [
  {
    q: 'What is the Arbitrum Arcade?',
    a: (
      <>
        An Onchain Gameathon designed to showcase the most innovative gaming experiences in web3.
        The arcade provides exposure and prizes to up and coming content creators and brings in-game
        achievements onchain with{' '}
        <ExternalLink href="https://www.clique.social/" className="underline">
          Clique
        </ExternalLink>
        , built on top of{' '}
        <ExternalLink href="https://attest.sh/" className="underline">
          EAS
        </ExternalLink>{' '}
        (Ethereum Attestation Service).
      </>
    ),
  },
  {
    q: 'What is Clique?',
    a: (
      <>
        Clique builds identity oracles that verify the provenance of offchain information, learn
        more{' '}
        <ExternalLink href="https://www.clique.tech/" className="underline">
          here
        </ExternalLink>
        .
      </>
    ),
  },
  {
    q: 'What is EAS?',
    a: (
      <>
        EAS (Ethereum Attestation Service) is infrastructure for making attestations onchain or
        offchain, learn more{' '}
        <ExternalLink href="https://attest.sh/" className="underline">
          here
        </ExternalLink>
        .
      </>
    ),
  },
  {
    q: 'How do I become eligible for the prizes as a creator?',
    a: 'Applications to join as an official creator have now closed. You must have applied through the creator form between Feb 26th and March 5th, which were approved by the Arbitrum Foundation.',
  },
  {
    q: 'What’s a Chapter?',
    a: (
      <>
        A chapter represents a week. Each chapter is comprised of 3-4 different games that users can
        play in exchange for onchain attestations and that contribute to a final NFT after the
        campaign has ended.
      </>
    ),
  },
  {
    q: 'Which games are participating?',
    a: (
      <>
        AI Arena, Army of Tactics, BattleFly, BattlePlan!, Bitmates, Cosmik Battle, Dininho,
        Forgotten Runiverse, Kaiju Cards, Knights of the Ether, Kuroro Beasts, Lost Donkeys, Mighty
        Action Heroes, Minters World, Monkey Empire, Pirate Nation, Realm, SankoGameCorp, Tales of
        Elleria, The Beacon, Treasure, Xai, Zeeverse, and ZTX are all involved in the first 7
        chapters of the Arbitrum Arcade.
      </>
    ),
  },
  {
    q: 'Can another game/project get involved?',
    a: (
      <>
        Yes! Make sure to have them apply{' '}
        <ExternalLink
          href="https://docs.google.com/forms/d/e/1FAIpQLSfDsjGEHwIsAx5Z7eZU5IJzbWHAp1TZ1RFnKWV9zXfuIloFXA/viewform?usp=sf_link"
          className="underline"
        >
          here
        </ExternalLink>{' '}
        by April 15th. They must be deployed on an Arbitrum chain and listed on the{' '}
        <ExternalLink href="https://portal.arbitrum.io/projects/gaming" className="underline">
          Arbitrum Portal
        </ExternalLink>{' '}
        to be eligible.
      </>
    ),
  },
  {
    q: 'What is the Arbitrum Foundation’s role in Arbitrum Arcade?',
    a: (
      <>
        The Arbitrum Foundation will livestream gameplay of every chapter of the campaign with
        members of the community.
      </>
    ),
  },
  {
    q: 'What is the “Contribution Score”?',
    a: <>A metric used by Clique to measure a user’s achievements in each specific game.</>,
  },
  {
    q: 'What is the “Arbitrum Ecosystem Score”',
    a: <>A metric used by Clique to measure a user’s involvement in the Arbitrum ecosystem.</>,
  },
  {
    q: 'How do I get my mission listed on this page?',
    a: (
      <>
        Please reach out to the partnerships team to get your mission added! If you are not already
        in touch, please send an email to{' '}
        <ExternalLink href="mailto: partnerships@offchainlabs.com" className="underline">
          partnerships@offchainlabs.com
        </ExternalLink>{' '}
        and someone will reply as soon as possible.
      </>
    ),
  },
  {
    q: 'Are there any prerequisites for getting a mission listed?',
    a: 'One pre-requisite is the project hosting the mission must be listed on the main portal. However, being listed on the main portal does not guarantee a listing on the Ecosystem Missions page.',
  },
  {
    q: 'The website and/or app to complete the mission isn’t working, what do I do?',
    a: 'Please reach out to the team hosting the mission directly.',
  },

  {
    q: 'Will there be another Arbitrum Arcade?',
    a: 'Nothing has been confirmed as of yet, but stay tuned for future events hosted by Arbitrum.',
  },
  {
    q: "What is Arbitrum's involvement in these campaigns?",
    a: 'This page simply aggregates current ecosystem quests, campaigns, and community events. None of these are endorsed by Arbitrum.',
  },
];

export const MissionsFAQs = () => {
  return (
    <>
      <div className="text-3xl">FAQs</div>
      <FAQs content={faqContent} />
    </>
  );
};
