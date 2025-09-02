// @ts-check type next.config.js

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    fontLoaders: [
      { loader: '@next/font/google', options: { subsets: ['latin'] } }
    ]
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
      // Portal redirects
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
        destination: 'https://orbit.arbitrum.io/',
        permanent: true
      },
      {
        source: '/orbit/:path*',
        destination: '/chains/:path*',
        permanent: true
      },
      // Bridge redirects
      {
        source:
          '/bridge/:slug((?!^$|api/|_next/|public/|restricted)(?!.*\\.[^/]+$).+)',
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
      }
    ]
  }
}
