import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  server: {
    port: 5173,
    host: true,
  },
  // Target a slightly older ES version to improve compatibility with
  // older iOS Safari/WebView engines.
  build: {
    target: "es2018",
  },
});
