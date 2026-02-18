import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' https://translate.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.google.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://translate.google.com; connect-src 'self' https://translate.google.com; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
