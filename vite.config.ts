/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Production only: the local Convex backend runs on http://127.0.0.1 during dev
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://*.convex.cloud; " +
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud; manifest-src 'self'; base-uri 'self'; form-action 'self'";

// GitHub Pages serves the app under /<repo-name>/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/menu-maison/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "csp",
      apply: "build",
      transformIndexHtml: (html: string) => html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  ],
  test: {
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
  },
}));
