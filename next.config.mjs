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
    // ✅ FIX: معالجة حزم MongoDB بشكل صحيح
    if (isServer) {
      config.externals.push({
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
        'socks': 'commonjs socks',
        'aws4': 'commonjs aws4',
      });
    } else {
      // ✅ FIX: منع تحميل حزم السيرفر في العميل
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'mongodb-client-encryption': false,
        'mongodb': false,
        'mongoose': false,
        'socks': false,
        'aws4': false,
        'fs': false,
        'net': false,
        'tls': false,
        'dns': false,
        'child_process': false,
        'timers/promises': false,
        'async_hooks': false,
        'crypto': false,
        'stream': false,
        'http': false,
        'https': false,
        'zlib': false,
        'path': false,
        'os': false,
        'url': false,
        'assert': false,
        'util': false,
      };
    }

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'codeschool.online' },
      { protocol: 'http', hostname: 'localhost' },
      // ✅ إضافة مجالات إضافية إذا لزم
      { protocol: 'https', hostname: '**.codeschool.online' },
      { protocol: 'https', hostname: 'cdn.codeschool.online' },
    ],
    formats: ['image/webp'],
    // ✅ تحسين الأداء
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  env: {
    MAX_FILE_SIZE: "15728640", // 15 MB (15 * 1024 * 1024)
    ALLOWED_IMAGE_TYPES: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
    // ✅ إضافة متغيرات بيئة إضافية
    NODE_ENV: process.env.NODE_ENV || 'production',
  },

  // ✅ FIX: إعدادات الـ body parser والـ server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
      // ✅ تمكين serverActions بشكل صحيح
      allowedOrigins: [
        'localhost:3000',
        'codeschool.online',
        '*.codeschool.online'
      ],
    },
    // ✅ إضافة هذا لمعالجة حزم MongoDB
    // serverComponentsExternalPackages تم نقلها خارج experimental
  },

  // ✅ FIX: نقل serverComponentsExternalPackages هنا (خارج experimental)
  serverExternalPackages: [
    'mongoose',
    'mongodb',
    'mongodb-client-encryption',
    'socks',
    'aws4'
  ],

  // ✅ إزالة transpilePackages لأنها تتعارض مع serverExternalPackages
  // transpilePackages: [], // إزالة هذا السطر بالكامل

  // ✅ تحسين إعدادات الملفات الثابتة
  staticPageGenerationTimeout: 180,
  
  // ✅ إضافة إعدادات للأمان والأداء
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ];
  },

  // ✅ تحسين إعدادات الـ bundle
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },

  // ✅ إعدادات الـ output
  output: 'standalone', // ✅ مهم لـ Docker والـ deployment

  // ✅ إعدادات الـ modularize imports لتحسين الأداء
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // ✅ تحسين caching
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;