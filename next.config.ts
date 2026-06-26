import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't infer it from a parent lockfile.
  turbopack: { root: __dirname },
  experimental: {
    // Photo uploads are compressed client-side to well under 1 MB, but allow a
    // little headroom for the rare pass-through original (e.g. an undecodable
    // HEIC). Kept under Vercel's ~4.5 MB function body cap.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
