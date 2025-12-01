import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/public", // This tells Vite to serve files from here
  publicDir: false,
  
  // FIX 1: Removed manual postcss config. Vite will auto-detect the file we created.

  build: {
    minify: false,
    outDir: "../../dist/public", // Relative to 'root'
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // FIX 2: Use process.cwd() instead of __dirname (which doesn't exist in ESM)
        main: resolve(process.cwd(), "src/public/ts/main.ts"),
        landing: resolve(process.cwd(), "src/public/ts/screens/landing.ts"),
        signup: resolve(process.cwd(), "src/public/ts/screens/signup.ts"),
        login: resolve(process.cwd(), "src/public/ts/screens/login.ts"),
        lobby: resolve(process.cwd(), "src/public/ts/screens/lobby.ts"),
        gameRoom: resolve(process.cwd(), "src/public/ts/screens/gameRoom.ts"),
        gameResults: resolve(process.cwd(), "src/public/ts/screens/gameResults.ts"),
        settings: resolve(process.cwd(), "src/public/ts/screens/settings.ts"),
        header: resolve(process.cwd(), "src/public/ts/header.ts"),
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
    // FIX 3: Explicitly set origin to allow Express (port 3000) to load scripts
    origin: 'http://localhost:5173',
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
