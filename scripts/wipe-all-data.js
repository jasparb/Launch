#!/usr/bin/env node

// Complete data wipe script - clears all mock/test data
console.log('🧹 Starting complete data wipe...')

// For server-side cleanup, we can create a localStorage clearing function
const cleanupItems = [
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

console.log('📋 Items to clear from localStorage:')
cleanupItems.forEach(item => {
  console.log(`  - ${item}`)
})

console.log(`
🔧 To clear localStorage data, run this in your browser console:

// Clear specific campaign data
${cleanupItems.map(item => `localStorage.removeItem('${item}')`).join(';\n')}

// Or clear all localStorage
localStorage.clear()

// Refresh the page
window.location.reload()
`)

console.log('✅ Data wipe script prepared.')
console.log('💡 Run this script manually in browser console to clear localStorage.')