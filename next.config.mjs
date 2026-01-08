/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      });
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
  
  reactStrictMode: true,
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  trailingSlash: false,
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  
  env: {
    MAX_FILE_SIZE: "5242880",
    ALLOWED_IMAGE_TYPES: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  },
  
  images: {
    domains: ['codeschool.online', 'localhost'],
    formats: ['image/webp'],
  },
  
  staticPageGenerationTimeout: 180,
  
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/linux-x64",
    ],
  },
};

export default nextConfig;