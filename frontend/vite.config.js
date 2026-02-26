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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/') || id.includes('node_modules/scheduler/')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('@assistant-ui')) {
              return 'vendor-assistant';
            }
            if (id.includes('node_modules/remark') || id.includes('node_modules/rehype') || id.includes('node_modules/micromark') || id.includes('node_modules/mdast') || id.includes('node_modules/unified')) {
              return 'vendor-markdown';
            }
            if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
              return 'vendor-i18n';
            }
          },
        },
      },
    },
  };
});
