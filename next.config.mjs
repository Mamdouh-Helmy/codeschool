/** @type {import('next').NextConfig} */
const nextConfig = {
  // ========== إعدادات الـ API ==========
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  // ========== إعدادات الصور ==========
  images: {
    remotePatterns: [
      // الصور المحلية
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3000",
        pathname: "/uploads/**",
      },
      // الصور الخارجية الشائعة
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
  },

  // ========== إعدادات التحسين ==========  experimental: {
    serverComponentsExternalPackages: ["mongoose", "sharp"],
  

  // ========== إعدادات Webpack ==========
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // تحسين حجم الحزمة
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        maxSize: 200000, // 200KB
        cacheGroups: {
          default: false,
          vendors: false,
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: "react",
            chunks: "all",
            priority: 20,
          },
          ui: {
            test: /[\\/]node_modules[\\/](lucide-react|react-hot-toast)[\\/]/,
            name: "ui",
            chunks: "all",
            priority: 10,
          },
        },
      },
    };

    return config;
  },

  // ========== إعدادات أخرى ==========
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  trailingSlash: false,
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // ========== إعدادات الـ Environment ==========
  env: {
    MAX_FILE_SIZE: "5242880", // 5MB
    ALLOWED_IMAGE_TYPES: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  },

  // ========== إعدادات الـ API Body Parser ==========
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: "10mb",
    externalResolver: true,
  },

  // ========== إعدادات الـ Static Files ==========
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