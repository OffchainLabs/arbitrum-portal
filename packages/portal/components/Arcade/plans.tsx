/**
 * IMPORTANT NOTE : All the dates used in the plan are ET dates
 */

export type ArcadeWeeklyPlan = {
  title: React.ReactNode;
  missionTimeStart: string;
  missionTimeEnd: string;
  missions: { projectId: string; missionDetailsLink: string }[];
};

export const ARCADE_WEEKLY_PLAN = [
  {
    title: 'Chapter 1',
    missionTimeStart: '2024-03-11 12:00',
    missionTimeEnd: '2024-03-17 23:59',
    missions: [
      {
        projectId: 'treasure-dao',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-treasure',
      },
      {
        projectId: 'ai-arena',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-aiarena',
      },
      {
        projectId: 'pirate-nation',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-pirate',
      },
      {
        projectId: 'dininho-funworld',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-dininho',
      },
    ],
  },
  {
    title: 'Chapter 2',
    missionTimeStart: '2024-03-18 12:00',
    missionTimeEnd: '2024-03-24 23:59',
    missions: [
      {
        projectId: 'ztx',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-ztx',
      },
      {
        projectId: 'tales-of-elleria',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-tales-of-elleria',
      },
      {
        projectId: 'monkey-empire',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-monkey-empire',
      },
    ],
  },
  {
    title: 'Chapter 3',
    missionTimeStart: '2024-03-25 12:00',
    missionTimeEnd: '2024-03-31 23:59',
    missions: [
      {
        projectId: 'cosmik-battle',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-cosmik-battle',
      },
      {
        projectId: 'zeeverse',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-zeeverse',
      },
      {
        projectId: 'knights-of-the-ether',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-knights-of-the-ether',
      },
    ],
  },
  {
    title: 'Chapter 4',
    missionTimeStart: '2024-04-01 12:00',
    missionTimeEnd: '2024-04-07 23:59',
    missions: [
      {
        projectId: 'battlefly',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-battlefly',
      },
      {
        projectId: 'kaiju-cards',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-kaiju-cards',
      },
      {
        projectId: 'realm',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-realm',
      },
    ],
  },
  {
    title: 'Chapter 5',
    missionTimeStart: '2024-04-08 12:00',
    missionTimeEnd: '2024-04-14 23:59',
    missions: [
      {
        projectId: 'battleplan',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-battleplan',
      },
      {
        projectId: 'the-lost-donkeys',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-thelostdonkeys',
      },
    ],
  },
  {
    title: 'Chapter 6',
    missionTimeStart: '2024-04-15 12:00',
    missionTimeEnd: '2024-04-21 23:59',
    missions: [
      {
        projectId: 'kuroro-beast',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-kuroro-beasts',
      },
      {
        projectId: 'mighty-action-heroes',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-mighty-action-heroes',
      },

      {
        projectId: 'bitmates',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-bitmates',
      },
    ],
  },
  {
    title: 'Chapter 7',
    missionTimeStart: '2024-04-22 12:00',
    missionTimeEnd: '2024-04-28 23:59',
    missions: [
      {
        projectId: 'the-beacon',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-the-beacon',
      },
      {
        projectId: 'rhascau',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-rhascau',
      },
    ],
  },
  {
    title: 'Chapter 8',
    missionTimeStart: '2024-04-29 12:00',
    missionTimeEnd: '2024-05-05 23:59',
    missions: [
      {
        projectId: 'king-of-destiny',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-infinigods',
      },
    ],
  },
  {
    title: 'Chapter 9',
    missionTimeStart: '2024-05-06 12:00',
    missionTimeEnd: '2024-05-12 23:59',
    missions: [
      {
        projectId: 'tarochi',
        missionDetailsLink:
          'https://arbitrum.clique.tech/individual/arbitrum-tarochi',
      },
    ],
  },
] as const satisfies ArcadeWeeklyPlan[];
