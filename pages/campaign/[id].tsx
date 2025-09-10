import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { BellIcon, DocumentIcon, VideoCameraIcon, PhotoIcon, LinkIcon } from '@heroicons/react/24/outline'
import { taskSubmissions } from '../../lib/taskSubmissions'
import { campaignManager } from '../../lib/campaignStorage'
import { useSmartContractIntegration } from '../../lib/smartContractIntegration'
import ClientWalletButton from '../../components/ClientWalletButton'
import RoadmapProgress from '../../components/RoadmapProgress'
import AirdropTaskDashboard from '../../components/AirdropTaskDashboard'
import TaskRewardSystem from '../../components/TaskRewardSystem'
import AccessKeyMinting from '../../components/AccessKeyMinting'

export default function CampaignDetail() {
  const router = useRouter()
  const { id } = router.query
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const smartContract = useSmartContractIntegration()
  
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasLiked, setHasLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showVoteCount, setShowVoteCount] = useState(false)
  const [pendingSubmissions, setPendingSubmissions] = useState(0)
  const [donors, setDonors] = useState<Array<{ address: string; amount: number; timestamp: number }>>([])
  const [topDonor, setTopDonor] = useState<{ address: string; amount: number } | null>(null)

  useEffect(() => {
    // Listen for quick donate events from Access Key component
    const handleQuickDonate = (event: any) => {
      if (event.detail?.amount) {
        handleDonate(event.detail.amount)
      }
    }
    
    window.addEventListener('quickDonate', handleQuickDonate)
    
    return () => {
      window.removeEventListener('quickDonate', handleQuickDonate)
    }
  }, [])

  useEffect(() => {
    if (id) {
      const loadCampaign = async () => {
        console.log('Loading campaign with ID:', id)
        let loadedCampaign: any = null
        
        // First, try to find user-created campaign by ID
        let userCampaign = campaignManager.getCampaign(id as string)
        console.log('Looking for campaign with ID:', id)
        console.log('ID type:', typeof id)
        console.log('User campaign found by ID:', userCampaign)
        
        // If not found by ID, try to find by publicKey
        if (!userCampaign) {
          const allCampaigns = campaignManager.getAllCampaigns()
          userCampaign = allCampaigns.find(campaign => campaign.publicKey === id) || null
          console.log('User campaign found by publicKey:', userCampaign)
        }
        
        const allCampaigns = campaignManager.getAllCampaigns()
        console.log('All available campaigns:')
        allCampaigns.forEach(campaign => {
          console.log(`- ID: "${campaign.id}", Name: "${campaign.name}", PublicKey: "${campaign.publicKey}"`)
        })
        
        // Also try to load from smart contract if it's a smart contract address
        let smartContractCampaign = null
        try {
          smartContractCampaign = await smartContract.getCampaignData(id as string)
        } catch (error) {
          console.log('Not a smart contract campaign or error loading:', error)
        }
      
        if (userCampaign) {
          // Convert user campaign to display format
          loadedCampaign = {
            publicKey: userCampaign.publicKey || userCampaign.id,
            name: userCampaign.name,
            description: userCampaign.description,
            coverPhoto: userCampaign.coverPhoto,
            creator: userCampaign.creatorDisplayName || userCampaign.creator,
            creatorFullAddress: userCampaign.creator,
            targetAmount: userCampaign.targetAmount,
            raisedAmount: userCampaign.raisedAmount,
            tokenPrice: userCampaign.tokenPrice,
            tokenName: userCampaign.tokenName,
            tokenSymbol: userCampaign.tokenSymbol || userCampaign.name.split(' ')[0].toUpperCase().slice(0, 4),
            totalSupply: userCampaign.totalSupply || '1000000000',
            tokenIcon: userCampaign.tokenIcon,
            marketCap: userCampaign.marketCap,
            volume24h: userCampaign.volume24h,
            holders: userCampaign.holders,
            endTimestamp: userCampaign.endTimestamp || Date.now() + (30 * 24 * 60 * 60 * 1000),
            virtualSolReserves: 30_000_000_000,
            virtualTokenReserves: 1_073_000_000_000_000,
            realSolReserves: userCampaign.raisedAmount || 0,
            realTokenReserves: 800_000_000_000_000,
            useRoadmapWithdrawal: userCampaign.enableRoadmap,
            hasAirdropTasks: userCampaign.enableAirdrop,
            airdropConfig: userCampaign.airdropConfig,
            roadmapConfig: userCampaign.roadmapConfig,
            attachments: userCampaign.attachments,
            links: userCampaign.links,
            duration: userCampaign.duration,
            fundingRatio: userCampaign.fundingRatio,
            conversionStrategy: userCampaign.conversionStrategy,
            createdAt: userCampaign.createdAt
          }
        } else if (smartContractCampaign) {
          // Convert smart contract campaign to display format
          loadedCampaign = {
            publicKey: smartContractCampaign.publicKey,
            name: smartContractCampaign.name,
            description: smartContractCampaign.description,
            creator: smartContractCampaign.creator,
            creatorFullAddress: smartContractCampaign.creator,
            targetAmount: smartContractCampaign.targetAmount,
            raisedAmount: smartContractCampaign.raisedAmount,
            tokenPrice: smartContractCampaign.currentPrice,
            tokenName: smartContractCampaign.name,
            tokenSymbol: smartContractCampaign.name.split(' ')[0].toUpperCase().slice(0, 4),
            totalSupply: smartContractCampaign.tokenTotalSupply.toString(),
            marketCap: smartContractCampaign.marketCap,
            volume24h: 0,
            holders: 0,
            endTimestamp: smartContractCampaign.endTimestamp,
            virtualSolReserves: smartContractCampaign.virtualSolReserves,
            virtualTokenReserves: smartContractCampaign.virtualTokenReserves,
            realSolReserves: smartContractCampaign.realSolReserves,
            realTokenReserves: smartContractCampaign.realTokenReserves,
            useRoadmapWithdrawal: false,
            hasAirdropTasks: false,
            createdAt: smartContractCampaign.createdAt
          }
        }
        
        if (loadedCampaign) {
          setCampaign(loadedCampaign)
        }
        
        // Load like data from localStorage
        if (typeof window !== 'undefined') {
          const storedVotes = localStorage.getItem(`campaign_votes_${id}`)
          const voteData = storedVotes ? JSON.parse(storedVotes) : { count: 0, voters: [] }
          setLikeCount(voteData.count)
          
          if (publicKey && voteData.voters.includes(publicKey.toString())) {
            setHasLiked(true)
            setShowVoteCount(true)
          } else {
            setShowVoteCount(false)
          }
        }
        
        // Check for pending submissions if creator
        if (publicKey && loadedCampaign) {
          loadedCampaign.creatorFullAddress = publicKey.toString()
          const submissions = taskSubmissions.getSubmissionsForCampaign(id as string, { status: 'pending' })
          setPendingSubmissions(submissions.length)
        }
        
        // Load donor data from localStorage
        if (typeof window !== 'undefined') {
          const storedDonors = localStorage.getItem(`campaign_donors_${id}`)
          if (storedDonors) {
            const donorData = JSON.parse(storedDonors)
            setDonors(donorData)
            
            // Calculate top donor
            if (donorData.length > 0) {
              const aggregated = donorData.reduce((acc: any, donor: any) => {
                if (!acc[donor.address]) {
                  acc[donor.address] = 0
                }
                acc[donor.address] += donor.amount
                return acc
              }, {})
              
              const sortedDonors = Object.entries(aggregated)
                .map(([address, amount]: [string, any]) => ({ address, amount }))
                .sort((a, b) => b.amount - a.amount)
              
              setTopDonor(sortedDonors[0])
            }
          }
        }
        
        setLoading(false)
      }
      
      loadCampaign()
    }
  }, [id, publicKey, smartContract])

  const handleDonate = (amount: number = 1) => {
    if (!publicKey) {
      alert('Please connect your wallet to donate')
      return
    }

    // Add donation to the list
    const newDonation = {
      address: publicKey.toString(),
      amount: amount,
      timestamp: Date.now()
    }

    // Update donors list
    const updatedDonors = [...donors, newDonation]
    setDonors(updatedDonors)

    // Save to localStorage
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`campaign_donors_${id}`, JSON.stringify(updatedDonors))
    }

    // Update top donor
    const aggregated = updatedDonors.reduce((acc: any, donor) => {
      if (!acc[donor.address]) {
        acc[donor.address] = 0
      }
      acc[donor.address] += donor.amount
      return acc
    }, {})
    
    const sortedDonors = Object.entries(aggregated)
      .map(([address, amount]: [string, any]) => ({ address, amount }))
      .sort((a, b) => b.amount - a.amount)
    
    if (sortedDonors.length > 0) {
      setTopDonor(sortedDonors[0])
    }

    // Update campaign raised amount
    if (campaign) {
      const newCampaign = {
        ...campaign,
        raisedAmount: (campaign.raisedAmount || 0) + amount
      }
      setCampaign(newCampaign)
      
      // Update in campaign manager
      const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]')
      const index = campaigns.findIndex((c: any) => c.id === id)
      if (index !== -1) {
        campaigns[index] = newCampaign
        localStorage.setItem('campaigns', JSON.stringify(campaigns))
      }
    }
  }

  const handleLike = () => {
    if (!publicKey) {
      alert('Please connect your wallet to like this campaign')
      return
    }

    // Toggle like
    if (hasLiked) {
      // Remove like
      const newCount = Math.max(0, likeCount - 1)
      setLikeCount(newCount)
      setHasLiked(false)
      setShowVoteCount(false) // Hide count and return to circle form
      
      // Update localStorage
      if (typeof window !== 'undefined' && id) {
        const storedVotes = localStorage.getItem(`campaign_votes_${id}`)
        const voteData = storedVotes ? JSON.parse(storedVotes) : { count: 0, voters: [] }
        
        voteData.count = newCount
        voteData.voters = voteData.voters.filter((voter: string) => voter !== publicKey.toString())
        
        localStorage.setItem(`campaign_votes_${id}`, JSON.stringify(voteData))
      }
    } else {
      // Add like
      const newCount = likeCount + 1
      setLikeCount(newCount)
      setHasLiked(true)
      setShowVoteCount(true)

      // Save to localStorage
      if (typeof window !== 'undefined' && id) {
        const storedVotes = localStorage.getItem(`campaign_votes_${id}`)
        const voteData = storedVotes ? JSON.parse(storedVotes) : { count: 0, voters: [] }
        
        voteData.count = newCount
        if (!voteData.voters.includes(publicKey.toString())) {
          voteData.voters.push(publicKey.toString())
        }
        
        localStorage.setItem(`campaign_votes_${id}`, JSON.stringify(voteData))
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <p className="text-white">Campaign not found</p>
      </div>
    )
  }

  const progress = (campaign.raisedAmount / campaign.targetAmount) * 100
  const getCreatedDate = () => {
    if (!campaign.createdAt) return 'Recently created'
    
    const date = new Date(campaign.createdAt)
    return `Created ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10" style={{ position: 'relative', zIndex: 9000 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer"
            >
              FundIt
            </button>
            <ClientWalletButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div>
                <div className="flex gap-6 mb-6">
                  {/* Project Cover Photo */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-lg bg-white/10 border border-white/20 overflow-hidden">
                      {campaign.coverPhoto ? (
                        <img 
                          src={campaign.coverPhoto} 
                          alt={campaign.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Details */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-white">{campaign.name}</h1>
                      {/* Like Button */}
                      <button
                        onClick={handleLike}
                        className={`
                          ${showVoteCount ? 'px-3' : 'px-0'} 
                          h-8 min-w-[32px]
                          rounded-full text-xs font-medium
                          transition-all duration-500 ease-out transform hover:scale-105
                          flex items-center justify-center gap-1.5 flex-shrink-0
                          ${hasLiked 
                            ? 'bg-red-500/20 text-red-400 border border-red-400/50 shadow-sm shadow-red-500/20' 
                            : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20 hover:text-red-300 hover:border-red-400/30'
                          }
                        `}
                        style={{
                          width: showVoteCount ? 'auto' : '32px',
                        }}
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ${hasLiked ? 'scale-110' : ''}`}
                          fill={hasLiked ? 'currentColor' : 'none'}
                          stroke="currentColor" 
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                          />
                        </svg>
                        {showVoteCount && likeCount !== undefined && (
                          <span 
                            className={`
                              transition-all duration-500 overflow-hidden
                              max-w-[50px] opacity-100
                            `}
                          >
                            {likeCount}
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-300 mb-4">{campaign.description}</p>
                    
                    {/* Project Links */}
                    {campaign.links && campaign.links.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {campaign.links.map((link: any, index: number) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 transition-colors"
                            >
                              <LinkIcon className="w-4 h-4" />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Creator: {campaign.creator}</span>
                      <span>•</span>
                      <span>{getCreatedDate()}</span>
                      <span>•</span>
                      <span>{campaign.holders} holders</span>
                    </div>
                  </div>
                </div>
                
                {/* Funding Progress Bar - Full Width Under Picture */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Funding Progress</span>
                    <span className="text-white font-semibold">
                      {campaign.raisedAmount} / {campaign.targetAmount} SOL ({progress.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        const amount = prompt('Enter donation amount in SOL:')
                        if (amount && !isNaN(parseFloat(amount))) {
                          handleDonate(parseFloat(amount))
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all"
                    >
                      💝 Donate to Campaign
                    </button>
                    <div className="text-sm text-gray-400">
                      {donors.length} {donors.length === 1 ? 'donor' : 'donors'} so far
                    </div>
                  </div>
                </div>
              </div>
            </div>




            {/* Campaign Configuration - for user-created campaigns */}
            {(campaign.duration || campaign.fundingRatio || campaign.conversionStrategy) && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Campaign Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {campaign.duration && (
                    <div>
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-lg font-semibold text-white">
                        {campaign.duration === 'no_end_date' ? 'No End Date' : `${campaign.duration} days`}
                      </p>
                    </div>
                  )}
                  {campaign.fundingRatio && (
                    <div>
                      <p className="text-sm text-gray-400">Funding Split</p>
                      <p className="text-lg font-semibold text-white">
                        {campaign.fundingRatio}/{100 - parseInt(campaign.fundingRatio)}
                      </p>
                    </div>
                  )}
                  {campaign.conversionStrategy && (
                    <div>
                      <p className="text-sm text-gray-400">Price Protection</p>
                      <p className="text-lg font-semibold text-white capitalize">
                        {campaign.conversionStrategy}
                        {campaign.conversionStrategy === 'instant' && ' USDC'}
                        {campaign.conversionStrategy === 'hybrid' && ' (50/50)'}
                        {campaign.conversionStrategy === 'deferred' && ' SOL'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Project Attachments */}
            {campaign.attachments && campaign.attachments.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Project Resources</h2>
                <div className="grid gap-3">
                  {campaign.attachments.map((attachment: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {attachment.type.startsWith('video/') ? (
                          <VideoCameraIcon className="w-6 h-6 text-blue-400" />
                        ) : attachment.type.startsWith('image/') ? (
                          <PhotoIcon className="w-6 h-6 text-green-400" />
                        ) : (
                          <DocumentIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {attachment.label || attachment.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {attachment.name} • {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {attachment.url && (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Roadmap Progress Section */}
            {campaign.useRoadmapWithdrawal && (
              <RoadmapProgress 
                campaignPubkey={campaign.publicKey as string}
                isCreator={publicKey?.toString() === campaign.creatorFullAddress}
                roadmapConfig={campaign.roadmapConfig}
                targetAmount={campaign.targetAmount}
              />
            )}

            {/* Task/Reward System - Complete tasks or pay for access */}
            <TaskRewardSystem 
              campaignId={campaign.publicKey || campaign.id || ''}
              campaignName={campaign.name}
              onAccessGranted={() => {
                console.log('Access granted to campaign:', campaign.name)
              }}
            />

            {/* Airdrop Tasks Section */}
            {campaign.hasAirdropTasks && campaign.airdropConfig && (
              <AirdropTaskDashboard 
                campaignPubkey={campaign.publicKey as string}
                airdropConfig={campaign.airdropConfig}
              />
            )}

          </div>
          
          {/* Right Column - Access Key & Donor Leaderboard */}
          <div className="lg:col-span-1 space-y-6">
            {/* Access Key Minting */}
            <AccessKeyMinting 
              campaignId={id as string} 
              campaign={campaign}
              onMint={() => {
                // Refresh campaign data after minting
                if (id) {
                  const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]')
                  const found = campaigns.find((c: any) => c.id === id)
                  if (found) setCampaign(found)
                }
              }}
            />
            
            {/* Donor Leaderboard */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">🏆 Donor Leaderboard</h2>
                {topDonor && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-400/30">
                    <span className="text-xs text-yellow-400">👑</span>
                    <span className="text-xs font-bold text-white">{topDonor.amount.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              {donors.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {/* Aggregate donations by address */}
                  {(() => {
                    const aggregatedDonors = donors.reduce((acc: any, donor) => {
                      if (!acc[donor.address]) {
                        acc[donor.address] = {
                          address: donor.address,
                          amount: 0,
                          count: 0,
                          lastDonation: donor.timestamp
                        }
                      }
                      acc[donor.address].amount += donor.amount
                      acc[donor.address].count += 1
                      if (donor.timestamp > acc[donor.address].lastDonation) {
                        acc[donor.address].lastDonation = donor.timestamp
                      }
                      return acc
                    }, {})
                    
                    return Object.values(aggregatedDonors)
                      .sort((a: any, b: any) => b.amount - a.amount)
                      .slice(0, 10)
                      .map((donor: any, index: number) => (
                        <div
                          key={donor.address}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            index === 0 
                              ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-400/30' 
                              : index === 1
                              ? 'bg-gradient-to-r from-gray-500/10 to-gray-400/10 border-gray-400/30'
                              : index === 2
                              ? 'bg-gradient-to-r from-orange-500/10 to-orange-400/10 border-orange-400/30'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Rank Badge */}
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                              index === 0 
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black' 
                                : index === 1
                                ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black'
                                : index === 2
                                ? 'bg-gradient-to-r from-orange-300 to-orange-400 text-black'
                                : 'bg-white/10 text-gray-300'
                            }`}>
                              {index + 1}
                            </div>
                            
                            {/* Donor Info */}
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-white text-sm font-medium">
                                  {donor.address.slice(0, 4)}...{donor.address.slice(-4)}
                                </span>
                                {donor.count > 1 && (
                                  <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                    {donor.count}x
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(donor.lastDonation).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Amount */}
                          <div className="text-right">
                            <div className="text-white font-bold text-sm">
                              {donor.amount.toFixed(2)} SOL
                            </div>
                            {donor.amount >= 10 && (
                              <span className="text-xs text-green-400">🐋</span>
                            )}
                          </div>
                        </div>
                      ))
                  })()}
                  
                  {donors.length > 10 && (
                    <div className="text-center text-xs text-gray-400 pt-2">
                      +{donors.length - 10} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">💝</div>
                  <p className="text-gray-400 text-sm mb-3">Be the first supporter!</p>
                  <button 
                    onClick={() => handleDonate(1)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all w-full"
                  >
                    Donate Now
                  </button>
                </div>
              )}
              
              {/* Quick Donate Section */}
              {donors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      const amount = prompt('Enter donation amount in SOL:')
                      if (amount && !isNaN(parseFloat(amount))) {
                        handleDonate(parseFloat(amount))
                      }
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    💝 Add Donation
                  </button>
                  <div className="text-center text-xs text-gray-400 mt-2">
                    {donors.length} {donors.length === 1 ? 'donor' : 'donors'} • {campaign?.raisedAmount || 0} SOL raised
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Creator Verification Button */}
      {publicKey && campaign && publicKey.toString() === campaign.creatorFullAddress && campaign.hasAirdropTasks && (
        <button
          onClick={() => router.push(`/campaign/${id}/verify`)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full p-4 shadow-2xl transition-all transform hover:scale-105"
          style={{ zIndex: 9000 }}
        >
          <BellIcon className="w-6 h-6" />
          {pendingSubmissions > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {pendingSubmissions}
            </span>
          )}
        </button>
      )}
    </div>
  )
}