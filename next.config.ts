import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      {
        protocol: "https",
        hostname: "generativelanguage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
