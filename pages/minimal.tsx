import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { MinimalSmartContract } from '../lib/minimalSmartContract'

export default function Minimal() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [contract, setContract] = useState<MinimalSmartContract | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    tokenSymbol: '',
    tokenName: '',
    totalSupply: '1000000000'
  })
  const [tradeAmount, setTradeAmount] = useState('')

  // Initialize contract when wallet connects
  useEffect(() => {
    if (wallet.publicKey) {
      const sc = new MinimalSmartContract(connection, wallet)
      sc.initialize().then(success => {
        if (success) {
          setContract(sc)
          loadCampaigns(sc)
        }
      })
    } else {
      setContract(null)
      setCampaigns([])
    }
  }, [wallet.publicKey, connection])

  const loadCampaigns = async (sc: MinimalSmartContract) => {
    const allCampaigns = await sc.getAllCampaigns()
    setCampaigns(allCampaigns)
  }

  const createCampaign = async () => {
    if (!contract) return
    
    setLoading(true)
    setMessage('')
    
    const result = await contract.createCampaign(
      formData.name,
      formData.description,
      parseFloat(formData.targetAmount),
      formData.tokenSymbol,
      formData.tokenName,
      parseInt(formData.totalSupply)
    )
    
    setLoading(false)
    
    if (result.success) {
      setMessage(`✅ Campaign created: ${result.campaignId}`)
      setShowCreate(false)
      setFormData({
        name: '',
        description: '',
        targetAmount: '',
        tokenSymbol: '',
        tokenName: '',
        totalSupply: '1000000000'
      })
      loadCampaigns(contract)
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
  }

  const buyTokens = async () => {
    if (!contract || !selectedCampaign || !tradeAmount) return
    
    setLoading(true)
    setMessage('')
    
    const result = await contract.buyTokens(
      selectedCampaign.id,
      parseFloat(tradeAmount)
    )
    
    setLoading(false)
    
    if (result.success) {
      setMessage(`✅ Tokens purchased! Tx: ${result.signature?.slice(0, 8)}...`)
      setTradeAmount('')
      loadCampaigns(contract)
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
  }

  const sellTokens = async () => {
    if (!contract || !selectedCampaign || !tradeAmount) return
    
    setLoading(true)
    setMessage('')
    
    const result = await contract.sellTokens(
      selectedCampaign.id,
      parseFloat(tradeAmount) * 1000000 // Convert to token units
    )
    
    setLoading(false)
    
    if (result.success) {
      setMessage(`✅ Tokens sold! Tx: ${result.signature?.slice(0, 8)}...`)
      setTradeAmount('')
      loadCampaigns(contract)
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Launch.fund - Minimal</h1>
          <WalletMultiButton />
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className={`p-4 rounded ${message.startsWith('✅') ? 'bg-green-900' : 'bg-red-900'}`}>
            {message}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {!wallet.publicKey ? (
          <div className="text-center py-20">
            <h2 className="text-xl mb-4">Connect your wallet to get started</h2>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Campaigns */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Campaigns</h2>
                <button
                  onClick={() => setShowCreate(!showCreate)}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                  disabled={loading}
                >
                  {showCreate ? 'Cancel' : 'Create Campaign'}
                </button>
              </div>

              {/* Create Campaign Form */}
              {showCreate && (
                <div className="bg-gray-800 p-4 rounded mb-4">
                  <input
                    type="text"
                    placeholder="Campaign Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 mb-2 bg-gray-700 rounded"
                  />
                  <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full p-2 mb-2 bg-gray-700 rounded"
                    rows={3}
                  />
                  <input
                    type="number"
                    placeholder="Target Amount (SOL)"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                    className="w-full p-2 mb-2 bg-gray-700 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Token Symbol"
                    value={formData.tokenSymbol}
                    onChange={(e) => setFormData({...formData, tokenSymbol: e.target.value})}
                    className="w-full p-2 mb-2 bg-gray-700 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Token Name"
                    value={formData.tokenName}
                    onChange={(e) => setFormData({...formData, tokenName: e.target.value})}
                    className="w-full p-2 mb-2 bg-gray-700 rounded"
                  />
                  <button
                    onClick={createCampaign}
                    disabled={loading || !formData.name || !formData.targetAmount}
                    className="w-full p-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              )}

              {/* Campaign List */}
              <div className="space-y-2">
                {campaigns.length === 0 ? (
                  <p className="text-gray-400">No campaigns yet</p>
                ) : (
                  campaigns.map(campaign => (
                    <div
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`p-4 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 ${
                        selectedCampaign?.id === campaign.id ? 'border-2 border-blue-500' : ''
                      }`}
                    >
                      <h3 className="font-bold">{campaign.name}</h3>
                      <p className="text-sm text-gray-400">{campaign.description}</p>
                      <div className="mt-2 text-sm">
                        <span className="text-green-400">Raised: {campaign.raisedAmount.toFixed(2)} SOL</span>
                        <span className="text-gray-400"> / {campaign.targetAmount} SOL</span>
                      </div>
                      <div className="text-sm text-blue-400">
                        Price: {campaign.currentPrice.toFixed(6)} SOL
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column - Trading */}
            <div>
              <h2 className="text-xl font-bold mb-4">Trade</h2>
              
              {selectedCampaign ? (
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="font-bold mb-4">{selectedCampaign.name}</h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Current Price</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {selectedCampaign.currentPrice.toFixed(6)} SOL
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Progress</p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(selectedCampaign.raisedAmount / selectedCampaign.targetAmount * 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {selectedCampaign.raisedAmount.toFixed(2)} / {selectedCampaign.targetAmount} SOL
                    </p>
                  </div>

                  <div className="mb-4">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="w-full p-2 bg-gray-700 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={buyTokens}
                      disabled={loading || !tradeAmount}
                      className="p-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Buy (SOL)
                    </button>
                    <button
                      onClick={sellTokens}
                      disabled={loading || !tradeAmount}
                      className="p-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Sell (Tokens)
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-gray-400">
                    <p>Campaign ID: {selectedCampaign.id.slice(0, 8)}...</p>
                    <p>Token Mint: {selectedCampaign.tokenMint.slice(0, 8)}...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 p-4 rounded text-center text-gray-400">
                  Select a campaign to trade
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}