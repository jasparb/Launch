import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { buffer } from 'micro'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Disable the default body parser so we can access the raw body
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('Payment succeeded:', paymentIntent.id)
      
      // Here you would:
      // 1. Extract the campaign ID and wallet address from metadata
      // 2. Mint the NFT to the buyer's wallet
      // 3. Update your database with the successful purchase
      
      const { campaignId, walletAddress, accessKeyName } = paymentIntent.metadata
      
      if (campaignId && walletAddress && accessKeyName) {
        try {
          // Trigger NFT minting process
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/nft/mint-access-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaignId,
              walletAddress,
              accessKeyName,
              paymentIntentId: paymentIntent.id
            })
          })
        } catch (error) {
          console.error('Failed to mint NFT after successful payment:', error)
        }
      }
      
      break
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent
      console.log('Payment failed:', failedPayment.id)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.status(200).json({ received: true })
}