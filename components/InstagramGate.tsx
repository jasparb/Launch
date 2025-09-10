import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import InstagramRepostVerification from './InstagramRepostVerification'
import {
  LockClosedIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

interface InstagramGateProps {
  children: React.ReactNode
  requiredForAccess?: boolean
}

export default function InstagramGate({ children, requiredForAccess = true }: InstagramGateProps) {
  const { publicKey } = useWallet()
  const [isVerified, setIsVerified] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkVerificationStatus()
  }, [publicKey])

  const checkVerificationStatus = async () => {
    setLoading(true)
    
    // If verification is not required, allow access
    if (!requiredForAccess) {
      setIsVerified(true)
      setLoading(false)
      return
    }

    // If no wallet connected, show lock screen
    if (!publicKey) {
      setIsVerified(false)
      setLoading(false)
      return
    }

    if (typeof window !== 'undefined') {
      try {
        // Check if user has verified Instagram repost
        const verified = localStorage.getItem(`instagram_verified_${publicKey.toString()}`)
        
        if (verified) {
          const verificationData = JSON.parse(verified)
          if (verificationData.verified) {
            setIsVerified(true)
          } else {
            setIsVerified(false)
          }
        } else {
          setIsVerified(false)
        }
      } catch (error) {
        console.error('Error checking verification:', error)
        setIsVerified(false)
      }
    } else {
      setIsVerified(false)
    }
    
    setLoading(false)
  }

  const handleVerified = () => {
    setIsVerified(true)
    setShowVerification(false)
  }

  const handleUnlock = () => {
    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }
    setShowVerification(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Checking access...</p>
        </div>
      </div>
    )
  }

  // If verified or verification not required, show the content
  if (isVerified || !requiredForAccess) {
    return <>{children}</>
  }

  // Show unlock screen as overlay on top of the campaign
  return (
    <div className="relative">
      {/* Campaign content in background */}
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
      
      {/* Unlock overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-50">
        <div className="max-w-lg w-full text-center">
        {/* Lock Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-purple-400/30">
            <LockClosedIcon className="w-12 h-12 text-purple-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <ShareIcon className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          Exclusive Access
        </h1>
        
        <p className="text-xl text-gray-300 mb-6">
          This standalone campaign page is unlocked by sharing our promo video
        </p>
        
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-purple-400/20 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
            <ShareIcon className="w-5 h-5 text-purple-400" />
            How to unlock:
          </h3>
          <div className="space-y-3 text-gray-300 text-sm">
            <div className="flex items-center gap-3">
              <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
              <span>Repost our Instagram promo video</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
              <span>Submit your repost link for verification</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
              <span>Get instant access to exclusive content</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleUnlock}
            disabled={!publicKey}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
          >
            <ShareIcon className="w-5 h-5" />
            {publicKey ? 'Unlock with Instagram Repost' : 'Connect Wallet to Continue'}
          </button>
          
          {!publicKey && (
            <p className="text-yellow-300 text-sm">
              You need to connect your wallet to verify your Instagram repost
            </p>
          )}
        </div>

        </div>

        {/* Verification Modal */}
        {showVerification && (
          <InstagramRepostVerification
            onVerified={handleVerified}
            onClose={() => setShowVerification(false)}
          />
        )}
      </div>
    </div>
  )
}