/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow static HTML export when env var is set (used for CI builds)
  output: process.env.CI ? 'export' : undefined,
  // Disable image optimization during static export
  images: process.env.CI ? { unoptimized: true } : {},
  // For CI environments, minimize webpack optimization to prevent issues
  webpack: (config, { isServer }) => {
    if (process.env.CI) {
      // Reduce optimization in CI environments
      config.optimization.minimize = false;
    }
    return config;
  },
};

export default nextConfig;
