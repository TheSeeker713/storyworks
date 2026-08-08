import type { NextConfig } from "next";

const apiProxy = process.env.STORYWORKS_API_PROXY || "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Checklist and docs use http://127.0.0.1:3000; next dev defaults to localhost.
  // Without this, Next 16 returns 403 on /_next chunks from 127.0.0.1 and the UI never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
};

// Rewrites only in `next dev`. Static export cannot use custom routes; client may call FastAPI directly via NEXT_PUBLIC_API_BASE.
if (process.env.NODE_ENV === "development") {
  nextConfig.rewrites = async () => [
    {
      source: "/api/:path*",
      destination: `${apiProxy}/api/:path*`,
    },
  ];
}

export default nextConfig;
