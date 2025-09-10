import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { useCreatorFundingPools } from '../lib/creatorFundingPools'
import { formatNumber } from '../lib/utils'
import { formatPriceImpact, formatSlippage, getPriceImpactColor, getSlippageColor } from '../lib/bondingCurve'

interface TradingPanelProps {
  campaign: any
}

export default function TradingPanel({ campaign }: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [userBalance, setUserBalance] = useState(0)
  const [solBalance, setSolBalance] = useState(0)
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed'>('idle')
  const [lastTransactionSignature, setLastTransactionSignature] = useState<string>('')
  
  const smartContract = useSmartContractIntegration()
  const fundingPoolManager = useCreatorFundingPools()

  const calculateTradeOutput = (inputAmount: number, isBuy: boolean) => {
    if (!inputAmount || !campaign) return null
    
    const distributedTokens = campaign.realTokenReserves || 0
    
    if (isBuy) {
      return smartContract.calculateTokensFromSol(inputAmount, campaign.raisedAmount || 0, distributedTokens)
    } else {
      return smartContract.calculateSolFromTokens(inputAmount, campaign.raisedAmount || 0, distributedTokens)
    }
  }

  // Load user balances
  useEffect(() => {
    const loadBalances = async () => {
      if (!publicKey) {
        setUserBalance(0)
        setSolBalance(0)
        return
      }

      try {
        // Get SOL balance using smart contract integration
        const solBal = await smartContract.getBalance(publicKey)
        setSolBalance(solBal)

        // Get token balance for this specific campaign
        if (campaign?.publicKey) {
          const tokenBal = await smartContract.getUserTokenBalance(campaign.publicKey, publicKey)
          setUserBalance(tokenBal)
        }
      } catch (error) {
        console.error('Error loading balances:', error)
      }
    }

    loadBalances()
  }, [publicKey, connection])

  const handleBuy = async () => {
    if (!publicKey || !amount || !campaign?.publicKey) return
    
    setLoading(true)
    setTransactionStatus('pending')
    
    try {
      const solAmount = parseFloat(amount)
      
      // Check sufficient balance with some buffer for transaction fees
      if (solAmount > (solBalance - 0.01)) {
        console.error('Insufficient SOL balance (need extra for transaction fees)')
        setTransactionStatus('failed')
        setLoading(false)
        return
      }

      console.log(`Initiating purchase of ${solAmount} SOL worth of tokens...`)
      setTransactionStatus('confirming')
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout after 30 seconds')), 30000)
      )
      
      const result = await Promise.race([
        smartContract.buyTokens(campaign.publicKey, solAmount),
        timeoutPromise
      ]) as any
      
      if (result.success && result.signature) {
        setLastTransactionSignature(result.signature)
        setTransactionStatus('confirmed')
        
        console.log('Transaction successful:', result.signature)
        const impact = result.priceImpact ? formatPriceImpact(result.priceImpact) : 'N/A'
        const fee = result.platformFee ? `${result.platformFee.toFixed(6)} SOL` : 'N/A'
        console.log(`✅ Successfully bought ${result.tokensAmount?.toLocaleString()} tokens for ${solAmount} SOL!`)
        console.log(`Price Impact: ${impact}, Platform Fee: ${fee}`)

        // Process funding pool contribution if enabled
        if (campaign.enableFundingPool && result.tokensAmount) {
          console.log('💰 Processing funding pool contribution...')
          
          // Find funding pool for this campaign
          const fundingPools = fundingPoolManager.getPoolsForCampaign(campaign.publicKey)
          if (fundingPools.length > 0) {
            const pool = fundingPools[0] // Get first pool
            
            // Process the contribution
            const contributionResult = await fundingPoolManager.processContribution(
              pool.id,
              publicKey.toString(),
              solAmount,
              pool.config.currency, // SOL or USDC
              result.tokensAmount,
              result.signature
            )
            
            if (contributionResult.success) {
              console.log('✅ Funding pool contribution processed successfully')
            } else {
              console.warn('⚠️ Failed to process funding pool contribution:', contributionResult.error)
            }
          }
        }

        setAmount('')
        
        // Refresh balances after successful transaction
        setTimeout(async () => {
          const newSolBal = await smartContract.getBalance(publicKey)
          setSolBalance(newSolBal)
          
          // Get updated token balance
          const newTokenBal = await smartContract.getUserTokenBalance(campaign.publicKey, publicKey)
          setUserBalance(newTokenBal)
          
          setTransactionStatus('idle')
        }, 2000)
        
      } else {
        setTransactionStatus('failed')
        console.error(`❌ Failed to buy tokens:`, {
          error: result.error,
          result: result,
          campaignId: campaign.publicKey,
          solAmount: solAmount,
          userBalance: solBalance
        })
      }
    } catch (error: any) {
      console.error('Error buying tokens:', {
        error: error,
        message: error.message,
        stack: error.stack,
        campaignId: campaign.publicKey,
        solAmount: amount,
        userBalance: solBalance,
        errorType: typeof error,
        errorName: error.name
      })
      setTransactionStatus('failed')
      console.error(`❌ Transaction failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSell = async () => {
    if (!publicKey || !amount || !campaign?.publicKey) return
    
    setLoading(true)
    setTransactionStatus('pending')
    
    try {
      const tokenAmount = parseFloat(amount)
      
      // Check sufficient balance
      if (tokenAmount > userBalance) {
        console.error('Insufficient token balance')
        setTransactionStatus('failed')
        setLoading(false)
        return
      }

      console.log(`Initiating sale of ${tokenAmount} ${campaign.tokenSymbol}...`)
      setTransactionStatus('confirming')
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout after 30 seconds')), 30000)
      )
      
      const result = await Promise.race([
        smartContract.sellTokens(campaign.publicKey, tokenAmount),
        timeoutPromise
      ]) as any
      
      if (result.success && result.signature) {
        setLastTransactionSignature(result.signature)
        setTransactionStatus('confirmed')
        
        console.log('Transaction successful:', result.signature)
        console.log(`✅ Successfully sold ${tokenAmount.toLocaleString()} ${campaign.tokenSymbol} for ${result.solAmount} SOL!`)
        setAmount('')
        
        // Refresh balances after successful transaction
        setTimeout(async () => {
          const newSolBal = await smartContract.getBalance(publicKey)
          setSolBalance(newSolBal)
          
          // Get updated token balance
          const newTokenBal = await smartContract.getUserTokenBalance(campaign.publicKey, publicKey)
          setUserBalance(newTokenBal)
          
          setTransactionStatus('idle')
        }, 2000)
      } else {
        setTransactionStatus('failed')
        console.error(`❌ Failed to sell tokens: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Error selling tokens:', error)
      setTransactionStatus('failed')
      console.error(`❌ Transaction failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const tradeCalc = amount ? calculateTradeOutput(parseFloat(amount), activeTab === 'buy') : null
  const estimatedOutput = tradeCalc ? tradeCalc.outputAmount.toFixed(activeTab === 'buy' ? 2 : 6) : '0'

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 sticky top-4" style={{ zIndex: 1 }}>
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
            <span className={tradeCalc ? getPriceImpactColor(tradeCalc.priceImpact) : "text-white"}>
              {tradeCalc ? formatPriceImpact(tradeCalc.priceImpact) : '~0.5%'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Platform Fee</span>
            <span className="text-white">
              {tradeCalc ? `${tradeCalc.platformFee.toFixed(6)} SOL` : '0.99%'}
            </span>
          </div>
          {tradeCalc && (
            <div className="flex justify-between">
              <span className="text-gray-400">Slippage</span>
              <span className={getSlippageColor(tradeCalc.slippage)}>
                {formatSlippage(tradeCalc.slippage)}
              </span>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {transactionStatus !== 'idle' && (
          <div className={`p-3 rounded-lg border ${
            transactionStatus === 'confirmed' ? 'bg-green-900/30 border-green-500/30' :
            transactionStatus === 'failed' ? 'bg-red-900/30 border-red-500/30' :
            'bg-yellow-900/30 border-yellow-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {transactionStatus === 'pending' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                  <span className="text-yellow-400 text-sm">Initiating transaction...</span>
                </>
              )}
              {transactionStatus === 'confirming' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span className="text-blue-400 text-sm">Confirming on blockchain...</span>
                </>
              )}
              {transactionStatus === 'confirmed' && (
                <>
                  <span className="text-green-400">✅</span>
                  <span className="text-green-400 text-sm">Transaction confirmed!</span>
                </>
              )}
              {transactionStatus === 'failed' && (
                <>
                  <span className="text-red-400">❌</span>
                  <span className="text-red-400 text-sm">Transaction failed</span>
                </>
              )}
            </div>
            {lastTransactionSignature && transactionStatus === 'confirmed' && (
              <div className="mt-2">
                <a
                  href={`https://explorer.solana.com/tx/${lastTransactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs underline"
                >
                  View on Solana Explorer
                </a>
              </div>
            )}
          </div>
        )}

        {publicKey ? (
          <button
            onClick={activeTab === 'buy' ? handleBuy : handleSell}
            disabled={loading || !amount || transactionStatus === 'pending' || transactionStatus === 'confirming'}
            className={`w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 ${
              activeTab === 'buy'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {loading ? 'Processing...' : 
             transactionStatus === 'pending' ? 'Preparing...' :
             transactionStatus === 'confirming' ? 'Confirming...' :
             `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${campaign.tokenSymbol}`}
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
              <span className="text-gray-400">SOL Balance</span>
              <span className="text-white">{solBalance.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{campaign.tokenSymbol} Balance</span>
              <span className="text-white">{userBalance.toLocaleString()} {campaign.tokenSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Value</span>
              <span className="text-white">${(userBalance * campaign.tokenPrice).toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Connect wallet to view</p>
        )}
      </div>
    </div>
  )
}