import { useState } from 'react'

export default function DataCleaner() {
  const [cleared, setCleared] = useState(false)

  const clearAllData = () => {
    const itemsToClear = [
      'user_campaigns',
      'campaign_votes_',
      'campaign_donors_',
      'minted_nfts_',
      'task_submissions',
      'user_portfolio',
      'airdrop_tasks',
      'roadmap_progress',
      'social_connections',
      'platform_stats'
    ]

    // Clear specific items
    itemsToClear.forEach(item => {
      if (item.endsWith('_')) {
        // Clear items with prefix pattern
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(item)) {
            localStorage.removeItem(key)
          }
        })
      } else {
        localStorage.removeItem(item)
      }
    })

    console.log('🧹 Cleared all mock/test data from localStorage')
    setCleared(true)
    
    // Refresh after 1 second
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 m-4">
      <h3 className="text-red-400 font-bold mb-2">🧹 Data Cleaner</h3>
      <p className="text-sm text-gray-300 mb-4">
        Remove all mock/test data from localStorage to start fresh
      </p>
      
      {!cleared ? (
        <button
          onClick={clearAllData}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          Clear All Data
        </button>
      ) : (
        <div className="text-green-400 font-semibold">
          ✅ Data cleared! Refreshing page...
        </div>
      )}
    </div>
  )
}