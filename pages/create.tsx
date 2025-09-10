import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { PlusIcon, TrashIcon, DocumentIcon, VideoCameraIcon, PhotoIcon, LinkIcon } from '@heroicons/react/24/outline'
import AirdropTaskSetup from '../components/AirdropTaskSetup'
import RoadmapSetup from '../components/RoadmapSetup'
import InfoTooltip from '../components/InfoTooltip'
import ClientWalletButton from '../components/ClientWalletButton'
import { campaignManager } from '../lib/campaignStorage'
import { useSmartContractIntegration } from '../lib/smartContractIntegration'
import { useCreatorFundingPools } from '../lib/creatorFundingPools'

export default function CreateCampaignPage() {
  const router = useRouter()
  const { publicKey, signTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const smartContract = useSmartContractIntegration()
  const fundingPoolManager = useCreatorFundingPools()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enableAirdrop: false,
    enableRoadmap: true,
    // Funding Pool Settings
    depositWallet: '', // Wallet address where donations will be sent
    // Simplified crowdsourcing - no NFT features
    projectType: 'creative', // creative, tech, social, business
    fundingGoal: '',
    duration: 30 // days
  })
  const [coverPhoto, setCoverPhoto] = useState<{
    file: File | null
    preview: string | null
  }>({ file: null, preview: null })
  // Removed NFT/Access key related state for pure crowdsourcing focus
  const [loading, setLoading] = useState(false)
  const [showAirdropSetup, setShowAirdropSetup] = useState(false)
  const [showRoadmapSetup, setShowRoadmapSetup] = useState(false)
  const [airdropConfig, setAirdropConfig] = useState<any>(null)
  const [roadmapConfig, setRoadmapConfig] = useState<any>(null)
  const [attachments, setAttachments] = useState<Array<{
    id: string
    name: string
    label: string
    type: string
    size: number
    url?: string
    file?: File
  }>>([])
  const [dragOver, setDragOver] = useState(false)
  const [links, setLinks] = useState<Array<{
    id: string
    label: string
    url: string
  }>>([
    { id: '1', label: 'Website', url: '' },
    { id: '2', label: 'Twitter', url: '' }
  ])

  // Solana address validation function
  const isValidSolanaAddress = (address: string): boolean => {
    try {
      // Check if address is empty or not exactly 44 characters
      if (!address || address.length !== 44) {
        return false
      }
      
      // Check if it contains only valid base58 characters
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
      if (!base58Regex.test(address)) {
        return false
      }
      
      // Try to create PublicKey instance
      const pubkey = new PublicKey(address)
      
      // Additional check: ensure the created PublicKey toString matches input
      // This catches cases where PublicKey constructor auto-corrects invalid input
      return pubkey.toString() === address
    } catch {
      return false
    }
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (coverPhoto.preview) {
        URL.revokeObjectURL(coverPhoto.preview)
      }
      if (accessKeyArt.preview) {
        URL.revokeObjectURL(accessKeyArt.preview)
      }
    }
  }, [])

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type - accept images and GIFs
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Please select an image file (JPEG, PNG, GIF, or WebP)')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Cover photo must be less than 5MB')
        return
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setCoverPhoto({ file, preview: previewUrl })
    }
  }

  const removeCoverPhoto = () => {
    if (coverPhoto.preview) {
      URL.revokeObjectURL(coverPhoto.preview)
    }
    setCoverPhoto({ file: null, preview: null })
  }

  // Removed NFT/Access key related functions for pure crowdsourcing focus

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate wallet connection
    if (!publicKey || !signTransaction) {
      alert('Please connect your external wallet (Phantom, Solflare, etc.) first')
      return
    }
    
    // Validate deposit wallet
    if (!formData.depositWallet || !isValidSolanaAddress(formData.depositWallet)) {
      alert('Please enter a valid Solana wallet address for donations')
      return
    }
    
    setLoading(true)

    try {
      console.log('Creating crowdsourcing campaign with data:', formData)
      
      const campaignId = Date.now().toString()
      
      // Pure crowdsourcing - no NFT collection creation
      
      // Create campaign locally
      const campaignData = {
        id: campaignId,
        name: formData.name,
        description: formData.description,
        targetAmount: 100,
        raisedAmount: 0,
        createdAt: Date.now(),
        creator: publicKey.toString(),
        depositWallet: formData.depositWallet,
        enableAirdrop: formData.enableAirdrop,
        enableRoadmap: formData.enableRoadmap,
        airdropConfig: airdropConfig,
        roadmapConfig: roadmapConfig,
        // Access Key Configuration
        enableAccessKeys: formData.enableAccessKeys,
        accessKeyConfig: {
          name: formData.accessKeyName || `${formData.name} Access Key`,
          maxSupply: formData.maxSupply ? parseInt(formData.maxSupply) : null,
          pricePerKey: parseFloat(formData.pricePerKey),
          artwork: accessKeyArt.preview,
          tasks: accessKeyTasks.filter(task => task.description.trim() !== ''),
          collectionAddress: nftCollectionAddress // Store the NFT collection address
        },
        attachments: attachments,
        links: links.filter(link => link.url.trim() !== ''),
        coverPhoto: coverPhoto.preview,
        tokenPrice: 0.0001,
        marketCap: 0,
        volume24h: 0,
        holders: 0,
        endTimestamp: null
      }

      // Save campaign locally
      campaignManager.addCampaign(campaignData)
      
      alert(`Campaign created successfully!${nftCollectionAddress ? ` NFT Collection: ${nftCollectionAddress.slice(0, 8)}...` : ''}`)
      router.push('/')
      
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoadmapSave = (config: any) => {
    setRoadmapConfig(config)
    setShowRoadmapSetup(false)
  }

  const handleAirdropSave = (config: any) => {
    setAirdropConfig(config)
    setShowAirdropSetup(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer"
            >
              FundIt
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                ← Back to Campaigns
              </button>
              <ClientWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showRoadmapSetup && (
          <RoadmapSetup
            onClose={() => setShowRoadmapSetup(false)}
            onSave={handleRoadmapSave}
          />
        )}
        
        {showAirdropSetup && (
          <AirdropTaskSetup
            campaignPubkey=""
            onClose={() => setShowAirdropSetup(false)}
            onSave={handleAirdropSave}
          />
        )}
        
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/10">
          {/* Hero Header */}
          <div className="bg-gradient-to-r from-purple-600/50 to-pink-600/50 rounded-t-2xl p-8 border-b border-purple-500/30">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent mb-4">
                Create Your Campaign
              </h1>
              <p className="text-purple-200/80 text-lg max-w-2xl mx-auto">
                Launch your crowdfunding campaign and bring your project to life with the power of community support
              </p>
            </div>
          </div>
          
          {/* Form Content */}
          <div className="p-8">
            <form id="campaign-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Cover Photo */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 flex items-center justify-center">
                    <PhotoIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Cover Image</h2>
                    <p className="text-sm text-gray-400">Upload an eye-catching cover photo</p>
                  </div>
                </div>

                {!coverPhoto.preview ? (
                  <label className="block w-full p-8 border-2 border-dashed border-purple-400/50 rounded-xl text-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all">
                    <PhotoIcon className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                    <span className="text-lg font-medium text-white">Click to upload cover photo</span>
                    <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF, WebP up to 5MB</p>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleCoverPhotoChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={coverPhoto.preview}
                      alt="Cover preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeCoverPhoto}
                      className="absolute top-4 right-4 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Campaign Details</h2>
                    <p className="text-sm text-gray-400">Tell people about your project</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center">
                        Campaign Name
                        <InfoTooltip text="Choose a clear, compelling name for your campaign" />
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      placeholder="e.g., Revolutionary Film Project"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 resize-none"
                      placeholder="Describe your project, goals, and why people should support you..."
                    />
                  </div>

                </div>
              </div>

              {/* Roadmap Option */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Roadmap Configuration</h2>
                    <p className="text-sm text-gray-400">Set up milestone-based funding</p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableRoadmap}
                      onChange={(e) => setFormData({ ...formData, enableRoadmap: e.target.checked })}
                      className="mr-3 w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                    />
                    <span className="text-white font-medium flex items-center">
                      Show Project Roadmap
                      <InfoTooltip text="Display a visual roadmap showing your project milestones and progress. Helps donors understand your development plan and track your progress." />
                    </span>
                  </label>
                  <p className="text-sm text-gray-400 mt-2 ml-7">
                    Display a visual timeline of your project milestones for donors
                  </p>
                  
                  {formData.enableRoadmap && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      {roadmapConfig ? (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-green-400 font-medium">Roadmap configured</span>
                            <button
                              type="button"
                              onClick={() => setShowRoadmapSetup(true)}
                              className="text-purple-400 hover:text-purple-300 text-sm"
                            >
                              Edit roadmap
                            </button>
                          </div>
                          <div className="text-sm text-gray-300">
                            <p>• {roadmapConfig.stages?.length || 0} milestones configured</p>
                            <p>• Visual progress tracking for donors</p>
                            <p>• Project timeline and deliverables</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-orange-400 font-medium mb-2">Roadmap not configured</p>
                          <p className="text-sm text-gray-400 mb-3">
                            Set up your project timeline and milestones to show donors your development plan
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowRoadmapSetup(true)}
                            className="text-purple-400 hover:text-purple-300 text-sm"
                          >
                            Configure now →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Access Key Minting Configuration */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🔑</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Access Key Minting</h3>
                    <p className="text-gray-400 text-sm">Configure NFT access keys for your project</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={formData.enableAccessKeys}
                      onChange={(e) => setFormData({ ...formData, enableAccessKeys: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                  </label>
                </div>

                {formData.enableAccessKeys && (
                  <div className="space-y-6">
                    {/* Overview */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-300/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-400">ℹ️</span>
                        <span className="text-sm font-medium text-purple-300">Access Key Overview</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Access keys are NFTs that grant holders exclusive access to your project content.
                        Users can either complete social tasks or pay ${formData.pricePerKey} to mint an access key.
                      </p>
                    </div>

                    {/* Access Key Artwork & Configuration */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left side - Artwork */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Access Key Artwork
                        </label>
                        
                        {!accessKeyArt.preview ? (
                          <label className="block w-full aspect-square p-8 border-2 border-dashed border-purple-400/50 rounded-xl text-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all">
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="w-12 h-12 text-purple-400 mb-4">🎨</div>
                              <span className="text-lg font-medium text-white">Upload Access Key Art</span>
                              <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF, WebP up to 5MB</p>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleAccessKeyArtChange}
                                className="hidden"
                              />
                            </div>
                          </label>
                        ) : (
                          <div className="relative aspect-square">
                            <img
                              src={accessKeyArt.preview}
                              alt="Access key art preview"
                              className="w-full h-full object-cover rounded-xl border border-purple-300/30"
                            />
                            <button
                              type="button"
                              onClick={removeAccessKeyArt}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right side - Configuration */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Access Key Name
                          </label>
                          <input
                            type="text"
                            value={formData.accessKeyName}
                            onChange={(e) => setFormData({ ...formData, accessKeyName: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                            placeholder={`${formData.name} Access Key`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Price per Key (USD)
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={formData.pricePerKey}
                            onChange={(e) => setFormData({ ...formData, pricePerKey: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                            placeholder="1.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Maximum Supply (Optional)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.maxSupply}
                            onChange={(e) => setFormData({ ...formData, maxSupply: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                            placeholder="Leave empty for unlimited supply"
                          />
                          <div className="text-xs text-gray-400 mt-1">
                            💡 Tip: Limited supply creates scarcity and can increase demand for your access keys.
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Social Tasks Configuration */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Social Tasks
                          </label>
                          <p className="text-xs text-gray-400">Configure tasks users can complete to earn access keys</p>
                        </div>
                        <button
                          type="button"
                          onClick={addTask}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          + Add Task
                        </button>
                      </div>

                      <div className="space-y-3">
                        {accessKeyTasks.map((task, index) => (
                          <div key={task.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-400 mb-1">
                                    Task Type
                                  </label>
                                  <select
                                    value={task.type}
                                    onChange={(e) => updateTask(task.id, 'type', e.target.value)}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-purple-400"
                                  >
                                    <option value="twitter_follow">Twitter Follow</option>
                                    <option value="twitter_retweet">Twitter Retweet</option>
                                    <option value="discord_join">Discord Join</option>
                                    <option value="telegram_join">Telegram Join</option>
                                    <option value="custom">Custom Task</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-400 mb-1">
                                    Task Description
                                  </label>
                                  <input
                                    type="text"
                                    value={task.description}
                                    onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-purple-400"
                                    placeholder="Describe the task..."
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTask(task.id)}
                                className="text-red-400 hover:text-red-300 p-2 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Funding Pool Configuration */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Funding Wallet</h2>
                    <p className="text-sm text-gray-400">Where donations will be sent</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center">
                      Deposit Wallet Address
                      <InfoTooltip text="Solana wallet address where donations will be sent directly. Must be a valid Solana address." />
                    </span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.depositWallet}
                        onChange={(e) => setFormData({ ...formData, depositWallet: e.target.value })}
                        className={`flex-1 px-4 py-3 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                          formData.depositWallet && !isValidSolanaAddress(formData.depositWallet)
                            ? 'bg-red-900/20 border-red-500 focus:border-red-400 focus:ring-red-400/20'
                            : 'bg-white/10 border-white/20 focus:border-green-400 focus:ring-green-400/20'
                        }`}
                        placeholder={publicKey ? `${publicKey.toString()}` : "Connect wallet to see your address"}
                      />
                      {publicKey && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, depositWallet: publicKey.toString() })}
                          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Use My Wallet
                        </button>
                      )}
                    </div>
                    {formData.depositWallet && (
                      <div className="flex items-center gap-2 text-sm">
                        {isValidSolanaAddress(formData.depositWallet) ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-400">Valid Solana address</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-red-400">Invalid Solana address format</span>
                          </>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      💡 Tip: Use your own wallet address to receive donations directly, or create a dedicated project wallet for better fund management.
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
          
          {/* Footer Actions */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-b-2xl p-8 border-t border-purple-500/30">
            <div className="flex gap-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="campaign-form"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Campaign...
                  </span>
                ) : (
                  'Create Campaign'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}