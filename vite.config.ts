import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Scheduler — Weekly Planner',
          short_name: 'Scheduler',
          description: 'Professional Weekly Planner',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Đã lược bỏ phần host/port cứng của Replit để tương thích tốt nhất với Vercel
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
