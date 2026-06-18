import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't infer it from a parent lockfile.
  turbopack: { root: __dirname },
};

export default nextConfig;
