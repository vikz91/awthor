import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's Next.js adapter creates its own deployment output. Standalone is
  // still required by the Docker image for its minimal production server.
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/onboarding",
        destination: "/books?settings=open",
        permanent: false,
      },
      {
        source: "/books/:bookId/chapters",
        destination: "/books/:bookId?chooser=chapters",
        permanent: false,
      },
      {
        source: "/books/:bookId/characters",
        destination: "/books/:bookId?tool=characters",
        permanent: false,
      },
      {
        source: "/books/:bookId/plots",
        destination: "/books/:bookId?tool=chapter-arc",
        permanent: false,
      },
      {
        source: "/books/:bookId/notes",
        destination: "/books/:bookId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
