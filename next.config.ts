import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix workspace root warning
  experimental: {
    turbo: {
      root: ".",
    },
  },
  // Allow images from Supabase and Google
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
