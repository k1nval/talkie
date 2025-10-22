/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable minification and expose source maps to aid debugging production issues
  swcMinify: false,
  productionBrowserSourceMaps: true,
};

export default nextConfig;
