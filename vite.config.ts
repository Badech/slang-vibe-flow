// Vanilla TanStack Start + Vite config (npm-friendly).
//
// This file replaces the Lovable wrapper (`@lovable.dev/vite-tanstack-config`)
// with the equivalent vanilla plugins so the project installs cleanly under
// plain `npm install` — no scoped registry, no bun-only resolution.
//
// What the Lovable wrapper used to provide and what we wire manually below:
//   - tanstackStart()       → TanStack Start SSR + nitro build pipeline
//   - viteReact()           → React HMR + JSX
//   - tailwindcss()         → Tailwind 4 zero-config
//   - tsConfigPaths()       → resolves `@/*` from tsconfig.json paths
//   - VITE_* env injection  → Vite already does this for VITE_-prefixed vars
//   - React/TanStack dedupe → resolve.dedupe below
//   - sandbox detection     → server: { port, host, strictPort } below
//
// PWA + Vercel preset (added in Turn 5) are layered on top.

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { nitro } from "nitro/vite";

export default defineConfig({
  // Dedupe React + TanStack across the dep graph so we never end up with
  // two copies in the bundle (causes hooks-rule errors at runtime).
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our
      // SSR error wrapper).
      server: { entry: "server" },
    }),
    // Nitro builds the server output for deployment. It auto-detects Vercel
    // during a Vercel build (sees `VERCEL=1` env var) and writes to
    // `.vercel/output/`. Locally it falls back to the `node` preset and
    // writes to `.output/`. No preset config needed.
    nitro(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifestFilename: "manifest.webmanifest",
      manifest: {
        name: "SlangFlow — Talk like a native",
        short_name: "SlangFlow",
        description:
          "Learn American idioms, slang & texting language. Sound like a native, not a textbook.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        categories: ["education", "lifestyle", "reference"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/terms\/[^/]+$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "slangflow-term-detail",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/terms(\?.*)?$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "slangflow-term-list",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
