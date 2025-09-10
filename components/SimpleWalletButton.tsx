import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

export default function SimpleWalletButton() {
  const { publicKey, disconnect, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleConnect = () => {
    setVisible(true)
  }

  const handleDisconnect = async () => {
    await disconnect()
    setShowDropdown(false)
  }

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString())
      alert('Address copied to clipboard!')
      setShowDropdown(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  if (!connected) {
    return (
      <button
        onClick={handleConnect}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
      >
        <span>{formatAddress(publicKey!.toString())}</span>
        <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-purple-500/30 z-50">
          <button
            onClick={copyAddress}
            className="w-full text-left px-4 py-3 text-white hover:bg-purple-600/20 transition-all border-b border-gray-700"
          >
            📋 Copy Address
          </button>
          <button
            onClick={handleConnect}
            className="w-full text-left px-4 py-3 text-white hover:bg-purple-600/20 transition-all border-b border-gray-700"
          >
            🔄 Change Wallet
          </button>
          <button
            onClick={handleDisconnect}
            className="w-full text-left px-4 py-3 text-white hover:bg-red-600/20 transition-all rounded-b-lg"
          >
            🚪 Disconnect
          </button>
        </div>
      )}
    </div>
  )
}