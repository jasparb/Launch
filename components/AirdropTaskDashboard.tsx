import { useWallet } from '@solana/wallet-adapter-react'

interface AirdropTaskDashboardProps {
  campaign: any
  userAddress?: string
}

export default function AirdropTaskDashboard({ campaign, userAddress }: AirdropTaskDashboardProps) {
  const { publicKey } = useWallet()

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">🎁 Airdrop Tasks</h3>
      
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-400 mt-1">ℹ️</div>
          <div>
            <h4 className="text-blue-300 font-medium mb-2">External Wallet Integration</h4>
            <p className="text-blue-300/80 text-sm">
              The airdrop task system has been updated to work exclusively with external wallets 
              (Phantom, Solflare, etc.). This ensures better security and user control.
            </p>
          </div>
        </div>
      </div>

      {!publicKey ? (
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-300 text-sm mb-3">Connect your wallet to participate in airdrops</p>
          <p className="text-gray-400 text-xs">
            Use the "Connect Wallet" button to get started
          </p>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <p className="text-green-300 text-sm font-medium">Wallet Connected</p>
          </div>
          <p className="text-green-300/80 text-xs">
            Address: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Airdrop tasks coming soon with external wallet integration
          </p>
        </div>
      )}
    </div>
  )
}