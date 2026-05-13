/* eslint-disable max-len */
import type { Config } from 'jest';
import nextJest from 'next/jest.js';
 
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});
 
// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // camelcase-keys and its deps (map-obj, quick-lru) are ESM-only; exclude them
  // from the ignore list so Jest/SWC transforms them to CommonJS.
  transformIgnorePatterns: [
    '<rootDir>/node_modules/.pnpm/(?!(camelcase-keys|map-obj|quick-lru)@)',
    '/node_modules/(?!.pnpm|camelcase-keys|map-obj|quick-lru)',
  ],
};
 
// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
