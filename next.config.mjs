/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  trailingSlash: false,

  skipProxyUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      });

      // ✅ منع Webpack من تصغير أسماء الـ functions في Mongoose models
      // بيحل مشكلة "TypeError: a is not a function" في production
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      'timers/promises': false,
      async_hooks: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
      url: false,
      assert: false,
      util: false,
    };

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'codeschool.online' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/webp'],
  },

  env: {
    MAX_FILE_SIZE: "15728640",
    ALLOWED_IMAGE_TYPES: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },

  staticPageGenerationTimeout: 180,
};

export default nextConfig;