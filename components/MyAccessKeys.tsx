import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/router'

export default function MyAccessKeys() {
  const { publicKey } = useWallet()
  const router = useRouter()
  const [ownedKeys, setOwnedKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicKey) {
      setOwnedKeys([])
      setLoading(false)
      return
    }

    // Load all campaigns and check for owned keys
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]')
    const owned: any[] = []

    campaigns.forEach((campaign: any) => {
      const mintedKeys = JSON.parse(localStorage.getItem(`minted_keys_${campaign.id}`) || '{}')
      if (mintedKeys[publicKey.toString()]) {
        owned.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          ...mintedKeys[publicKey.toString()]
        })
      }
    })

    setOwnedKeys(owned)
    setLoading(false)
  }, [publicKey])

  if (!publicKey) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">🔑 My Access Keys</h3>
        <p className="text-gray-400 text-sm">Connect your wallet to view your access keys</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">🔑 My Access Keys</h3>
        <div className="animate-pulse">
          <div className="h-20 bg-white/10 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-bold text-white mb-4">🔑 My Access Keys</h3>
      
      {ownedKeys.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ownedKeys.map((key) => (
            <div
              key={key.tokenId}
              onClick={() => router.push(`/campaign/${key.campaignId}`)}
              className="relative group cursor-pointer"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 hover:border-purple-400/50 transition-all">
                {key.artwork ? (
                  <img 
                    src={key.artwork} 
                    alt={key.campaign}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-4xl">🔑</div>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-bold truncate">{key.campaignName}</p>
                    <p className="text-gray-300 text-xs">#{key.tokenId.slice(-6)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-gray-400 text-sm">You don't own any access keys yet</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-3 px-4 py-2 bg-purple-600/20 border border-purple-400/30 text-purple-400 hover:bg-purple-600/30 rounded-lg text-sm font-medium transition-all"
          >
            Explore Campaigns
          </button>
        </div>
      )}
    </div>
  )
}