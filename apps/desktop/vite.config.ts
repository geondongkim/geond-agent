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
          // Markdown rendering stack (react-markdown + remark/rehype/micromark
          // pipeline + highlight.js core languages). Isolated into its own chunk
          // so the generic vendor budget stays small.
          if (
            id.includes("/react-markdown/") ||
            id.includes("/remark-") ||
            id.includes("/remark/") ||
            id.includes("/rehype-") ||
            id.includes("/micromark") ||
            id.includes("/mdast") ||
            id.includes("/hast") ||
            id.includes("/unist-util") ||
            id.includes("/vfile") ||
            id.includes("/highlight.js/")
          ) {
            return "markdown-vendor";
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
