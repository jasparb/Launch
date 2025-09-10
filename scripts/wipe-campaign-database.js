// Script to wipe all local campaign data before creating first real campaign
// This cleans up any mock/test campaigns from development

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function wipeCampaignDatabase() {
  console.log('🧹 Wiping Campaign Database')
  console.log('=' .repeat(60))
  
  console.log('📋 What will be cleared:')
  console.log('  • Browser localStorage "user_campaigns"')
  console.log('  • Any cached campaign data')
  console.log('  • Mock/test campaign references')
  console.log('  • Development artifacts')
  console.log()
  
  console.log('⚠️  This will NOT affect:')
  console.log('  • Real on-chain campaigns')
  console.log('  • Deployed smart contract')
  console.log('  • Wallet balances')
  console.log('  • Blockchain transactions')
  console.log()
  
  console.log('🎯 Steps to complete cleanup:')
  console.log('=' .repeat(60))
  console.log()
  
  console.log('1️⃣  BACKEND CLEANUP (Automatic)')
  console.log('   • Clear any server-side cache')
  console.log('   • Reset campaign counters')
  console.log('   ✅ No backend cleanup needed (client-side only)')
  console.log()
  
  console.log('2️⃣  BROWSER CLEANUP (Manual - Follow instructions)')
  console.log('   Open your browser and follow these steps:')
  console.log()
  console.log('   A) Open Launch.fund: http://localhost:3001')
  console.log('   B) Open Developer Tools (F12 or Cmd+Option+I)')
  console.log('   C) Go to "Console" tab')
  console.log('   D) Copy and paste this command:')
  console.log()
  console.log('   ' + '═'.repeat(55))
  console.log('   localStorage.removeItem("user_campaigns")')
  console.log('   localStorage.removeItem("platform_users")')
  console.log('   localStorage.removeItem("platform_wallets")')
  console.log('   localStorage.clear()')
  console.log('   console.log("✅ Campaign database wiped!")')
  console.log('   location.reload()')
  console.log('   ' + '═'.repeat(55))
  console.log()
  console.log('   E) Press Enter to execute')
  console.log('   F) Page will reload with clean database')
  console.log()
  
  console.log('3️⃣  ALTERNATIVE: Reset via URL')
  console.log('   • Go to: http://localhost:3001?clearStorage=true')
  console.log('   • This will auto-clear and reload')
  console.log()
  
  console.log('4️⃣  VERIFICATION')
  console.log('   After cleanup, you should see:')
  console.log('   • Empty campaign list (no mock campaigns)')
  console.log('   • "No campaigns found" message')
  console.log('   • Clean slate for first real campaign')
  console.log()
  
  console.log('=' .repeat(60))
  console.log('🎉 Ready for cleanup!')
  console.log('   Follow the browser steps above to wipe the database')
  console.log('   Then create your first real blockchain campaign!')
  console.log('=' .repeat(60))
}

// Also create a cleanup component for browser-side cleanup
function createCleanupComponent() {
  const cleanupPageContent = `
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CleanupPage() {
  const router = useRouter()
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear all campaign-related localStorage
      localStorage.removeItem('user_campaigns')
      localStorage.removeItem('platform_users')  
      localStorage.removeItem('platform_wallets')
      
      console.log('✅ Campaign database wiped!')
      
      // Redirect to home after cleanup
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h1 className="text-xl text-white mb-2">🧹 Cleaning Database...</h1>
        <p className="text-gray-400">Removing all local campaign data</p>
      </div>
    </div>
  )
}
  `
  
  const cleanupDir = path.join(__dirname, '..', 'pages')
  const cleanupFile = path.join(cleanupDir, 'cleanup.tsx')
  
  if (!fs.existsSync(cleanupFile)) {
    fs.writeFileSync(cleanupFile, cleanupPageContent.trim())
    console.log('📄 Created cleanup page: /cleanup')
  }
}

// Run the cleanup guide
wipeCampaignDatabase()
createCleanupComponent()