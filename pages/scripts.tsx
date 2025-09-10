import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import ProjectScriptAccess from '../components/ProjectScriptAccess'
import ClientWalletButton from '../components/ClientWalletButton'
import { projectScriptAccess } from '../lib/projectScriptAccess'
import {
  CodeBracketIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CubeTransparentIcon
} from '@heroicons/react/24/outline'

export default function ScriptsPage() {
  const { publicKey } = useWallet()
  const [stats] = useState(() => projectScriptAccess.getStats())

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <CodeBracketIcon className="w-8 h-8 text-purple-400" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Project Scripts
                  </h1>
                  <p className="text-gray-300 text-sm">
                    Access development tools and automation scripts
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Stats */}
              <div className="hidden md:flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-white font-semibold">{stats.totalScripts}</div>
                  <div className="text-gray-400">Scripts</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-semibold">{stats.totalDownloads}</div>
                  <div className="text-gray-400">Downloads</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400 font-semibold">{stats.totalUsers}</div>
                  <div className="text-gray-400">Users</div>
                </div>
              </div>
              
              <ClientWalletButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Development Tools & Scripts
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Complete tasks to unlock premium development tools, automation scripts, and 
            enterprise-grade blockchain utilities for your projects.
          </p>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-blue-400/30 p-6">
              <RocketLaunchIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Quick Setup</h3>
              <p className="text-gray-300 text-sm">
                Automated environment setup scripts for instant development readiness
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
              <CubeTransparentIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Advanced Tools</h3>
              <p className="text-gray-300 text-sm">
                Professional-grade development utilities and testing frameworks
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-6">
              <ShieldCheckIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Enterprise Suite</h3>
              <p className="text-gray-300 text-sm">
                Complete production deployment and security audit tools
              </p>
            </div>
          </div>
        </div>

        {/* Access Levels Info */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Script Access Levels</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-400/30">
                🆓 Free
              </span>
              <div>
                <p className="text-white font-medium">Open Access</p>
                <p className="text-gray-300 text-sm">No tasks required</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-400/30">
                ✅ Verified
              </span>
              <div>
                <p className="text-white font-medium">Task Completion</p>
                <p className="text-gray-300 text-sm">Complete verification tasks</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-purple-500/20 text-purple-300 border-purple-400/30">
                ⭐ Premium
              </span>
              <div>
                <p className="text-white font-medium">Enterprise</p>
                <p className="text-gray-300 text-sm">Advanced task completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-400 font-bold">1</span>
              </div>
              <p className="text-white font-medium mb-1">Connect Wallet</p>
              <p className="text-gray-400 text-sm">Link your Solana wallet to get started</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <p className="text-white font-medium mb-1">Complete Tasks</p>
              <p className="text-gray-400 text-sm">Finish verification tasks to unlock scripts</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-400 font-bold">3</span>
              </div>
              <p className="text-white font-medium mb-1">Get Verified</p>
              <p className="text-gray-400 text-sm">Automatic verification upon task completion</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-pink-400 font-bold">4</span>
              </div>
              <p className="text-white font-medium mb-1">Download Scripts</p>
              <p className="text-gray-400 text-sm">Access and download verified scripts</p>
            </div>
          </div>
        </div>

        {/* Scripts Component */}
        <ProjectScriptAccess />

        {/* Getting Started */}
        {!publicKey && (
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-xl p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h3>
              <p className="text-gray-300 mb-6">
                Connect your Solana wallet to begin accessing development scripts and completing verification tasks.
              </p>
              <ClientWalletButton />
              <p className="text-gray-400 text-sm mt-4">
                Free tier scripts are immediately available after wallet connection
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}