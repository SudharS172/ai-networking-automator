/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during build
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
