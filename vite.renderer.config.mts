import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { appVersionDefine } from './vite.shared.mts';

export default defineConfig({
  define: appVersionDefine,
  plugins: [react()],
});
