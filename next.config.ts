import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
