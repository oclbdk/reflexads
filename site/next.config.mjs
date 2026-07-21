/** @type {import('next').NextConfig} */

// Served from https://oclbdk.github.io/reflexads — everything lives under /reflexads.
// In dev we want a clean root, so the basePath only applies to production builds.
const isProd = process.env.NODE_ENV === 'production'
const basePath = isProd ? '/reflexads' : ''

const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default nextConfig
