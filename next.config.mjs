/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "agentic-fa8eb148.vercel.app"]
    }
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
