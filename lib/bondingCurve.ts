// Advanced bonding curve implementation for Launch.fund
// Implements constant product market maker (CPMM) style curves with virtual liquidity

export interface BondingCurveConfig {
  virtualSolReserves: number   // Virtual SOL reserves for price discovery
  virtualTokenReserves: number // Virtual token reserves
  realSolReserves: number     // Actual SOL collected
  realTokenReserves: number   // Actual tokens distributed
  k: number                   // Constant product (virtualSol * virtualTokens)
  maxMarketCap: number        // Market cap threshold for DEX graduation
  platformFeePercent: number  // Platform fee percentage (0.99%)
}

export interface TradeCalculation {
  inputAmount: number
  outputAmount: number
  priceImpact: number
  newPrice: number
  newMarketCap: number
  platformFee: number
  slippage: number
  effectivePrice: number
  tokensOut: number // Add this for backward compatibility
}

export interface CurveState {
  currentPrice: number
  marketCap: number
  totalSupply: number
  circulatingSupply: number
  priceProgress: number    // Progress toward DEX graduation (0-100%)
  liquidityDepth: number   // How much SOL can be traded with <1% impact
  graduationThreshold: number
}

export class BondingCurve {
  private config: BondingCurveConfig
  
  constructor(config: Partial<BondingCurveConfig> = {}) {
    this.config = {
      virtualSolReserves: 30,           // 30 SOL virtual liquidity
      virtualTokenReserves: 1_073_000_000, // 1.073B tokens
      realSolReserves: 0,
      realTokenReserves: 0,
      k: 30 * 1_073_000_000,           // Constant product
      maxMarketCap: 69_000,            // $69k graduation threshold
      platformFeePercent: 0.99,        // 0.99% platform fee
      ...config
    }
  }

  // Get current curve state
  getCurveState(totalSupply: number = 1_000_000_000): CurveState {
    const currentPrice = this.getCurrentPrice()
    const marketCap = currentPrice * totalSupply
    const circulatingSupply = totalSupply - this.config.realTokenReserves
    const priceProgress = (marketCap / this.config.maxMarketCap) * 100
    
    return {
      currentPrice,
      marketCap,
      totalSupply,
      circulatingSupply,
      priceProgress: Math.min(priceProgress, 100),
      liquidityDepth: this.calculateLiquidityDepth(),
      graduationThreshold: this.config.maxMarketCap
    }
  }

  // Calculate current token price using constant product formula
  getCurrentPrice(): number {
    const totalSolReserves = this.config.virtualSolReserves + this.config.realSolReserves
    const totalTokenReserves = this.config.virtualTokenReserves - this.config.realTokenReserves
    
    if (totalTokenReserves <= 0) return 0
    
    // Price = SOL reserves / Token reserves
    return totalSolReserves / totalTokenReserves
  }

  // Calculate tokens received for SOL input (buying)
  calculateBuyTokens(solInput: number): TradeCalculation {
    const platformFee = solInput * (this.config.platformFeePercent / 100)
    const netSolInput = solInput - platformFee
    
    const currentSolReserves = this.config.virtualSolReserves + this.config.realSolReserves
    const currentTokenReserves = this.config.virtualTokenReserves - this.config.realTokenReserves
    
    // Using constant product formula: (x + Δx)(y - Δy) = k
    // Δy = y - (k / (x + Δx))
    const newSolReserves = currentSolReserves + netSolInput
    const newTokenReserves = this.config.k / newSolReserves
    const tokensOut = currentTokenReserves - newTokenReserves
    
    const oldPrice = this.getCurrentPrice()
    const newPrice = newSolReserves / newTokenReserves
    const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100
    const effectivePrice = netSolInput / tokensOut
    const slippage = ((effectivePrice - oldPrice) / oldPrice) * 100
    
    return {
      inputAmount: solInput,
      outputAmount: tokensOut,
      priceImpact: Math.abs(priceImpact),
      newPrice,
      newMarketCap: newPrice * (this.config.virtualTokenReserves + this.config.realTokenReserves),
      platformFee,
      slippage: Math.abs(slippage),
      effectivePrice,
      tokensOut: tokensOut // Add for backward compatibility
    }
  }

  // Calculate SOL received for token input (selling)
  calculateSellTokens(tokenInput: number): TradeCalculation {
    const currentSolReserves = this.config.virtualSolReserves + this.config.realSolReserves
    const currentTokenReserves = this.config.virtualTokenReserves - this.config.realTokenReserves
    
    // Using constant product formula: (x - Δx)(y + Δy) = k
    // Δx = x - (k / (y + Δy))
    const newTokenReserves = currentTokenReserves + tokenInput
    const newSolReserves = this.config.k / newTokenReserves
    const solOut = currentSolReserves - newSolReserves
    
    const platformFee = solOut * (this.config.platformFeePercent / 100)
    const netSolOut = solOut - platformFee
    
    const oldPrice = this.getCurrentPrice()
    const newPrice = newSolReserves / newTokenReserves
    const priceImpact = ((oldPrice - newPrice) / oldPrice) * 100
    const effectivePrice = netSolOut / tokenInput
    const slippage = ((oldPrice - effectivePrice) / oldPrice) * 100
    
    return {
      inputAmount: tokenInput,
      outputAmount: netSolOut,
      priceImpact: Math.abs(priceImpact),
      newPrice,
      newMarketCap: newPrice * (this.config.virtualTokenReserves + this.config.realTokenReserves),
      platformFee,
      slippage: Math.abs(slippage),
      effectivePrice,
      tokensOut: netSolOut // Add for backward compatibility (represents SOL out in sell case)
    }
  }

