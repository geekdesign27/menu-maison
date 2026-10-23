/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// GitHub Pages serves the app under /<repo-name>/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/menu-maison/" : "/",
  plugins: [react(), tailwindcss()],
  test: {
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
  },
}));
