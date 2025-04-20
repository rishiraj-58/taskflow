/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow static HTML export when env var is set (used for CI builds)
  output: process.env.CI ? 'export' : undefined,
  // Disable image optimization during static export
  images: process.env.CI ? { unoptimized: true } : {},
};

export default nextConfig;
