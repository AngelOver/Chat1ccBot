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
  async redirects() {
    return [
      {
        source: '/v1/completions',
        destination: '/api/completions',
        permanent: true,
      },
    ]
  },
};

module.exports = nextConfig;
