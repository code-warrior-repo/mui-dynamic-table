import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm'],
  target: 'es2022',
  clean: true,
  sourcemap: true,
  banner: { js: "'use client';" },
  external: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled', '@tanstack/react-table']
});
