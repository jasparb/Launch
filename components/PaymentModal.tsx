import { useState, useEffect } from 'react'
import { XCircleIcon } from '@heroicons/react/24/outline'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { stripePaymentService } from '../lib/stripe'
import { createSimpleNFTMinter } from '../lib/simpleNftMinting'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  accessKeyName: string
  priceInUSD: number
  accessKeyImage?: string
  onSuccess?: (mintAddress: string) => void
}

export default function PaymentModal({
  isOpen,
  onClose,
  campaignId,
  accessKeyName,
  priceInUSD,
  accessKeyImage,
  onSuccess
}: PaymentModalProps) {
  const { publicKey } = useWallet()
  const wallet = useWallet()
  const { connection } = useConnection()
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'card'>('crypto')
  const [stripeAvailable, setStripeAvailable] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    cardNumber: '',
    expiryDate: '',
    cvc: ''
  })

  // Check if Stripe is available
  useEffect(() => {
    const checkStripe = () => {
      const hasStripeKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      setStripeAvailable(hasStripeKey)
      if (!hasStripeKey) {
        console.warn('Stripe publishable key not configured. Credit card payments disabled.')
        // Force crypto payment method if Stripe is not available
        setPaymentMethod('crypto')
      }
    }
    checkStripe()
  }, [])

  if (!isOpen) return null

  const handleCryptoPurchase = async () => {
    if (!publicKey || !wallet.signTransaction) {
      alert('Please connect your wallet first')
      return
    }

    setProcessing(true)
    try {
      console.log('Creating simple NFT minter with user wallet...')
      
      // Create NFT minter that uses the user's wallet
      const nftMinter = createSimpleNFTMinter(connection, wallet)
      
      // Mint the NFT using user's wallet - this will prompt Phantom
      const result = await nftMinter.mintSimpleNFT({
        name: accessKeyName,
        symbol: 'ACCESS',
        description: `Access key for ${campaignId} campaign`,
        image: accessKeyImage || ''
      })

      if (result.success) {
        alert(`Access Key NFT minted successfully!\n\nNFT Address: ${result.mint}\nTransaction: ${result.transaction}`)
        
        // Store the minted NFT locally for UI updates
        const mintedKeys = JSON.parse(localStorage.getItem(`minted_nfts_${campaignId}`) || '{}')
        const userKeys = mintedKeys[publicKey.toString()] || []
        userKeys.push(result.mint)
        mintedKeys[publicKey.toString()] = userKeys
        localStorage.setItem(`minted_nfts_${campaignId}`, JSON.stringify(mintedKeys))
        
        // Call success callback
        onSuccess?.(result.mint)
        onClose()
      } else {
        throw new Error(result.error || 'Minting failed')
      }
    } catch (error) {
      console.error('Crypto purchase failed:', error)
      alert('Minting failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  const handleCardPurchase = async () => {
    if (!stripeAvailable) {
      alert('Credit card payments are not available. Please configure Stripe keys.')
      return
    }

    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    if (!formData.email || !formData.name || !formData.cardNumber || !formData.expiryDate || !formData.cvc) {
      alert('Please fill in all payment details')
      return
    }

    setProcessing(true)
    try {
      // Create payment intent
      const { clientSecret, error } = await stripePaymentService.createPaymentIntent({
        amount: Math.round(priceInUSD * 100),
        currency: 'usd',
        description: `Access Key: ${accessKeyName}`,
        metadata: {
          campaignId,
          walletAddress: publicKey.toString(),
          accessKeyName
        }
      })

      if (error || !clientSecret) {
        throw new Error(error || 'Failed to create payment')
      }

      // In a real implementation, you'd use Stripe Elements here
      // For now, we'll simulate a successful payment and mint the NFT
      const mintResponse = await fetch('/api/nft/mint-access-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          walletAddress: publicKey.toString(),
          accessKeyName,
          paymentIntentId: clientSecret
        })
      })

      const mintResult = await mintResponse.json()

      if (mintResult.success) {
        alert(`Payment successful! Access Key minted to your wallet. Transaction: ${mintResult.transaction}`)
        onClose()
      } else {
        throw new Error(mintResult.error || 'Minting failed')
      }
    } catch (error) {
      console.error('Card purchase failed:', error)
      alert('Purchase failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Purchase Access Key</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Access Key Preview */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              {accessKeyImage && (
                <img
                  src={accessKeyImage}
                  alt={accessKeyName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-white">{accessKeyName}</h3>
                <p className="text-2xl font-bold text-green-400">${priceInUSD}</p>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Payment Method
            </label>
            {!stripeAvailable && (
              <div className="mb-3 p-2 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  💡 Credit card payments require Stripe configuration. Using free Solana minting only.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('crypto')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  paymentMethod === 'crypto'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-white/20 text-gray-300 hover:border-purple-300'
                }`}
              >
                <div className="font-medium">Solana</div>
                <div className="text-xs opacity-75">Free Mint</div>
              </button>
              <button
                onClick={() => stripeAvailable && setPaymentMethod('card')}
                disabled={!stripeAvailable}
                className={`p-3 rounded-lg border text-center transition-all ${
                  paymentMethod === 'card' && stripeAvailable
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : !stripeAvailable
                    ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                    : 'border-white/20 text-gray-300 hover:border-purple-300'
                }`}
              >
                <div className="font-medium">Credit Card</div>
                <div className="text-xs opacity-75">
                  {stripeAvailable ? 'Stripe' : 'Unavailable'}
                </div>
              </button>
            </div>
          </div>

          {/* Payment Forms */}
          {paymentMethod === 'crypto' ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400">🎉</span>
                  <span className="text-sm font-medium text-purple-300">Free Mint Available!</span>
                </div>
                <p className="text-sm text-gray-300">
                  Get your access key minted directly to your wallet for free (gas fees apply).
                </p>
              </div>
              <button
                onClick={handleCryptoPurchase}
                disabled={processing || !publicKey}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Minting...' : publicKey ? 'Mint Access Key' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expiry
                  </label>
                  <input
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={formData.cvc}
                    onChange={(e) => setFormData({...formData, cvc: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    placeholder="123"
                  />
                </div>
              </div>
              <button
                onClick={handleCardPurchase}
                disabled={processing || !publicKey}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : `Pay $${priceInUSD}`}
              </button>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-400 text-center">
            NFT will be minted directly to your connected wallet: {publicKey ? `${publicKey.toString().slice(0, 8)}...` : 'Not connected'}
          </div>
        </div>
      </div>
    </div>
  )
}