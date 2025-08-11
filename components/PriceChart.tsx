import { useEffect, useState } from 'react'

interface PriceChartProps {
  campaign: any
}

export default function PriceChart({ campaign }: PriceChartProps) {
  const [priceData, setPriceData] = useState<number[]>([])
  
  useEffect(() => {
    // Generate mock price data for visualization
    const data = []
    let price = 0.00003
    for (let i = 0; i < 50; i++) {
      price = price * (1 + (Math.random() - 0.3) * 0.1)
      data.push(price)
    }
    setPriceData(data)
  }, [])

  const maxPrice = Math.max(...priceData)
  const minPrice = Math.min(...priceData)
  const range = maxPrice - minPrice

  return (
    <div className="h-64 relative">
      <div className="absolute inset-0 flex items-end">
        {priceData.map((price, index) => {
          const height = ((price - minPrice) / range) * 100
          return (
            <div
              key={index}
              className="flex-1 mx-0.5"
              style={{ height: `${height}%` }}
            >
              <div 
                className="w-full h-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          )
        })}
      </div>
      
      <div className="absolute top-0 right-0 bg-black/50 rounded px-2 py-1">
        <p className="text-xs text-gray-400">Current Price</p>
        <p className="text-sm font-semibold text-green-400">${campaign.tokenPrice}</p>
      </div>
      
      <div className="absolute bottom-0 left-0 text-xs text-gray-400">
        24h ago
      </div>
      
      <div className="absolute bottom-0 right-0 text-xs text-gray-400">
        Now
      </div>
    </div>
  )
}