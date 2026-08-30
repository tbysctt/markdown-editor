import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Keep native file-watcher deps external (also avoids a Rollup warning
      // about chokidar's unused `Stats` import from node:fs).
      external: ['chokidar', 'readdirp'],
    },
  },
});
