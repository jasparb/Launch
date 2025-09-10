import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { projectScriptAccess, ProjectScript } from '../lib/projectScriptAccess'
import {
  DocumentArrowDownIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  StarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

export default function ProjectScriptAccess() {
  const { publicKey } = useWallet()
  const [scripts, setScripts] = useState<Array<ProjectScript & { accessStatus: 'granted' | 'available' | 'locked', missingTasks?: string[] }>>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [selectedScript, setSelectedScript] = useState<ProjectScript | null>(null)
  
  useEffect(() => {
    loadScripts()
  }, [publicKey])

  const loadScripts = async () => {
    setLoading(true)
    try {
      if (!publicKey) {
        // Show all scripts without access info
        const allScripts = projectScriptAccess.getAllScripts().map(script => ({
          ...script,
          accessStatus: 'locked' as const,
          missingTasks: script.requiredTasks
        }))
        setScripts(allScripts)
      } else {
        // Get scripts with access status for connected user
        const accessibleScripts = projectScriptAccess.getAccessibleScripts(publicKey.toString())
        setScripts(accessibleScripts)
      }
    } catch (error) {
      console.error('Failed to load scripts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (scriptId: string) => {
    if (!publicKey) {
      alert('Please connect your wallet to download scripts')
      return
    }

    const access = projectScriptAccess.checkAccess(publicKey.toString(), scriptId)
    if (!access.hasAccess) {
      alert(`Access denied: ${access.reason}`)
      return
    }

    setDownloading(scriptId)
    
    try {
      // Call download API
      const response = await fetch(`/api/scripts/download/${scriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: publicKey.toString()
        })
      })

      if (response.ok) {
        // Record download and trigger file download
        projectScriptAccess.recordDownload(scriptId)
        
        const blob = await response.blob()
        const script = projectScriptAccess.getScript(scriptId)
        const filename = script?.name.replace(/[^a-zA-Z0-9]/g, '-') + '.zip' || 'script.zip'
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Reload scripts to update download count
        loadScripts()
        
        alert('Download completed successfully!')
      } else {
        const error = await response.json()
        alert(`Download failed: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed: Network error')
    } finally {
      setDownloading(null)
    }
  }

  const getAccessIcon = (accessStatus: string, accessLevel: string) => {
    switch (accessStatus) {
      case 'granted':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'available':
        return accessLevel === 'free' 
          ? <CheckCircleIcon className="w-5 h-5 text-blue-400" />
          : <ClockIcon className="w-5 h-5 text-yellow-400" />
      default:
        return <LockClosedIcon className="w-5 h-5 text-red-400" />
    }
  }

  const getAccessLevelBadge = (level: string) => {
    const badges = {
      free: { icon: '🆓', text: 'Free', color: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
      verified: { icon: '✅', text: 'Verified', color: 'bg-green-500/20 text-green-300 border-green-400/30' },
      premium: { icon: '⭐', text: 'Premium', color: 'bg-purple-500/20 text-purple-300 border-purple-400/30' }
    }
    
    const badge = badges[level as keyof typeof badges] || badges.free
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color} flex items-center gap-1`}>
        <span>{badge.icon}</span>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-center text-gray-300 mt-4">Loading project scripts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <DocumentArrowDownIcon className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Project Scripts</h2>
            <p className="text-purple-200">Access exclusive development tools and automation scripts</p>
          </div>
        </div>
        
        {!publicKey && (
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mt-4">
            <p className="text-yellow-300 text-sm">
              🔒 Connect your wallet to access and download project scripts
            </p>
          </div>
        )}
      </div>

      {/* Scripts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {scripts.map((script) => (
          <div
            key={script.id}
            className={`bg-white/10 backdrop-blur-md rounded-xl border transition-all cursor-pointer ${
              selectedScript?.id === script.id
                ? 'border-purple-400 ring-2 ring-purple-400/50'
                : 'border-white/20 hover:border-white/30'
            }`}
            onClick={() => setSelectedScript(script)}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  {getAccessIcon(script.accessStatus, script.accessLevel)}
                  <h3 className="font-semibold text-white text-lg">{script.name}</h3>
                </div>
                {getAccessLevelBadge(script.accessLevel)}
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">{script.description}</p>

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  {script.downloadCount} downloads
                </div>
                <div className="flex items-center gap-1">
                  <span>v{script.version}</span>
                </div>
              </div>

              {/* Access Status */}
              {script.accessStatus === 'locked' && script.missingTasks && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 mb-4">
                  <p className="text-red-300 text-xs mb-2">Complete these tasks to unlock:</p>
                  <ul className="text-red-200 text-xs space-y-1">
                    {script.missingTasks.map((task, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {task.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {script.accessStatus === 'available' && script.accessLevel !== 'free' && (
                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 text-xs">
                    ✨ All required tasks completed! Ready for download.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(script.id)
                }}
                disabled={!publicKey || script.accessStatus === 'locked' || downloading === script.id}
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  script.accessStatus === 'granted' || (script.accessStatus === 'available' && script.accessLevel === 'free')
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                    : script.accessStatus === 'available'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                } ${!publicKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {downloading === script.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Downloading...
                  </>
                ) : script.accessStatus === 'locked' ? (
                  <>
                    <LockClosedIcon className="w-4 h-4" />
                    Locked
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {scripts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <DocumentArrowDownIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No project scripts available</p>
        </div>
      )}

      {/* Script Detail Modal */}
      {selectedScript && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-xl border border-purple-400/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedScript.name}</h2>
                  <div className="flex items-center gap-3">
                    {getAccessLevelBadge(selectedScript.accessLevel)}
                    <span className="text-sm text-gray-400">v{selectedScript.version}</span>
                    <span className="text-sm text-gray-400">{selectedScript.downloadCount} downloads</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScript(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-gray-300">{selectedScript.description}</p>
                </div>

                {selectedScript.requiredTasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Required Tasks</h3>
                    <div className="grid gap-2">
                      {selectedScript.requiredTasks.map((task, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          <span className="text-gray-300">
                            {task.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">File Information</h3>
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Version:</span>
                      <span className="text-white">{selectedScript.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Access Level:</span>
                      <span className="text-white">{selectedScript.accessLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Downloads:</span>
                      <span className="text-white">{selectedScript.downloadCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Updated:</span>
                      <span className="text-white">{new Date(selectedScript.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedScript(null)}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleDownload(selectedScript.id)}
                    disabled={!publicKey || downloading === selectedScript.id}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {downloading === selectedScript.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        Download Script
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}