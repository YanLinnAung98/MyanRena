import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const projectDir = path.dirname(fileURLToPath(import.meta.url));

function emitPwaManifestPlugin(): Plugin {
  return {
    name: 'emit-pwa-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(
          {
            name: 'Vanguard Arena — MyanRena',
            short_name: 'MyanRena',
            description: 'Real-Time Multiplayer Tabletop & Wise Owl Quiz Cyber Arena',
            start_url: './',
            scope: './',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#070b14',
            theme_color: '#0a0e17',
            icons: [
              {
                src: 'https://cdn-icons-png.flaticon.com/512/686/686589.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
            ],
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), emitPwaManifestPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(projectDir, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
