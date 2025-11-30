import { resolve } from "path";
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
        main: resolve(__dirname, "src/public/ts/main.ts"),
        landing: resolve(__dirname, "src/public/ts/screens/landing.ts"),
        signup: resolve(__dirname, "src/public/ts/screens/signup.ts"),
        login: resolve(__dirname, "src/public/ts/screens/login.ts"),
        lobby: resolve(__dirname, "src/public/ts/screens/lobby.ts"),
        gameRoom: resolve(__dirname, "src/public/ts/screens/gameRoom.ts"),
        gameResults: resolve(__dirname, "src/public/ts/screens/gameResults.ts"),
        settings: resolve(__dirname, "src/public/ts/screens/settings.ts"),
        header: resolve(__dirname, "src/public/ts/header.ts"),
      },
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "styles/[name][extname]";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
});
