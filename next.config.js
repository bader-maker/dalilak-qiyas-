/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "*.preview.same-app.com",
    "*.replit.dev",
    "*.worf.replit.dev",
    "*.kirk.replit.dev",
    "*.picard.replit.dev",
    "*.janeway.replit.dev",
    "*.riker.replit.dev",
    "*.spock.replit.dev",
    "*.sisko.replit.dev",
  ],
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
