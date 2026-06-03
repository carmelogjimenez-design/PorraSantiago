/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite que el deploy no falle por warnings de lint.
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
