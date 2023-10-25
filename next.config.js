const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,

  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/v1/chat/completions',
        destination: '/api/completions'
      },
    ]
  },
};

module.exports = nextConfig;
