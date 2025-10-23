const normalizeAssetPrefix = (prefix) => {
  if (!prefix) {
    return '';
  }

  if (prefix === '/') {
    return '';
  }

  const withoutTrailing = prefix.replace(/\/+$/, '');

  if (/^https?:\/\//.test(withoutTrailing)) {
    return withoutTrailing;
  }

  const withoutLeading = withoutTrailing.replace(/^\/+/, '');

  return withoutLeading ? `/${withoutLeading}` : '';
};

const rawAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '/static';
const assetPrefix = normalizeAssetPrefix(rawAssetPrefix) || '/static';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable minification and expose source maps to aid debugging production issues
  swcMinify: false,
  productionBrowserSourceMaps: true,
  assetPrefix,
  images: {
    loader: 'default',
    path: `${assetPrefix}/_next/image`,
  },
  webpack(config, { dev }) {
    if (!dev) {
      config.optimization.minimize = false;
      config.optimization.minimizer = [];
    }

    return config;
  },
};

export default nextConfig;
