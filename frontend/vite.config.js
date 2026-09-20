import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Lets the app be built for a subpath deployment (e.g. https://example.com/homekeep/)
// without hardcoding that into the repo. Leave VITE_BASE_PATH unset for a normal
// root deployment. Always include the leading and trailing slash, e.g. "/homekeep/".
const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});

