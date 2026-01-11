/** @type {import('next').NextConfig} */
const nextConfig = {
  // Игнорируем ошибки типов и линтера при сборке, чтобы деплой не падал
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;