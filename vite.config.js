import { defineConfig } from 'vite';

export default defineConfig({
  base: '/redistricting-map/',
  server: {
    port: 8000,
  },
  build: {
    target: 'esnext',
  }
});
