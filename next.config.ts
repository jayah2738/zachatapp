// 替换原有配置为：
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  devIndicators: false,
}

export default nextConfig;
// Set-ExecutionPolicy -scope Process -ExecutionPolicy Bypass