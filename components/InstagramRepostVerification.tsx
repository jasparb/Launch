import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { 
  ShareIcon, 
  CheckCircleIcon, 
  XMarkIcon,
  LinkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

interface InstagramRepostVerificationProps {
  onVerified: () => void
  onClose: () => void
}

export default function InstagramRepostVerification({ onVerified, onClose }: InstagramRepostVerificationProps) {
  const { publicKey } = useWallet()
  const [step, setStep] = useState<'instructions' | 'proof' | 'verifying' | 'success'>('instructions')
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Check if user has already verified
  useEffect(() => {
    if (publicKey && typeof window !== 'undefined') {
      const verified = localStorage.getItem(`instagram_verified_${publicKey.toString()}`)
      if (verified) {
        setStep('success')
      }
    }
  }, [publicKey])

  const handleProofSubmit = async () => {
    if (!proofUrl.trim()) {
      alert('Please provide a link to your Instagram repost')
      return
    }

    if (!publicKey) {
      alert('Please connect your wallet first')
      return
    }

    // Basic Instagram URL validation
    if (!proofUrl.includes('instagram.com')) {
      alert('Please provide a valid Instagram link')
      return
    }

    setVerifying(true)
    
    try {
      // Simulate verification process (in production, you'd verify the actual repost)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Store verification
      localStorage.setItem(`instagram_verified_${publicKey.toString()}`, JSON.stringify({
        verified: true,
        proofUrl,
        verifiedAt: Date.now(),
        walletAddress: publicKey.toString()
      }))
      
      // Store global verification record
      const allVerifications = JSON.parse(localStorage.getItem('instagram_verifications') || '{}')
      allVerifications[publicKey.toString()] = {
        verified: true,
        proofUrl,
        verifiedAt: Date.now()
      }
      localStorage.setItem('instagram_verifications', JSON.stringify(allVerifications))
      
      setStep('success')
      
      // Auto-close and grant access after 2 seconds
      setTimeout(() => {
        onVerified()
      }, 2000)
      
    } catch (error) {
      console.error('Verification error:', error)
      alert('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const originalPostUrl = "https://www.instagram.com/p/YOUR_POST_ID/" // Replace with your actual Instagram post URL

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-green-900/20 backdrop-blur-xl rounded-xl border border-green-400/30 max-w-md w-full p-8 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Verified! 🎉</h2>
          <p className="text-green-200 mb-6">
            Thank you for sharing! You now have access to the standalone campaign page.
          </p>
          <button
            onClick={onVerified}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-all"
          >
            Access Standalone Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-xl rounded-xl border border-purple-400/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-purple-400/20">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Unlock Standalone Page</h2>
              <p className="text-purple-200 text-sm">Repost our promo video to get access</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'instructions' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <ShareIcon className="w-5 h-5 text-purple-400" />
                  How to unlock access:
                </h3>
                <ol className="space-y-2 text-purple-200 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>Visit our Instagram promo post</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>Repost the video to your Instagram story or feed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>Copy the link to your repost</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>Submit the link below for verification</span>
                  </li>
                </ol>
              </div>

              {/* Original Post Link */}
              <div className="text-center">
                <p className="text-gray-300 mb-4">📱 Original Promo Post:</p>
                <a
                  href={originalPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  <PhotoIcon className="w-5 h-5" />
                  View Instagram Post
                </a>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => setStep('proof')}
                disabled={!publicKey}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all"
              >
                {publicKey ? 'I\'ve Reposted - Submit Proof' : 'Connect Wallet First'}
              </button>
              
              {!publicKey && (
                <p className="text-yellow-300 text-xs text-center">
                  Connect your wallet to continue with verification
                </p>
              )}
            </div>
          )}

          {step === 'proof' && (
            <div className="space-y-6">
              <div className="text-center">
                <LinkIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Submit Your Repost Link</h3>
                <p className="text-gray-300 text-sm">
                  Paste the URL of your Instagram repost below
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Instagram Repost URL *
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/your-repost-id/"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
                <p className="text-gray-400 text-xs mt-2">
                  Make sure the link points to your repost of our promo video
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  <strong>💡 Tip:</strong> To get your Instagram post URL, tap the "..." menu on your post and select "Copy Link"
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('instructions')}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleProofSubmit}
                  disabled={verifying || !proofUrl.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                >
                  {verifying ? 'Verifying...' : 'Verify Repost'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-400/20 text-center">
          <p className="text-gray-400 text-xs">
            🔒 Your wallet address will be recorded for verification purposes only
          </p>
        </div>
      </div>
    </div>
  )
}