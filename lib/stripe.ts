import { Stripe } from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe with secret key (server-side only)
let stripe: Stripe

if (typeof window === 'undefined') {
  // Server-side
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  })
}

// Client-side Stripe instance
let stripePromise: Promise<any> | null = null

export const getStripe = () => {
  if (!stripePromise) {
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!stripePublishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required')
    }
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

// Server-side Stripe instance
export const getServerStripe = () => {
  if (!stripe) {
    throw new Error('Stripe not initialized')
  }
  return stripe
}

// Price IDs for different plans (you'll need to create these in Stripe Dashboard)
export const STRIPE_PRICES = {
  plus: {
    monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || 'price_plus_monthly',
    yearly: process.env.STRIPE_PRICE_PLUS_YEARLY || 'price_plus_yearly',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  },
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  plus: {
    name: 'Plus',
    credits: 500,
    priceIds: {
      monthly: STRIPE_PRICES.plus.monthly,
      yearly: STRIPE_PRICES.plus.yearly,
    },
  },
  pro: {
    name: 'Pro',
    credits: 5000,
    priceIds: {
      monthly: STRIPE_PRICES.pro.monthly,
      yearly: STRIPE_PRICES.pro.yearly,
    },
  },
}
