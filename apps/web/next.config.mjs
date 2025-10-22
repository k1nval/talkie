/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable minification and expose source maps to aid debugging production issues
  swcMinify: false,
  productionBrowserSourceMaps: true,
  webpack(config, { dev }) {
    if (!dev) {
      config.optimization.minimize = false;
      config.optimization.minimizer = [];
    }

    return config;
  },
};

export default nextConfig;
