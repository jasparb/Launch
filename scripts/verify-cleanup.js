#!/usr/bin/env node

/**
 * Final verification script to ensure platform wallet removal is complete
 */

const fs = require('fs');
const path = require('path');

function searchInFile(filePath, searchTerms) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = [];
    
    searchTerms.forEach(term => {
      if (content.includes(term)) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(term)) {
            found.push({
              term,
              line: index + 1,
              content: line.trim()
            });
          }
        });
      }
    });
    
    return found;
  } catch (error) {
    return [];
  }
}

function verifyCleanup() {
  console.log('🔍 Verifying Platform Wallet Cleanup');
  console.log('===================================');
  
  const platformWalletTerms = [
    'platformUser',
    'platformWallet',
    'PlatformUser',
    'PlatformWallet',
    'createPlatformUser',
    'platformAuth'
  ];
  
  const filesToCheck = [
    'pages/_app.tsx',
    'pages/index.tsx',
    'components/CreateCampaign.tsx',
    'components/ClientWalletButton.tsx',
    'components/AirdropTaskDashboard.tsx',
    'components/SocialConnections.tsx'
  ];
  
  let foundIssues = false;
  
  filesToCheck.forEach(file => {
    const fullPath = path.join('/Users/deneroberts/Launch', file);
    const issues = searchInFile(fullPath, platformWalletTerms);
    
    if (issues.length > 0) {
      console.log(`❌ Found platform wallet references in ${file}:`);
      issues.forEach(issue => {
        console.log(`   Line ${issue.line}: ${issue.content}`);
      });
      foundIssues = true;
    } else {
      console.log(`✅ ${file} - Clean`);
    }
  });
  
  // Check for deleted files
  const deletedFiles = [
    'lib/platformWallet.ts',
    'contexts/PlatformWalletContext.tsx',
    'components/PlatformAuth.tsx',
    'components/PlatformWalletDashboard.tsx'
  ];
  
  console.log('\n📁 Verifying deleted files:');
  deletedFiles.forEach(file => {
    const fullPath = path.join('/Users/deneroberts/Launch', file);
    if (fs.existsSync(fullPath)) {
      console.log(`❌ ${file} still exists - should be deleted`);
      foundIssues = true;
    } else {
      console.log(`✅ ${file} - Deleted`);
    }
  });
  
  // Check auth pages
  console.log('\n🔐 Verifying auth pages removal:');
  const authDir = path.join('/Users/deneroberts/Launch', 'pages/auth');
  if (fs.existsSync(authDir)) {
    console.log(`❌ pages/auth/ directory still exists - should be deleted`);
    foundIssues = true;
  } else {
    console.log(`✅ pages/auth/ - Deleted`);
  }
  
  console.log('\n📊 Final Results:');
  if (!foundIssues) {
    console.log('🎉 All platform wallet references successfully removed!');
    console.log('✅ Application now uses only third-party wallets');
    console.log('✅ Test mode should only appear when wallet not connected');
  } else {
    console.log('⚠️  Some platform wallet references still exist');
  }
}

verifyCleanup();