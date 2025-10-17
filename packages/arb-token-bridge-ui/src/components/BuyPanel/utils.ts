import { ChainId } from '@/bridge/types/ChainId';

export const onrampServices = [
  {
    name: 'Transak',
    slug: 'transak',
    logo: '/images/onramp/transak.webp',
    link: 'https://global.transak.com',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Ramp',
    slug: 'ramp',
    logo: '/images/onramp/ramp.webp',
    link: 'https://ramp.network/buy',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Mt Pelerin',
    slug: 'mt-pelerin',
    logo: '/images/onramp/mt_pelerin.webp',
    link: 'https://www.mtpelerin.com/buy-crypto',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Coinbase Pay',
    slug: 'coinbase-pay',
    logo: '/images/onramp/coinbase.webp',
    link: 'https://login.coinbase.com/signin?client_id=258660e1-9cfe-4202-9eda-d3beedb3e118&oauth_challenge=851bae2a-c907-413d-9a12-71c1dfaa5d4f',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Onramp',
    slug: 'onramp',
    logo: '/images/onramp/onramp.webp',
    link: 'https://onramp.money',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Banxa',
    slug: 'banxa',
    logo: '/images/onramp/banxa.webp',
    link: 'https://checkout.banxa.com',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Simplex',
    slug: 'simplex',
    logo: '/images/onramp/simplex.webp',
    link: 'https://buy.simplex.com',
    chains: [ChainId.Ethereum],
  },
  {
    name: 'Kado',
    slug: 'kado',
    logo: '/images/onramp/kado.webp',
    link: 'https://swapped.com/',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
  {
    name: 'Alchemy Pay',
    slug: 'alchemy-pay',
    logo: '/images/onramp/alchemy_pay.webp',
    link: 'https://ramp.alchemypay.org/#/index',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne],
  },
] as const;