  // Calculate price for specific SOL amount (used for charts)
  getPriceAtSolAmount(solAmount: number): number {
    const totalSolReserves = this.config.virtualSolReserves + solAmount
    const totalTokenReserves = this.config.k / totalSolReserves
    return totalSolReserves / totalTokenReserves
  }

  // Calculate market cap progression
  getMarketCapAtSolAmount(solAmount: number, totalSupply: number = 1_000_000_000): number {
    const price = this.getPriceAtSolAmount(solAmount)
    return price * totalSupply
  }

  // Calculate how much SOL can be traded with specified price impact
  calculateLiquidityDepth(maxPriceImpact: number = 1.0): number {
    const currentPrice = this.getCurrentPrice()
    const targetPrice = currentPrice * (1 + maxPriceImpact / 100)
    
    const currentSolReserves = this.config.virtualSolReserves + this.config.realSolReserves
    const targetSolReserves = this.config.k / (this.config.k / currentSolReserves / (targetPrice / currentPrice))
    
    return Math.max(0, targetSolReserves - currentSolReserves)
  }

  // Update reserves after trade
  updateReserves(solChange: number, tokenChange: number): void {
    this.config.realSolReserves += solChange
    this.config.realTokenReserves += tokenChange
    
    // Ensure reserves don't go negative
    this.config.realSolReserves = Math.max(0, this.config.realSolReserves)
    this.config.realTokenReserves = Math.max(0, this.config.realTokenReserves)
  }

  // Check if campaign is ready for DEX graduation
  isReadyForGraduation(totalSupply: number = 1_000_000_000): boolean {
    const state = this.getCurveState(totalSupply)
    return state.marketCap >= this.config.maxMarketCap
  }

  // Get graduation liquidity allocation
  getGraduationLiquidity(): {
    solForLiquidity: number
    tokensForLiquidity: number
    remainingSol: number
    remainingTokens: number
  } {
    const totalSol = this.config.realSolReserves
    const totalTokens = this.config.virtualTokenReserves + this.config.realTokenReserves

    // Allocate 80% of SOL and 20% of total token supply for initial liquidity
    const solForLiquidity = totalSol * 0.8
    const tokensForLiquidity = totalTokens * 0.2
    
    return {
      solForLiquidity,
      tokensForLiquidity,
      remainingSol: totalSol - solForLiquidity,
      remainingTokens: totalTokens - tokensForLiquidity
    }
  }

  // Calculate estimated DEX pool price after graduation
  getEstimatedDEXPrice(): number {
    const liquidity = this.getGraduationLiquidity()
    
    if (liquidity.tokensForLiquidity === 0) return 0
    
    // Price = SOL liquidity / Token liquidity
    return liquidity.solForLiquidity / liquidity.tokensForLiquidity
  }

  // Generate price points for charting (0 to graduation)
  generatePriceChart(points: number = 100): Array<{ solAmount: number; price: number; marketCap: number }> {
    const maxSol = this.calculateSolForGraduation()
    const step = maxSol / points
    const chart = []
    
    for (let i = 0; i <= points; i++) {
      const solAmount = i * step
      const price = this.getPriceAtSolAmount(solAmount)
      const marketCap = this.getMarketCapAtSolAmount(solAmount)
      
      chart.push({
        solAmount,
        price,
        marketCap
      })
    }
    
    return chart
  }

  // Calculate SOL needed to reach graduation market cap
  private calculateSolForGraduation(): number {
    // Solve for SOL amount where market cap = graduation threshold
    // This requires solving: (virtualSol + x) / (k / (virtualSol + x)) * totalSupply = maxMarketCap
    const totalSupply = 1_000_000_000
    const target = this.config.maxMarketCap / totalSupply
    
    // Using quadratic formula to solve the equation
    const a = 1
    const b = this.config.virtualSolReserves - target
    const c = -this.config.k
    
    const discriminant = b * b - 4 * a * c
    if (discriminant < 0) return 0
    
    const solNeeded = (-b + Math.sqrt(discriminant)) / (2 * a) - this.config.virtualSolReserves
    return Math.max(0, solNeeded)
  }

  // Get configuration
  getConfig(): BondingCurveConfig {
    return { ...this.config }
  }

  // Update configuration
  updateConfig(newConfig: Partial<BondingCurveConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.config.k = this.config.virtualSolReserves * this.config.virtualTokenReserves
  }
}

// Helper functions for common calculations
export function formatPriceImpact(impact: number): string {
  if (impact < 0.01) return '<0.01%'
  if (impact > 10) return '>10%'
  return `${impact.toFixed(2)}%`
}

export function formatSlippage(slippage: number): string {
  if (slippage < 0.01) return '<0.01%'
  return `${slippage.toFixed(2)}%`
}

export function getSlippageColor(slippage: number): string {
  if (slippage < 0.5) return 'text-green-400'
  if (slippage < 2) return 'text-yellow-400'
  if (slippage < 5) return 'text-orange-400'
  return 'text-red-400'
}

export function getPriceImpactColor(impact: number): string {
  if (impact < 0.1) return 'text-green-400'
  if (impact < 0.5) return 'text-yellow-400'
  if (impact < 2) return 'text-orange-400'
  return 'text-red-400'
}

// Create bonding curve instance with campaign-specific parameters
export function createBondingCurve(raisedAmount: number, distributedTokens: number): BondingCurve {
  return new BondingCurve({
    realSolReserves: raisedAmount,
    realTokenReserves: distributedTokens
  })
}