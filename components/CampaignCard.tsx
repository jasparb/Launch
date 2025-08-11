import { useState } from 'react'
import { useRouter } from 'next/router'

interface CampaignProps {
  campaign: {
    publicKey: string
    name: string
    description: string
    creator: string
    targetAmount: number
    raisedAmount: number
    tokenPrice: number
    marketCap: number
    volume24h: number
    holders: number
    endTimestamp: number
  }
}

export default function CampaignCard({ campaign }: CampaignProps) {
  const router = useRouter()
  const progress = (campaign.raisedAmount / campaign.targetAmount) * 100
  const daysLeft = Math.ceil((campaign.endTimestamp - Date.now()) / (24 * 60 * 60 * 1000))
  
  return (
    <div 
      className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
      onClick={() => router.push(`/campaign/${campaign.publicKey}`)}
    >
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-2">{campaign.name}</h3>
        <p className="text-sm text-gray-300 line-clamp-2">{campaign.description}</p>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="text-white">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-400">Raised</p>
            <p className="text-white font-semibold">{campaign.raisedAmount} SOL</p>
          </div>
          <div>
            <p className="text-gray-400">Target</p>
            <p className="text-white font-semibold">{campaign.targetAmount} SOL</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-400">Token Price</p>
            <p className="text-green-400 font-semibold">${campaign.tokenPrice}</p>
          </div>
          <div>
            <p className="text-gray-400">Market Cap</p>
            <p className="text-white font-semibold">${campaign.marketCap.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-gray-400">24h Vol</p>
            <p className="text-white">${campaign.volume24h.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Holders</p>
            <p className="text-white">{campaign.holders}</p>
          </div>
          <div>
            <p className="text-gray-400">Ends In</p>
            <p className="text-white">{daysLeft}d</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Creator: {campaign.creator}</span>
          <button className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
            Trade →
          </button>
        </div>
      </div>
    </div>
  )
}