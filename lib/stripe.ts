import { loadStripe, Stripe } from '@stripe/stripe-js'

// Initialize Stripe
let stripePromise: Promise<Stripe | null>

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.warn('Stripe publishable key not found. Credit card payments will be disabled.')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

export interface PaymentIntentParams {
  amount: number // in cents
  currency: string
  description: string
  metadata?: Record<string, string>
}

export interface StripePaymentResult {
  success: boolean
  paymentIntentId?: string
  error?: string
}

export class StripePaymentService {
  private stripe: Promise<Stripe | null>

  constructor() {
    this.stripe = getStripe()
  }

  async createPaymentIntent(params: PaymentIntentParams): Promise<{
    clientSecret: string | null
    error?: string
  }> {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      return {
        clientSecret: data.clientSecret,
      }
    } catch (error) {
      return {
        clientSecret: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async confirmPayment(params: {
    clientSecret: string
    paymentMethod: {
      card: any
      billing_details: {
        name: string
        email: string
      }
    }
  }): Promise<StripePaymentResult> {
    try {
      const stripe = await this.stripe
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(params.clientSecret, {
        payment_method: params.paymentMethod
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        paymentIntentId: paymentIntent?.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async processAccessKeyPurchase(params: {
    campaignId: string
    accessKeyName: string
    priceInUSD: number
    buyerEmail: string
    buyerName: string
    walletAddress: string
  }): Promise<{
    success: boolean
    paymentIntentId?: string
    error?: string
  }> {
    try {
      // Create payment intent
      const { clientSecret, error } = await this.createPaymentIntent({
        amount: Math.round(params.priceInUSD * 100), // Convert to cents
        currency: 'usd',
        description: `Access Key: ${params.accessKeyName}`,
        metadata: {
          campaignId: params.campaignId,
          accessKeyName: params.accessKeyName,
          buyerEmail: params.buyerEmail,
          walletAddress: params.walletAddress
        }
      })

      if (error || !clientSecret) {
        throw new Error(error || 'Failed to create payment intent')
      }

      // Return the client secret for frontend processing
      return {
        success: true,
        paymentIntentId: clientSecret
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const stripePaymentService = new StripePaymentService()