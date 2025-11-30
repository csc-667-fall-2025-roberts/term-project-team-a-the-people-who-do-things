import { defineConfig } from 'vite';
import { resolve } from 'path';


export default defineConfig({
  root: 'src/public',
  publicDir: false,
  css: {
   postcss: './postcss.config.js',
    },
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/public/ts/main.ts'),
        styles: resolve(__dirname, 'src/public/styles/main.css'),
      },
        output: {
            entryFileNames: 'js/[name].js',
            chunkFileNames: 'js/[name].js',
            assetFileNames: (assetInfo) => {
                if (assetInfo.names && assetInfo.names.some(name => name.endsWith('.css'))) {
                    return 'styles/[name][extname]';
                }
                return 'assets/[name][extname]';
            },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api':  {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

