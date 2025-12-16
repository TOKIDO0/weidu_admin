import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 修复 Next.js 15 的 searchParams/params Promise 警告
  experimental: {
    // 如果使用 Next.js 15，这些选项可以帮助
  },
  // 配置重写规则，将HTML文件请求重定向到静态文件路由
  // 注意：根路径 / 不再重写，让 Next.js 正常处理后台路由
  async rewrites() {
    return [
      {
        source: '/:path*.html',
        destination: '/static/:path*.html',
      },
    ];
  },
};

export default nextConfig;
