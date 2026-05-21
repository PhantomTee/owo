/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  webpack: (config, { isServer }) => {
    config.resolve.alias["@react-native-async-storage/async-storage"] = false
    config.resolve.alias["pino-pretty"] = false
    if (isServer) {
      config.resolve.alias["@circle-fin/w3s-pw-web-sdk"] = false
    }
    return config
  }
}

export default nextConfig
