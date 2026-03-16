/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/api/ayden/favicon",
      },
    ];
  },
};

export default nextConfig;
