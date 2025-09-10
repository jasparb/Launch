import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { formatNumber, formatCurrency } from '../lib/utils'

interface BondingCurveInfoProps {
  campaign: any
}

export default function BondingCurveInfo({ campaign }: BondingCurveInfoProps) {
  const smartContract = useSmartContractIntegration()
  
  if (!campaign) return null

  const distributedTokens = campaign.realTokenReserves || 0
  const curveState = smartContract.getBondingCurveState(
    campaign.raisedAmount || 0, 
    distributedTokens, 
    campaign.tokenTotalSupply || 1_000_000_000
  )

  const progressPercent = Math.min(curveState.priceProgress, 100)
  const isNearGraduation = progressPercent > 80

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Bonding Curve Progress</h3>
        <div className="text-right">
          <div className="text-sm text-gray-400">Progress to DEX</div>
          <div className={`text-lg font-bold ${isNearGraduation ? 'text-yellow-400' : 'text-purple-400'}`}>
            {progressPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              isNearGraduation 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>${formatNumber(curveState.marketCap)}</span>
          <span>${formatNumber(curveState.graduationThreshold)}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Current Price</div>
          <div className="text-sm font-semibold text-white">
            ${curveState.currentPrice.toFixed(8)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Market Cap</div>
          <div className="text-sm font-semibold text-white">
            ${formatNumber(curveState.marketCap)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Circulating</div>
          <div className="text-sm font-semibold text-white">
            {formatNumber(curveState.circulatingSupply)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Liquidity Depth</div>
          <div className="text-sm font-semibold text-white">
            {curveState.liquidityDepth.toFixed(2)} SOL
          </div>
        </div>
      </div>

      {/* Graduation Status */}
      <div className={`p-3 rounded-lg border text-center ${
        isNearGraduation 
          ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
          : progressPercent > 50
            ? 'bg-purple-900/20 border-purple-500/30 text-purple-300'
            : 'bg-blue-900/20 border-blue-500/30 text-blue-300'
      }`}>
        {progressPercent >= 100 ? (
          <div>
            <div className="text-sm font-semibold">🎉 Ready for DEX Graduation!</div>
            <div className="text-xs mt-1">This token can now graduate to Raydium DEX pools</div>
          </div>
        ) : isNearGraduation ? (
          <div>
            <div className="text-sm font-semibold">⚡ Near Graduation</div>
            <div className="text-xs mt-1">
              ${formatNumber(curveState.graduationThreshold - curveState.marketCap)} remaining
            </div>
          </div>
        ) : progressPercent > 50 ? (
          <div>
            <div className="text-sm font-semibold">🚀 Building Momentum</div>
            <div className="text-xs mt-1">Strong price discovery underway</div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-semibold">🌱 Early Discovery</div>
            <div className="text-xs mt-1">Price discovery phase - great entry opportunity</div>
          </div>
        )}
      </div>

      {/* How it Works */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors">
            How does the bonding curve work? ▼
          </summary>
          <div className="mt-2 text-xs text-gray-300 space-y-2">
            <p>• Tokens are priced using a constant product market maker formula</p>
            <p>• Price increases automatically as more SOL is contributed</p>
            <p>• Virtual liquidity ensures price discovery from day one</p>
            <p>• At ${formatNumber(curveState.graduationThreshold)} market cap, tokens graduate to DEX pools</p>
            <p>• Early supporters benefit from lower prices and higher potential returns</p>
          </div>
        </details>
      </div>
    </div>
  )
}