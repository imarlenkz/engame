import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    fileParallelism: false,
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/env.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
