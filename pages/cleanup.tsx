import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function CleanupPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Starting cleanup...')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStatus('Clearing campaign database...')
      
      // Clear all campaign-related localStorage
      localStorage.removeItem('user_campaigns')
      // Clear app settings
      localStorage.removeItem('launch_fund_settings')
      
      // Clear any other app-specific storage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('campaign_') || key.startsWith('launch_') || key.startsWith('user_'))) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      console.log('✅ Campaign database wiped!')
      setStatus('Database cleaned successfully!')
      
      // Redirect to home after cleanup
      setTimeout(() => {
        setStatus('Redirecting to clean homepage...')
        router.push('/')
      }, 2000)
    }
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
        
        <h1 className="text-2xl text-white mb-4">🧹 Cleaning Database</h1>
        <p className="text-gray-400 mb-6">{status}</p>
        
        <div className="bg-gray-800 rounded-lg p-4 text-left">
          <h3 className="text-sm text-green-400 mb-2">✅ Cleaned:</h3>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Local campaign storage</li>
            <li>• User account data</li>
            <li>• Platform wallet cache</li>
            <li>• App settings</li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          Your blockchain wallet and on-chain data remain untouched
        </p>
      </div>
    </div>
  )
}