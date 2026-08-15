/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "discord.js",
      "bullmq",
      "pino",
      "pino-pretty",
    ],
  },
};

module.exports = nextConfig;
