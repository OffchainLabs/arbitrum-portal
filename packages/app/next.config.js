// @ts-check type next.config.js

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'portal.arbitrum.io'
      },
      {
        protocol: 'https',
        hostname: 'blog.arbitrum.io',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'portal-data.arbitrum.io',
        port: ''
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/api/status',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://portal.arbitrum.io'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET'
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      // Bridge
      {
        source:
          '/bridge/:slug((?!^$|api/|_next/|public/|restricted|embed)(?!.*\\.[^/]+$).+)',
        missing: [
          {
            type: 'query',
            key: 'destinationChain'
          },
          {
            type: 'header',
            key: 'accept',
            value: 'image/.*'
          }
        ],
        destination: '/bridge?destinationChain=:slug',
        permanent: true
      },
      {
        source: '/images/:path*',
        has: [
          {
            type: 'host',
            value: 'bridge.arbitrum.io'
          }
        ],
        destination: 'https://portal.arbitrum.io/images/:path*',
        permanent: true
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'bridge.arbitrum.io'
          }
        ],
        destination: 'https://portal.arbitrum.io/bridge/:path*',
        permanent: true
      },
      // Portal
      {
        source: '/one',
        destination: '/?chains=arbitrum-one',
        permanent: true
      },
      {
        source: '/nova',
        destination: '/?chains=arbitrum-nova',
        permanent: true
      },
      {
        source: '/odyssey',
        destination: '/',
        permanent: true
      },
      {
        source: '/missions',
        destination: '/',
        permanent: true
      },
      {
        source: '/arcade',
        destination: '/',
        permanent: true
      },
      {
        source: '/orbit',
        destination: '/orbit/ecosystem',
        permanent: true
      },
      {
        source: '/orbit/launch',
        destination: '/chains/ecosystem',
        permanent: true
      },
      {
        source: '/orbit/:path*',
        destination: '/chains/:path*',
        permanent: true
      }
    ]
  }
}
