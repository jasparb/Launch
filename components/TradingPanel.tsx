import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'

interface TradingPanelProps {
  campaign: any
}

export default function TradingPanel({ campaign }: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const calculateTokensOut = (solAmount: number) => {
    const k = (campaign.virtualSolReserves + campaign.realSolReserves) * 
              (campaign.virtualTokenReserves + campaign.realTokenReserves)
    const newSolReserves = campaign.virtualSolReserves + campaign.realSolReserves + solAmount
    const newTokenReserves = k / newSolReserves
    const tokensOut = (campaign.virtualTokenReserves + campaign.realTokenReserves) - newTokenReserves
    return tokensOut * 0.99 // Apply 1% fee
  }

  const calculateSolOut = (tokenAmount: number) => {
    const k = (campaign.virtualSolReserves + campaign.realSolReserves) * 
              (campaign.virtualTokenReserves + campaign.realTokenReserves)
    const newTokenReserves = campaign.virtualTokenReserves + campaign.realTokenReserves + tokenAmount
    const newSolReserves = k / newTokenReserves
    const solOut = (campaign.virtualSolReserves + campaign.realSolReserves) - newSolReserves
    return solOut * 0.99 // Apply 1% fee
  }

  const handleBuy = async () => {
    if (!publicKey || !signTransaction || !amount) return
    
    setLoading(true)
    try {
      // TODO: Call buy_tokens instruction
      console.log('Buying tokens:', amount, 'SOL')
      
      // Simulate transaction
      setTimeout(() => {
        alert(`Successfully bought tokens for ${amount} SOL!`)
        setAmount('')
      }, 2000)
    } catch (error) {
      console.error('Error buying tokens:', error)
      alert('Failed to buy tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleSell = async () => {
    if (!publicKey || !signTransaction || !amount) return
    
    setLoading(true)
    try {
      // TODO: Call sell_tokens instruction
      console.log('Selling tokens:', amount)
      
      // Simulate transaction
      setTimeout(() => {
        alert(`Successfully sold ${amount} tokens!`)
        setAmount('')
      }, 2000)
    } catch (error) {
      console.error('Error selling tokens:', error)
      alert('Failed to sell tokens')
    } finally {
      setLoading(false)
    }
  }

  const estimatedOutput = activeTab === 'buy' 
    ? amount ? calculateTokensOut(parseFloat(amount)).toFixed(2) : '0'
    : amount ? calculateSolOut(parseFloat(amount)).toFixed(4) : '0'

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 sticky top-4">
      <h2 className="text-xl font-bold text-white mb-4">Trade {campaign.tokenSymbol}</h2>
      
      <div className="flex mb-4">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2 px-4 rounded-l-lg font-semibold transition-all ${
            activeTab === 'buy'
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-2 px-4 rounded-r-lg font-semibold transition-all ${
            activeTab === 'sell'
              ? 'bg-red-500 text-white'
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            {activeTab === 'buy' ? 'SOL Amount' : `${campaign.tokenSymbol} Amount`}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            min="0"
            step="0.001"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
          <p className="text-sm text-gray-400 mb-1">Estimated {activeTab === 'buy' ? 'Tokens' : 'SOL'} Out</p>
          <p className="text-lg font-semibold text-white">
            {estimatedOutput} {activeTab === 'buy' ? campaign.tokenSymbol : 'SOL'}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Price Impact</span>
            <span className="text-white">~0.5%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Trading Fee</span>
            <span className="text-white">1%</span>
          </div>
        </div>

        {publicKey ? (
          <button
            onClick={activeTab === 'buy' ? handleBuy : handleSell}
            disabled={loading || !amount}
            className={`w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 ${
              activeTab === 'buy'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {loading ? 'Processing...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${campaign.tokenSymbol}`}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3 bg-gray-600 text-gray-300 rounded-lg font-semibold cursor-not-allowed"
          >
            Connect Wallet to Trade
          </button>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Position</h3>
        {publicKey ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Balance</span>
              <span className="text-white">0 {campaign.tokenSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Value</span>
              <span className="text-white">$0.00</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Connect wallet to view</p>
        )}
      </div>
    </div>
  )
}