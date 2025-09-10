import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import PaymentModal from './PaymentModal'

interface AccessKeyMintingProps {
  campaignId: string
  campaign: any
  onMint?: () => void
}

export default function AccessKeyMinting({ campaignId, campaign, onMint }: AccessKeyMintingProps) {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [userNFTs, setUserNFTs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey || !campaign) return
    
    // Check if user already has an access key NFT
    checkUserAccessKeys()
  }, [publicKey, campaignId, campaign])

  const checkUserAccessKeys = async () => {
    if (!publicKey) return
    
    setLoading(true)
    try {
      // Check local storage for minted NFTs
      const mintedKeys = JSON.parse(localStorage.getItem(`minted_nfts_${campaignId}`) || '{}')
      const userKeys = mintedKeys[publicKey.toString()] || []
      setUserNFTs(userKeys)
    } catch (error) {
      console.error('Failed to check user access keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseComplete = (mintAddress: string) => {
    // Store the minted NFT address locally
    const mintedKeys = JSON.parse(localStorage.getItem(`minted_nfts_${campaignId}`) || '{}')
    const userKeys = mintedKeys[publicKey?.toString() || ''] || []
    userKeys.push(mintAddress)
    mintedKeys[publicKey?.toString() || ''] = userKeys
    localStorage.setItem(`minted_nfts_${campaignId}`, JSON.stringify(mintedKeys))
    
    setUserNFTs(userKeys)
    onMint?.()
  }

  if (!campaign || !campaign.enableAccessKeys) {
    return null
  }

  const accessKeyConfig = campaign.accessKeyConfig || {}
  const priceInUSD = accessKeyConfig.pricePerKey || 1
  const hasAccessKey = userNFTs.length > 0

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">🔑</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Access Key NFT</h3>
          <p className="text-gray-400 text-sm">Get exclusive project access</p>
        </div>
      </div>

      {/* Access Key Preview */}
      <div className="bg-white/10 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          {accessKeyConfig.artwork && (
            <img
              src={accessKeyConfig.artwork}
              alt={accessKeyConfig.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h4 className="font-semibold text-white">{accessKeyConfig.name || `${campaign.name} Access Key`}</h4>
            <p className="text-green-400 text-xl font-bold">${priceInUSD}</p>
            {accessKeyConfig.maxSupply && (
              <p className="text-xs text-gray-400">Limited to {accessKeyConfig.maxSupply} keys</p>
            )}
            {accessKeyConfig.collectionAddress && (
              <p className="text-xs text-purple-400">Collection: {accessKeyConfig.collectionAddress.slice(0, 8)}...</p>
            )}
          </div>
        </div>
      </div>

      {/* User Status */}
      {publicKey ? (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="text-gray-400 mt-2">Checking your access keys...</p>
            </div>
          ) : hasAccessKey ? (
            <div className="text-center py-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-400/30">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-green-400 font-semibold text-lg mb-2">Access Key NFT Owned!</p>
              <p className="text-gray-300 text-sm">You own {userNFTs.length} access key{userNFTs.length > 1 ? 's' : ''}</p>
              {userNFTs.map((nft, index) => (
                <p key={index} className="text-xs text-gray-400 mt-1">
                  NFT: {nft.slice(0, 8)}...{nft.slice(-8)}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400">🎉</span>
                  <span className="text-sm font-medium text-purple-300">Real Solana NFT!</span>
                </div>
                <p className="text-sm text-gray-300">
                  This access key will be minted as a real NFT directly to your wallet.
                </p>
              </div>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
              >
                🎨 Mint Access Key NFT - ${priceInUSD}
              </button>

              <div className="text-xs text-gray-400 text-center">
                💡 Choose between free Solana minting or USD payment via Stripe
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-4">Connect your wallet to mint an access key NFT</p>
          <div className="text-sm text-gray-500">
            Access keys are minted as real Solana NFTs that appear in your wallet
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        campaignId={campaignId}
        accessKeyName={accessKeyConfig.name || `${campaign.name} Access Key`}
        priceInUSD={priceInUSD}
        accessKeyImage={accessKeyConfig.artwork}
        onSuccess={(mintAddress) => {
          // Update local state with the new NFT
          setUserNFTs(prev => [...prev, mintAddress])
          onMint?.()
        }}
      />
    </div>
  )
}