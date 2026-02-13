import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const tailwindcss = await import('@tailwindcss/vite');
  return {
    plugins: [
      react(),
      tailwindcss.default(),
      ...(process.env.ANALYZE ? [visualizer({ open: true, filename: 'dist/stats.html' })] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
