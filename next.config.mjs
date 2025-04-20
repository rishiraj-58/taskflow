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

      // Skip PostCSS and Tailwind processing in CI
      if (process.env.SKIP_TAILWIND === 'true') {
        const rules = config.module.rules;
        
        // Find the PostCSS loader rule and modify it
        for (const rule of rules) {
          if (!rule.oneOf) continue;
          
          for (const oneOf of rule.oneOf) {
            if (!oneOf.use || !Array.isArray(oneOf.use)) continue;
            
            const postcssLoader = oneOf.use.find(use => 
              use && typeof use === 'object' && use.loader && use.loader.includes('postcss-loader')
            );
            
            if (postcssLoader) {
              // Empty the options to skip PostCSS processing
              postcssLoader.options = { postcssOptions: { plugins: [] } };
            }
          }
        }
      }
    }
    return config;
  },
};

export default nextConfig;
