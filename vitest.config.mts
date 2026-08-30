import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { appVersionDefine } from './vite.shared.mts';

export default defineConfig({
  define: appVersionDefine,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/renderer/test/setup.ts'],
  },
});
