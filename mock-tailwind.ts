// Mock tailwindcss Config type
export interface Config {
  content?: string[];
  theme?: {
    extend?: Record<string, any>;
  };
  plugins?: any[];
}

// Export a dummy configuration function
export function createConfig(config: Config): Config {
  return config;
}
