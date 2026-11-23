import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Two entry points: the main app window and the transparent desktop world.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        world: resolve(import.meta.dirname, 'world.html'),
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
