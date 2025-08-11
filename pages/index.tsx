import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import CampaignList from '../components/CampaignList'
import CreateCampaign from '../components/CreateCampaign'

export default function Home() {
  const { publicKey } = useWallet()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                launch.fund
              </h1>
              <span className="ml-4 text-sm text-gray-400">
                Crowdfunding with instant liquidity on Solana
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {publicKey && (
                <button
                  onClick={() => setShowCreate(!showCreate)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Create Campaign
                </button>
              )}
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCreate && publicKey ? (
          <CreateCampaign onClose={() => setShowCreate(false)} />
        ) : (
          <>
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-white mb-4">
                Fund the Future, Trade the Vision
              </h2>
              <p className="text-xl text-gray-300">
                Back innovative projects and get tradeable tokens with instant liquidity
              </p>
            </div>

            <div className="grid gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">How It Works</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl mb-2">🚀</div>
                    <h4 className="font-semibold text-white mb-1">Launch Campaign</h4>
                    <p className="text-sm text-gray-300">
                      Create a campaign with automatic token generation and bonding curve
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl mb-2">💰</div>
                    <h4 className="font-semibold text-white mb-1">Fund & Trade</h4>
                    <p className="text-sm text-gray-300">
                      Support projects and receive tokens you can trade instantly
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl mb-2">📈</div>
                    <h4 className="font-semibold text-white mb-1">Price Discovery</h4>
                    <p className="text-sm text-gray-300">
                      Token prices rise with demand, rewarding early supporters
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CampaignList />
          </>
        )}
      </main>
    </div>
  )
}