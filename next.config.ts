import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const baseConfig: NextConfig = {
  sassOptions: {
    includePaths: ["./src/styles"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.origin === self.location.origin,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-resources",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/icons"),
        handler: "NetworkFirst",
        options: {
          cacheName: "icon-search",
          networkTimeoutSeconds: 2,
        },
      },
      {
        urlPattern: ({ url }) => url.hostname.includes("api.iconify.design"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "iconify",
          expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
  },
})(baseConfig);
