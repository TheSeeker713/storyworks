import type { NextConfig } from "next";

const apiProxy = process.env.STORYWORKS_API_PROXY || "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
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
