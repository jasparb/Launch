import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import ClientWalletButton from '../components/ClientWalletButton'
import CampaignList from '../components/CampaignList'
// import CreateCampaign from '../components/CreateCampaign'
import UserPortfolio from '../components/UserPortfolio'
import GlobalActivityFeed from '../components/GlobalActivityFeed'
import ErrorDisplay, { useErrorDisplay } from '../components/ErrorDisplay'
import MyAccessKeys from '../components/MyAccessKeys'

export default function Home() {
  const { publicKey } = useWallet()
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { error, clearError } = useErrorDisplay()

  const handleCampaignCreated = () => {
    setShowCreate(false)
    setRefreshKey(prev => prev + 1) // Force refresh campaign list
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                FundIt
              </h1>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                Live on Devnet
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <ClientWalletButton />
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ErrorDisplay error={error} onClose={clearError} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Hero Section */}
            <div className="text-center py-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Blockchain Crowdfunding with{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Instant Liquidity
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Create campaigns, trade tokens instantly, and build the future on Solana
              </p>
              
              {publicKey ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  🚀 Create Campaign
                </button>
              ) : (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-gray-300 mb-4">Connect your wallet to create campaigns</p>
                  <ClientWalletButton />
                </div>
              )}
            </div>

            {/* Campaign List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Active Campaigns</h3>
                {publicKey && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    + New Campaign
                  </button>
                )}
              </div>
              <CampaignList key={refreshKey} />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* My Access Keys */}
            {publicKey && (
              <MyAccessKeys />
            )}
            
            {/* User Portfolio */}
            {publicKey && (
              <UserPortfolio />
            )}

            {/* Global Activity Feed */}
            <GlobalActivityFeed />
          </div>
        </div>
      </div>

      {/* Create Campaign Modal - Disabled */}
      {/* {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <CreateCampaign onClose={handleCampaignCreated} />
          </div>
        </div>
      )} */}
    </div>
  )
}