import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

interface CreateCampaignProps {
  onClose: () => void
}

export default function CreateCampaign({ onClose }: CreateCampaignProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    duration: '30',
    fundingRatio: '50',
    conversionStrategy: 'hybrid',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !signTransaction) return
    
    setLoading(true)
    try {
      // TODO: Initialize Anchor program and call create_campaign
      console.log('Creating campaign:', formData)
      
      // For now, just simulate success
      setTimeout(() => {
        alert('Campaign created successfully!')
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Create New Campaign</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            placeholder="Enter campaign name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            placeholder="Describe your project and goals"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Amount (SOL)
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.1"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              placeholder="100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (days)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Funding vs Liquidity Ratio
            <span className="text-xs text-gray-400 ml-2">
              (Higher funding = faster goal completion, lower liquidity = higher price volatility)
            </span>
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Funding Pool</span>
              <span className="text-sm text-white font-semibold">{formData.fundingRatio}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="10"
              value={formData.fundingRatio}
              onChange={(e) => setFormData({ ...formData, fundingRatio: e.target.value })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <div className="text-center">
                <div>10%</div>
                <div className="text-xs">Max Liquidity</div>
              </div>
              <div className="text-center">
                <div>50%</div>
                <div className="text-xs">Balanced</div>
              </div>
              <div className="text-center">
                <div>90%</div>
                <div className="text-xs">Fast Funding</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Liquidity Pool</span>
              <span className="text-sm text-white font-semibold">{100 - parseInt(formData.fundingRatio)}%</span>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price Protection Strategy
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                formData.conversionStrategy === 'instant'
                  ? 'bg-green-500/20 border-green-500'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
              onClick={() => setFormData({ ...formData, conversionStrategy: 'instant' })}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-sm font-semibold text-white">Instant</div>
                <div className="text-xs text-gray-400 mt-1">Convert to USDC immediately</div>
              </div>
            </div>
            
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                formData.conversionStrategy === 'hybrid'
                  ? 'bg-blue-500/20 border-blue-500'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
              onClick={() => setFormData({ ...formData, conversionStrategy: 'hybrid' })}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">⚖️</div>
                <div className="text-sm font-semibold text-white">Hybrid</div>
                <div className="text-xs text-gray-400 mt-1">50% USDC, 50% SOL</div>
              </div>
            </div>
            
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                formData.conversionStrategy === 'deferred'
                  ? 'bg-orange-500/20 border-orange-500'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
              onClick={() => setFormData({ ...formData, conversionStrategy: 'deferred' })}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">📈</div>
                <div className="text-sm font-semibold text-white">Deferred</div>
                <div className="text-xs text-gray-400 mt-1">Convert on withdrawal</div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-gray-800/30 rounded-lg">
            <div className="text-sm text-gray-300">
              {formData.conversionStrategy === 'instant' && (
                <>
                  <strong className="text-green-400">Maximum Protection:</strong> All funding instantly converted to USDC. Zero price risk, small gas cost per purchase.
                </>
              )}
              {formData.conversionStrategy === 'hybrid' && (
                <>
                  <strong className="text-blue-400">Balanced Risk:</strong> 50% stable USDC, 50% SOL exposure. Moderate protection, reduced gas costs.
                </>
              )}
              {formData.conversionStrategy === 'deferred' && (
                <>
                  <strong className="text-orange-400">SOL Exposure:</strong> Keep all funding as SOL until withdrawal. Potential upside/downside, lowest gas costs.
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">Campaign Economics</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Your token allocation: 10% of total supply (vested)</li>
            <li>• Funding rate: {formData.fundingRatio}% of purchases → {
              formData.conversionStrategy === 'instant' ? 'instant USDC' :
              formData.conversionStrategy === 'hybrid' ? '50% USDC + 50% SOL' :
              'SOL (convert on withdrawal)'
            }</li>
            <li>• Liquidity rate: {100 - parseInt(formData.fundingRatio)}% → tradeable SOL market</li>
            <li>• After goal reached: 100% to liquidity for maximum trading</li>
            <li>• Trading fees: 1% of all trades goes to you continuously</li>
            <li>• Risk level: {
              formData.conversionStrategy === 'instant' ? 'Minimal (USDC protected)' :
              formData.conversionStrategy === 'hybrid' ? 'Moderate (partial SOL exposure)' :
              'Higher (full SOL exposure until withdrawal)'
            }</li>
          </ul>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}