import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Constitution I: strip all console.* calls in production
    minify: 'esbuild',
  },
  esbuild: {
    // Constitution I: no PHI leaks via console in production bundle
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/features/**'],
      thresholds: { lines: 70 },
    },
    exclude: ['tests/contract/**', 'tests/e2e/**', 'node_modules/**'],
  },
}));