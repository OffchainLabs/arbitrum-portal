// @ts-check type next.config.js
const path = require('path');

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding', '@duneanalytics/client-sdk');
    // pnpm's strict isolation can cause packages to resolve their own copy
    // of context-dependent libraries, breaking React context sharing.
    // Force all imports to the single hoisted copy in the root node_modules.
    /** @param {string} pkg */
    const hoisted = (pkg) => path.resolve(__dirname, '../../node_modules', pkg);
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tanstack/react-query$': hoisted('@tanstack/react-query'),
      'overmind-react$': hoisted('overmind-react'),
      'overmind$': hoisted('overmind'),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'portal.arbitrum.io',
      },
      {
        protocol: 'https',
        hostname: 'blog.arbitrum.io',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'portal-data.arbitrum.io',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'images.vaults.fyi',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/status',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://portal.arbitrum.io',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Bridge
      {
        source: '/bridge/:slug((?!^$|api/|_next/|public/|restricted|embed|buy)(?!.*\\.[^/]+$).+)',
        missing: [
          {
            type: 'query',
            key: 'destinationChain',
          },
          {
            type: 'header',
            key: 'accept',
            value: 'image/.*',
          },
        ],
        destination: '/bridge?destinationChain=:slug',
        permanent: true,
      },
      {
        source: '/images/:path*',
        has: [
          {
            type: 'host',
            value: 'bridge.arbitrum.io',
          },
        ],
        destination: 'https://portal.arbitrum.io/images/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'bridge.arbitrum.io',
          },
        ],
        destination: 'https://portal.arbitrum.io/bridge/:path*',
        permanent: true,
      },
      // Portal
      {
        source: '/one',
        destination: '/?chains=arbitrum-one',
        permanent: true,
      },
      {
        source: '/nova',
        destination: '/?chains=arbitrum-nova',
        permanent: true,
      },
      {
        source: '/odyssey',
        destination: '/',
        permanent: true,
      },
      {
        source: '/missions',
        destination: '/',
        permanent: true,
      },
      {
        source: '/arcade',
        destination: '/',
        permanent: true,
      },
      {
        source: '/orbit',
        destination: '/orbit/ecosystem',
        permanent: true,
      },
      {
        source: '/orbit/launch',
        destination: '/chains/ecosystem',
        permanent: true,
      },
      {
        source: '/orbit/:path*',
        destination: '/chains/:path*',
        permanent: true,
      },
      {
        source: '/projects/nfts',
        destination: '/projects?subcategories=nft-collection_nft-marketplace',
        permanent: true,
      },
      {
        source: '/earn',
        destination: '/earn/market',
        permanent: false,
      },
    ];
  },
};
