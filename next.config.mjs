/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  trailingSlash: false,

  skipProxyUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // ✅ يضمن إن ملف اللوجو يتضمّن فعليًا جوه الـ serverless function
  // بتاعت الـ route ده، عشان قراءته عن طريق fs تنجح دايمًا وبسرعة
  // من غير ما نحتاج نلجأ لأي fetch عبر الشبكة.
  outputFileTracingIncludes: {
    "/api/portfolio/contact": ["./public/images/logo/logo.png"],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "mongodb-client-encryption": "commonjs mongodb-client-encryption",
      });

      // ✅ منع Webpack من تصغير أسماء الـ functions في Mongoose models
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    } else {
      // ⚠️ الـ fallback ده لازم يتطبّق على الكلينت (المتصفح) بس، مش على
      // السيرفر — لأن السيرفر (Node.js) لازم يفضل يقدر يستخدم fs, path,
      // crypto...إلخ عادي. لو اتطبّق على السيرفر كمان، أي كود سيرفر
      // بيستخدم fs (زي قراءة اللوجو للإيميلات) بيفشل أو يبطّئ بشكل غريب.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        "timers/promises": false,
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
    }

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "codeschool.online" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/webp"],
    qualities: [75, 100], // ✅ يسمح بالـ quality اللي بتستخدمه فعليًا في الكود
  },

  env: {
    MAX_FILE_SIZE: "15728640",
    ALLOWED_IMAGE_TYPES: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },

  staticPageGenerationTimeout: 180,
};

export default nextConfig;