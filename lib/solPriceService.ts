// Simple SOL price service for USD conversion
let cachedSolPrice = 150 // Default fallback price
let lastFetch = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getSolPriceInUSD(): Promise<number> {
  const now = Date.now()
  
  // Return cached price if it's still fresh
  if (now - lastFetch < CACHE_DURATION) {
    return cachedSolPrice
  }
  
  try {
    // Try to fetch from CoinGecko API
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
    const data = await response.json()
    
    if (data.solana && data.solana.usd) {
      cachedSolPrice = data.solana.usd
      lastFetch = now
      console.log(`Updated SOL price: $${cachedSolPrice}`)
    }
  } catch (error) {
    console.warn('Failed to fetch SOL price, using cached value:', error)
  }
  
  return cachedSolPrice
}

// Initialize price on module load
if (typeof window !== 'undefined') {
  getSolPriceInUSD().catch(() => {
    // Ignore errors on initial load
  })
}