import { useState, useEffect, useRef } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { getTransactionMonitor, TransactionEvent } from '../lib/transactionMonitor'
import { formatNumber, formatAddress, formatTime } from '../lib/utils'

interface LiveTransactionFeedProps {
  campaignAddress?: string
  maxTransactions?: number
  showGlobal?: boolean
}

export default function LiveTransactionFeed({ 
  campaignAddress, 
  maxTransactions = 10,
  showGlobal = false 
}: LiveTransactionFeedProps) {
  const { connection } = useConnection()
  const [transactions, setTransactions] = useState<TransactionEvent[]>([])
  const [isLive, setIsLive] = useState(false)
  const [newTransactionCount, setNewTransactionCount] = useState(0)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!connection || (!campaignAddress && !showGlobal)) return

    const monitor = getTransactionMonitor(connection)
    
    if (campaignAddress) {
      // Load existing transactions
      const existingTransactions = monitor.getTransactions(campaignAddress)
      setTransactions(existingTransactions.slice(0, maxTransactions))

      // Subscribe to new transactions
      setIsLive(true)
      const unsubscribe = monitor.subscribeToTransactions(campaignAddress, (newTransaction) => {
        setTransactions(prev => {
          const updated = [newTransaction, ...prev].slice(0, maxTransactions)
          setNewTransactionCount(count => count + 1)
          return updated
        })
      })

      unsubscribeRef.current = unsubscribe
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setIsLive(false)
    }
  }, [connection, campaignAddress, maxTransactions, showGlobal])

  const handleClearNotification = () => {
    setNewTransactionCount(0)
  }

  const getTransactionIcon = (type: TransactionEvent['type']) => {
    switch (type) {
      case 'contribution':
        return '💰'
      case 'withdrawal':
        return '📤'
      case 'campaign_created':
        return '🚀'
      default:
        return '📊'
    }
  }

  const getTransactionColor = (type: TransactionEvent['type']) => {
    switch (type) {
      case 'contribution':
        return 'text-green-400'
      case 'withdrawal':
        return 'text-orange-400'
      case 'campaign_created':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  const getTransactionDescription = (tx: TransactionEvent) => {
    switch (tx.type) {
      case 'contribution':
        return `bought ${formatNumber(tx.tokenAmount || 0)} tokens for ${formatNumber(tx.amount)} SOL`
      case 'withdrawal':
        return `withdrew ${formatNumber(tx.amount)} SOL`
      case 'campaign_created':
        return 'created campaign'
      default:
        return 'unknown transaction'
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">
            {campaignAddress ? 'Live Transactions' : 'Global Transaction Feed'}
          </h3>
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">LIVE</span>
            </div>
          )}
        </div>

        {newTransactionCount > 0 && (
          <button
            onClick={handleClearNotification}
            className="px-3 py-1 bg-green-500/20 border border-green-400/30 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
          >
            {newTransactionCount} new
          </button>
        )}
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400 text-sm">
              {isLive ? 'Waiting for transactions...' : 'No transactions yet'}
            </p>
          </div>
        ) : (
          transactions.map((tx, index) => (
            <div
              key={tx.signature}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                index === 0 && newTransactionCount > 0
                  ? 'bg-green-900/20 border-green-500/30 animate-pulse'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl flex-shrink-0">
                {getTransactionIcon(tx.type)}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">
                    {formatAddress(tx.user)}
                  </span>
                  <span className={`text-xs ${getTransactionColor(tx.type)}`}>
                    {getTransactionDescription(tx)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{formatTime(tx.blockTime)}</span>
                  {tx.price && (
                    <span>@ ${tx.price.toFixed(8)}</span>
                  )}
                  {tx.priceImpact && (
                    <span className={tx.priceImpact > 2 ? 'text-red-400' : 'text-yellow-400'}>
                      {tx.priceImpact.toFixed(2)}% impact
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-semibold ${getTransactionColor(tx.type)}`}>
                  {tx.type === 'contribution' ? '+' : tx.type === 'withdrawal' ? '-' : ''}
                  {formatNumber(tx.amount)} SOL
                </div>
                {tx.tokenAmount && (
                  <div className="text-xs text-gray-400">
                    {formatNumber(tx.tokenAmount)} tokens
                  </div>
                )}
              </div>

              {/* Transaction signature link */}
              <a
                href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                title="View on Solana Explorer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ))
        )}
      </div>

      {transactions.length >= maxTransactions && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400 text-center">
            Showing last {maxTransactions} transactions
          </div>
        </div>
      )}

      {!isLive && campaignAddress && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400 text-center">
            Real-time monitoring unavailable
          </div>
        </div>
      )}
    </div>
  )
}