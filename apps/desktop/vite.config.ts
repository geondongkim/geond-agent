import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("/react/") || id.includes("/react-dom/")) {
            return "react-vendor";
          }
          if (id.includes("/@radix-ui/")) {
            return "ui-vendor";
          }
          if (id.includes("/lucide-react/")) {
            return "icon-vendor";
          }
          return "vendor";
        }
      }
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  preview: {
    port: 1421,
    strictPort: true
  }
});
