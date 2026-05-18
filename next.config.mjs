/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
        zlib: false,
      };
    }
    // playwright-core, @sparticuz/chromium은 서버 번들에서만 사용
    config.externals = [...(config.externals || []), 'playwright-core', '@sparticuz/chromium'];
    return config;
  },
};

export default nextConfig;
