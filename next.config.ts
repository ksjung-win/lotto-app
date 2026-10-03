/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 클라우드플레어 정적 배포 설정
  images: {
    unoptimized: true,
  },
};

export default nextConfig;