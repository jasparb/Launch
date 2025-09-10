import { useRouter } from 'next/router'

interface CampaignProps {
  campaign: {
    id?: string
    publicKey: string
    name: string
    description: string
    coverPhoto?: string
    creator: string
    targetAmount: number
    raisedAmount: number
    tokenPrice: number
    marketCap: number
    volume24h: number
    holders: number
    endTimestamp?: number
    realTokenReserves?: number
    tokenTotalSupply?: number
  }
}

export default function CampaignCard({ campaign }: CampaignProps) {
  const router = useRouter()
  
  const progress = (campaign.raisedAmount / campaign.targetAmount) * 100
  const daysLeft = campaign.endTimestamp 
    ? Math.max(0, Math.ceil((campaign.endTimestamp - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0
  
  return (
    <div 
      className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
      onClick={() => {
        const targetId = campaign.id || campaign.publicKey
        console.log('Navigating to campaign:', { targetId, campaignId: campaign.id, campaignPublicKey: campaign.publicKey })
        router.push(`/campaign/${targetId}`)
      }}
    >
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-br from-purple-600 to-blue-600 relative overflow-hidden">
        {campaign.coverPhoto ? (
          <img 
            src={campaign.coverPhoto} 
            alt={campaign.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">{campaign.name}</h3>
          <p className="text-sm text-gray-300 line-clamp-2">{campaign.description}</p>
        </div>
      
      <div className="space-y-3">
        {/* Funding Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Funding Progress</span>
            <span className="text-white font-semibold">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Raised</p>
            <p className="text-white font-semibold text-lg">{campaign.raisedAmount} SOL</p>
          </div>
          <div>
            <p className="text-gray-400">Target</p>
            <p className="text-white font-semibold text-lg">{campaign.targetAmount} SOL</p>
          </div>
        </div>
        
        {daysLeft > 0 && (
          <div className="text-center pt-2">
            <p className="text-gray-400 text-sm">Campaign ends in</p>
            <p className="text-white font-bold text-lg">{daysLeft} days</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">By {campaign.creator}</span>
          <button className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
            View Details →
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}