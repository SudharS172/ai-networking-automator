/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: true
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'playwright-core': 'playwright-core',
      })
    }
    return config
  },
}

module.exports = nextConfig
