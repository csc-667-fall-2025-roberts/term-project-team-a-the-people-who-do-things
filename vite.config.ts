// noinspection JSUnusedGlobalSymbols

import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  root: "src/public",
  publicDir: false,
  build: {
    minify: false,
    outDir: "../../dist/public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "src/public/ts/main.ts"),
        header: resolve(process.cwd(), "src/public/ts/header.ts"),
      },
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.names && assetInfo.names.some((name) => name.endsWith(".css"))) {
            return "styles/[name][extname]";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
  server: {
    port: 5173,
    origin: "http://localhost:5173",
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
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
