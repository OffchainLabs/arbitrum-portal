import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';

export const CommonAddress = {
  Ethereum: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    tokenMessengerContractAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    APE: '0x4d224452801aced8b2f0aebe155379bb5d594381',
  },
  ArbitrumOne: {
    'USDC': '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'USDC.e': '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    'USDT': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    'WBTC': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    'tokenMessengerContractAddress': '0x19330d10d9cc8751218eaf51e8885d058642e08a',
    'CU': '0x89c49a3fa372920ac23ce757a029e6936c0b8e02',
    'APE': '0x7f9fbf9bdd3f4105c478b996b648fe6e828a1e98',
  },
  // Xai Mainnet
  660279: {
    CU: '0x89c49a3fa372920ac23ce757a029e6936c0b8e02',
  },
  Sepolia: {
    USDC: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    tokenMessengerContractAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  },
  ArbitrumSepolia: {
    'USDC': '0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d',
    'USDC.e': '0x119f0e6303bec7021b295ecab27a4a1a5b37ecf0',
    'tokenMessengerContractAddress': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  },
  Base: {
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    USDT: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
    WBTC: '0x0555e30da8f98308edb960aa94c0db47230d2b9c',
    APE: '0x6a7e3f839382fbb6a6131d4aae864aaeb362292d',
  },
  ApeChain: {
    USDT: '0x674843c06ff83502ddb4d37c2e09c01cda38cbc8',
    USDCe: '0xf1815bd50389c46847f0bda824ec8da914045d14',
    WETH: '0xf4d9235269a96aadafc9adae454a0618ebe37949',
  },
  Superposition: {
    WBTC: '0x6e142cdaefa4ba7786e8d1ff74968db67c3b910d',
    USDCe: '0x6c030c5cc283f791b26816f325b9c632d964f8a1',
  },
} as const;

export const commonUsdcToken: ERC20BridgeToken = {
  decimals: 6,
  address: CommonAddress.Ethereum.USDC,
  symbol: 'placeholder',
  type: TokenType.ERC20,
  name: 'placeholder',
  listIds: new Set<string>(),
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png',
};

export const bridgedUsdcToken: ERC20BridgeToken = {
  ...commonUsdcToken,
  symbol: 'USDC.e',
};

export const nativeUsdcToken: ERC20BridgeToken = {
  ...commonUsdcToken,
  symbol: 'USDC',
};
