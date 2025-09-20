/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Force load all RapidAPI environment variables for marketplace service
    FACEBOOK_MARKETPLACE_RAPIDAPI_KEY: process.env.FACEBOOK_MARKETPLACE_RAPIDAPI_KEY,
    FACEBOOK_MARKETPLACE_RAPIDAPI_HOST: process.env.FACEBOOK_MARKETPLACE_RAPIDAPI_HOST,
    GRAILED_RAPIDAPI_KEY: process.env.GRAILED_RAPIDAPI_KEY,
    GRAILED_RAPIDAPI_HOST: process.env.GRAILED_RAPIDAPI_HOST,
    ETSY_RAPIDAPI_KEY: process.env.ETSY_RAPIDAPI_KEY,
    ETSY_RAPIDAPI_HOST: process.env.ETSY_RAPIDAPI_HOST,
    POSHMARK_RAPIDAPI_KEY: process.env.POSHMARK_RAPIDAPI_KEY,
    POSHMARK_RAPIDAPI_HOST: process.env.POSHMARK_RAPIDAPI_HOST,
    EBAY_RAPIDAPI_KEY: process.env.EBAY_RAPIDAPI_KEY,
    EBAY_RAPIDAPI_HOST: process.env.EBAY_RAPIDAPI_HOST,
    ALIEXPRESS_RAPIDAPI_KEY: process.env.ALIEXPRESS_RAPIDAPI_KEY,
    ALIEXPRESS_RAPIDAPI_HOST: process.env.ALIEXPRESS_RAPIDAPI_HOST,
    STOCKX_RAPIDAPI_KEY: process.env.STOCKX_RAPIDAPI_KEY,
    STOCKX_RAPIDAPI_HOST: process.env.STOCKX_RAPIDAPI_HOST,
  },
}

export default nextConfig
