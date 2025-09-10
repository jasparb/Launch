import { useWallet } from '@solana/wallet-adapter-react'

interface SocialConnectionsProps {
  requiredPlatforms?: string[]
  onConnectionUpdate?: (connections: any[]) => void
}

export default function SocialConnections({ requiredPlatforms = [], onConnectionUpdate }: SocialConnectionsProps) {
  const { publicKey } = useWallet()

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">🔗 Social Connections</h3>
      
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-400 mt-1">ℹ️</div>
          <div>
            <h4 className="text-blue-300 font-medium mb-2">External Wallet Integration</h4>
            <p className="text-blue-300/80 text-sm">
              Social verification has been updated to work with external wallets. 
              Connect your wallet to verify social platform connections.
            </p>
          </div>
        </div>
      </div>

      {!publicKey ? (
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-300 text-sm mb-3">Connect your wallet to verify social accounts</p>
          <p className="text-gray-400 text-xs">
            Use the "Connect Wallet" button to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-green-300 text-sm font-medium">Wallet Connected</p>
            </div>
            <p className="text-green-300/80 text-xs">
              Address: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
            </p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-300 text-sm mb-2">Social verification coming soon:</p>
            <div className="space-y-2 text-xs text-gray-400">
              <div>• Twitter verification with wallet signature</div>
              <div>• Discord verification with wallet signature</div>
              <div>• Direct token distribution to connected wallet</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}