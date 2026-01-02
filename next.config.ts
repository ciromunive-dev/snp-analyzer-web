/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import type { NextConfig } from "next";

const config: NextConfig = {

  // Turbopack es el bundler por defecto en Next.js 16
  turbopack: {
    // Configuración adicional si es necesaria
  },

  // Configuración de imágenes para avatares de OAuth
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Transpile packages si es necesario
  transpilePackages: [],

  // Configuración experimental
  experimental: {
    // Cache del sistema de archivos para Turbopack en desarrollo
    turbopackFileSystemCacheForDev: true,
  },
};

export default config;
