import type { NextConfig } from "next";
import path from "path";

const isExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  ...(isExport
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
