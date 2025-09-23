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
      }
    ]
  }
}
