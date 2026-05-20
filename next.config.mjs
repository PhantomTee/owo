/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  webpack: (config) => {
    config.resolve.alias["@react-native-async-storage/async-storage"] = false
    config.resolve.alias["pino-pretty"] = false
    return config
  }
}

export default nextConfig
