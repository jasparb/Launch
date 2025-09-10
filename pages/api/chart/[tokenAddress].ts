import { NextApiRequest, NextApiResponse } from 'next'
import { Connection, clusterApiUrl } from '@solana/web3.js'
import { getPriceIndexer } from '../../../lib/priceIndexer'

// Initialize connection and price indexer
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed')
const priceIndexer = getPriceIndexer(connection)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tokenAddress, interval = '1h', from, to } = req.query

  if (!tokenAddress || typeof tokenAddress !== 'string') {
    return res.status(400).json({ error: 'Token address is required' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetChartData(req, res, tokenAddress)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Chart API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetChartData(req: NextApiRequest, res: NextApiResponse, tokenAddress: string) {
  const { interval = '1h', from, to } = req.query

  try {
    // Generate candlestick data
    const candlestickData = priceIndexer.generateCandlestickData(
      tokenAddress,
      interval as '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
    )

    // Filter by time range if provided
    let filteredData = candlestickData
    if (from || to) {
      const fromTime = from ? parseInt(from as string) : 0
      const toTime = to ? parseInt(to as string) : Date.now()
      
      filteredData = candlestickData.filter(candle => 
        candle.time >= fromTime && candle.time <= toTime
      )
    }

    // If no real data, generate mock data for testing
    if (filteredData.length === 0) {
      filteredData = generateMockCandlestickData(tokenAddress, interval as string)
    }

    // Get current metrics
    const metrics = priceIndexer.getCurrentMetrics(tokenAddress) || generateMockMetrics()

    return res.status(200).json({
      success: true,
      data: {
        candlesticks: filteredData,
        metrics,
        interval,
        tokenAddress
      }
    })

  } catch (error) {
    console.error('Error getting chart data:', error)
    return res.status(500).json({ error: 'Failed to get chart data' })
  }
}

// Generate mock candlestick data for testing
function generateMockCandlestickData(tokenAddress: string, interval: string) {
  const now = Date.now()
  const intervalMs = getIntervalMs(interval)
  const numCandles = 100
  
  const candlesticks = []
  let currentPrice = 0.0001 // Starting price
  
  for (let i = numCandles; i >= 0; i--) {
    const time = now - (i * intervalMs)
    
    // Generate realistic price movement
    const volatility = 0.02 // 2% volatility
    const trend = Math.random() > 0.5 ? 1 : -1
    const change = (Math.random() * volatility * trend)
    
    const open = currentPrice
    const close = Math.max(0.00001, currentPrice * (1 + change))
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    const volume = Math.random() * 1000 + 100
    
    candlesticks.push({
      time,
      open,
      high,
      low,
      close,
      volume
    })
    
    currentPrice = close
  }
  
  return candlesticks
}

// Generate mock metrics for testing
function generateMockMetrics() {
  const currentPrice = 0.0001 + (Math.random() * 0.0002)
  
  return {
    currentPrice,
    change24h: (Math.random() - 0.5) * 20, // Random between -10% and +10%
    volume24h: Math.random() * 50000 + 10000,
    marketCap: currentPrice * 1000000000, // 1B token supply
    holders: Math.floor(Math.random() * 500) + 50,
    totalSupply: 1000000000
  }
}

// Helper function to convert interval to milliseconds
function getIntervalMs(interval: string): number {
  const intervals: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }
  return intervals[interval] || intervals['1h']
}