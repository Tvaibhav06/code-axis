import type { NextConfig } from "next";

const config: NextConfig = {
  // Optional local verification directory when a Windows build cache is locked.
  distDir: process.env.BRD_BUILD_DIR || ".next",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "sharp"],
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }];
  },
};

export default config;
