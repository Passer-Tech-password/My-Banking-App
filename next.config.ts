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
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://www.googleapis.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.google.com https://www.gstatic.com; img-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com https://www.google.com https://translate.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://translate.google.com; connect-src 'self' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
