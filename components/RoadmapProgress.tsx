import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { CheckCircleIcon, ClockIcon, LockClosedIcon, CurrencyDollarIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface RoadmapStage {
  name: string
  description: string
  fundingRequired: number
  fundingUsage: string
  deliverables: string[]
  unlockTimestamp: number
  withdrawnAmount: number
  completed: boolean
}

interface StageStatus {
  index: number
  name: string
  description?: string
  fundingRequired: number
  fundingAllocated: number
  fundingWithdrawn: number
  fundingAvailable: number
  isFullyFunded: boolean
  isUnlocked: boolean
  isCompleted: boolean
  fundingUsage?: string
  deliverables?: string[]
}

interface RoadmapProgressProps {
  campaignPubkey: string
  isCreator?: boolean
  roadmapConfig?: any
  targetAmount?: number
}

export default function RoadmapProgress({ campaignPubkey, isCreator = false, roadmapConfig, targetAmount }: RoadmapProgressProps) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [stages, setStages] = useState<StageStatus[]>([])
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState<number | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set())
  const [showAllStages, setShowAllStages] = useState(false)
  const [activeTab, setActiveTab] = useState<'roadmap' | 'community'>('roadmap')
  const [comment, setComment] = useState('')
  const [commentImage, setCommentImage] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<{ commentId: number, replyId?: number } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyImage, setReplyImage] = useState<string | null>(null)
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set())
  const [comments, setComments] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    fetchRoadmapStatus()
  }, [campaignPubkey, connection])

  const toggleStageExpanded = (index: number) => {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedStages(newExpanded)
  }

  const fetchRoadmapStatus = async () => {
    try {
      let stageData: any[] = []
      
      if (roadmapConfig && roadmapConfig.stages && targetAmount) {
        // Use real roadmap data from user campaign
        stageData = roadmapConfig.stages.map((stage: any, index: number) => {
          const fundingRequired = (stage.funding_percentage / 100) * targetAmount * 1000000000 // Convert SOL to lamports
          
          return {
            index: stage.index || index,
            name: stage.name,
            description: stage.description,
            fundingRequired: fundingRequired,
            fundingAllocated: 0, // No funds allocated yet for new campaigns
            fundingWithdrawn: 0,
            fundingAvailable: 0, // No funds available yet
            isFullyFunded: false, // Not funded yet
            isUnlocked: false, // Not unlocked yet
            isCompleted: stage.is_completed || false,
            fundingUsage: stage.funding_usage,
            deliverables: stage.deliverables || []
          }
        })
      } else {
        // No roadmap data available
        stageData = []
      }
      
      setStages(stageData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching roadmap status:', error)
      setLoading(false)
    }
  }

  const handleWithdraw = async (stageIndex: number) => {
    if (!publicKey || !signTransaction) return
    
    setWithdrawing(stageIndex)
    try {
      console.log(`Withdrawing funds for stage ${stageIndex}`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await fetchRoadmapStatus()
      alert(`Successfully withdrew funds for stage ${stageIndex + 1}`)
    } catch (error) {
      console.error('Withdrawal error:', error)
      alert('Failed to withdraw funds')
    } finally {
      setWithdrawing(null)
    }
  }

  const formatSOL = (lamports: number) => {
    return (lamports / 1000000000).toFixed(2)
  }

  const getTimeRemaining = (unlockTimestamp: number) => {
    if (!mounted) return 'Loading...'
    
    const now = Date.now() / 1000
    const remaining = unlockTimestamp - now
    
    if (remaining <= 0) return 'Unlocked'
    
    const days = Math.floor(remaining / (24 * 60 * 60))
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }

  const getStageIcon = (stage: StageStatus) => {
    if (stage.fundingWithdrawn > 0) {
      return <CheckCircleIcon className="w-6 h-6 text-green-500" />
    } else if (stage.isUnlocked) {
      return <CurrencyDollarIcon className="w-6 h-6 text-blue-500" />
    } else {
      return <LockClosedIcon className="w-6 h-6 text-gray-400" />
    }
  }

  const getProgressBarColor = (stage: StageStatus) => {
    if (stage.fundingWithdrawn > 0) return 'bg-green-500'
    if (stage.isFullyFunded) return 'bg-yellow-500'
    if (stage.fundingAllocated > 0) return 'bg-blue-500'
    return 'bg-gray-500'
  }

  const handleAddComment = () => {
    if ((!comment.trim() && !commentImage) || !publicKey) return
    
    const nextId = Math.max(...comments.map(c => c.id), ...comments.flatMap(c => c.replies?.map((r: any) => r.id) || [])) + 1
    const newComment = {
      id: nextId,
      author: `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`,
      content: comment,
      image: commentImage,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: [],
    }
    
    setComments([newComment, ...comments])
    setComment('')
    setCommentImage(null)
  }
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (isReply) {
          setReplyImage(reader.result as string)
        } else {
          setCommentImage(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }
  
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  const handleLikeComment = (commentId: number, isReply: boolean = false, parentId?: number) => {
    if (!publicKey) {
      alert('Please connect your wallet to like comments')
      return
    }

    if (isReply && parentId !== undefined) {
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.map((reply: any) => {
                if (reply.id === commentId) {
                  const isLiked = likedComments.has(commentId)
                  if (isLiked) {
                    setLikedComments(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(commentId)
                      return newSet
                    })
                    return { ...reply, likes: Math.max(0, reply.likes - 1) }
                  } else {
                    setLikedComments(prev => new Set(prev).add(commentId))
                    return { ...reply, likes: reply.likes + 1 }
                  }
                }
                return reply
              })
            }
          }
          return comment
        })
      )
    } else {
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            const isLiked = likedComments.has(commentId)
            if (isLiked) {
              setLikedComments(prev => {
                const newSet = new Set(prev)
                newSet.delete(commentId)
                return newSet
              })
              return { ...comment, likes: Math.max(0, comment.likes - 1) }
            } else {
              setLikedComments(prev => new Set(prev).add(commentId))
              return { ...comment, likes: comment.likes + 1 }
            }
          }
          return comment
        })
      )
    }
  }

  const handleReply = () => {
    if ((!replyText.trim() && !replyImage) || !publicKey || !replyTo) return
    
    const nextId = Math.max(
      ...comments.map(c => c.id), 
      ...comments.flatMap(c => c.replies?.map((r: any) => r.id) || []),
      ...comments.flatMap(c => c.replies?.flatMap((r: any) => r.replies?.map((rr: any) => rr.id) || []) || [])
    ) + 1
    
    const newReply = {
      id: nextId,
      author: `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`,
      content: replyText,
      image: replyImage,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: replyTo.replyId ? undefined : [],
    }
    
    setComments(prevComments => 
      prevComments.map(comment => {
        if (comment.id === replyTo.commentId) {
          if (replyTo.replyId) {
            // Reply to a reply
            return {
              ...comment,
              replies: comment.replies.map((reply: any) => {
                if (reply.id === replyTo.replyId) {
                  return {
                    ...reply,
                    replies: [...(reply.replies || []), newReply]
                  }
                }
                return reply
              })
            }
          } else {
            // Reply to main comment
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            }
          }
        }
        return comment
      })
    )
    
    setReplyText('')
    setReplyImage(null)
    setReplyTo(null)
  }

  const formatTimestamp = (timestamp: string) => {
    if (!mounted) return 'Loading...'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/20">
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex-1 py-4 px-6 font-semibold transition-all ${
            activeTab === 'roadmap'
              ? 'text-white bg-white/10 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Roadmap Progress
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 py-4 px-6 font-semibold transition-all ${
            activeTab === 'community'
              ? 'text-white bg-white/10 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Community ({comments.length})
        </button>
      </div>
      
      <div className="p-6">
        {activeTab === 'roadmap' ? (
          <div className="space-y-6">
            {/* Show first 5 stages or all if showAllStages is true */}
            {(showAllStages ? stages : stages.slice(0, 5)).map((stage, index) => (
              <div key={index} className="relative">
                {/* Connection line */}
                {index < (showAllStages ? stages.length - 1 : Math.min(4, stages.length - 1)) && (
                  <div className="absolute left-6 top-16 h-full w-0.5 bg-white/20" />
                )}
                
                <div className="flex gap-4">
                  {/* Stage icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    {getStageIcon(stage)}
                  </div>
                  
                  {/* Stage content */}
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-white">
                            Stage {index + 1}: {stage.name}
                          </h4>
                          <button
                            onClick={() => toggleStageExpanded(index)}
                            className="p-1 hover:bg-white/10 rounded transition-all duration-200"
                            title="View details"
                          >
                            <ChevronDownIcon 
                              className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                                expandedStages.has(index) ? 'rotate-180' : ''
                              }`} 
                            />
                          </button>
                        </div>
                        {stage.description && (
                          <p className="text-sm text-gray-400 mt-1 mb-2">{stage.description}</p>
                        )}
                        <div className="flex gap-4 text-sm text-gray-300 mt-1">
                          <span>Required: {formatSOL(stage.fundingRequired)} SOL</span>
                          <span>Allocated: {formatSOL(stage.fundingAllocated)} SOL</span>
                          {stage.fundingWithdrawn > 0 && (
                            <span>Withdrawn: {formatSOL(stage.fundingWithdrawn)} SOL</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      <div className="flex items-center gap-2">
                        {stage.fundingWithdrawn > 0 ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                            Withdrawn
                          </span>
                        ) : stage.isUnlocked ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                            Unlocked
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400 flex items-center gap-1">
                            <LockClosedIcon className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                      <div 
                        className={`h-2 rounded-full transition-all ${getProgressBarColor(stage)}`}
                        style={{ 
                          width: `${stage.fundingRequired > 0 
                            ? (stage.fundingAllocated / stage.fundingRequired) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                    
                    {/* Expandable details section with transition */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedStages.has(index) 
                          ? 'max-h-96 opacity-100 mt-4' 
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-semibold text-white mb-1">Funding Usage:</h5>
                            <p className="text-sm text-gray-300">{stage.fundingUsage || 'Details coming soon...'}</p>
                          </div>
                          
                          {stage.deliverables && stage.deliverables.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-white mb-2">Deliverables:</h5>
                              <ul className="space-y-1">
                                {stage.deliverables.map((deliverable: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                    <span className="text-purple-400 mt-0.5">•</span>
                                    <span>{deliverable}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Withdraw button for creator */}
                    {isCreator && stage.isUnlocked && stage.fundingAvailable > 0 && !stage.isCompleted && (
                      <button
                        onClick={() => handleWithdraw(index)}
                        disabled={withdrawing !== null}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          withdrawing === index
                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                        }`}
                      >
                        {withdrawing === index ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Withdrawing...
                          </span>
                        ) : (
                          `Withdraw ${formatSOL(stage.fundingAvailable)} SOL`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show More/Less button if there are more than 5 stages */}
            {stages.length > 5 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowAllStages(!showAllStages)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 border border-white/20"
                >
                  <span>{showAllStages ? 'Show Less' : `Show ${stages.length - 5} More Stages`}</span>
                  <ChevronDownIcon 
                    className={`w-5 h-5 transition-transform duration-300 ${
                      showAllStages ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            )}
            
            {/* Summary */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">Total Required</p>
                  <p className="text-white font-semibold">
                    {formatSOL(stages.reduce((sum, s) => sum + s.fundingRequired, 0))} SOL
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Allocated</p>
                  <p className="text-white font-semibold">
                    {formatSOL(stages.reduce((sum, s) => sum + s.fundingAllocated, 0))} SOL
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Available Now</p>
                  <p className="text-white font-semibold">
                    {formatSOL(stages.filter(s => s.isUnlocked).reduce((sum, s) => sum + s.fundingAvailable, 0))} SOL
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Withdrawn</p>
                  <p className="text-white font-semibold">
                    {formatSOL(stages.reduce((sum, s) => sum + s.fundingWithdrawn, 0))} SOL
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Community Tab Content */
          <div>
            {/* Comment Input */}
            {publicKey && (
              <div className="mb-6">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this project... (URLs will become clickable links)"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 resize-none"
                  rows={3}
                />
                {commentImage && (
                  <div className="mt-2 relative inline-block">
                    <img src={commentImage} alt="Upload preview" className="max-h-32 rounded-lg" />
                    <button
                      onClick={() => setCommentImage(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleAddComment}
                    disabled={!comment.trim() && !commentImage}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Comment
                  </button>
                  <label className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer transition-all flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
            
            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="space-y-3">
                    {/* Main Comment */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-white">{comment.author}</span>
                          <span className="text-gray-400 text-sm ml-2">{formatTimestamp(comment.timestamp)}</span>
                        </div>
                      </div>
                      {comment.content && (
                        <p className="text-gray-300">{renderTextWithLinks(comment.content)}</p>
                      )}
                      {comment.image && (
                        <img src={comment.image} alt="Comment attachment" className={`${comment.content ? 'mt-2' : ''} max-w-full rounded-lg`} style={{ maxHeight: '300px' }} />
                      )}
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <button 
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            likedComments.has(comment.id) 
                              ? 'text-purple-400 hover:text-purple-300' 
                              : 'text-gray-400 hover:text-purple-400'
                          }`}
                        >
                          <svg 
                            className="w-4 h-4" 
                            fill={likedComments.has(comment.id) ? "currentColor" : "none"} 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{comment.likes}</span>
                        </button>
                        <button 
                          onClick={() => setReplyTo(replyTo?.commentId === comment.id && !replyTo?.replyId ? null : { commentId: comment.id })}
                          className="text-gray-400 hover:text-purple-400 transition-colors"
                        >
                          Reply
                        </button>
                        {comment.replies && comment.replies.length > 0 && (
                          <span className="text-gray-400">
                            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                      
                      {/* Reply Input */}
                      {replyTo?.commentId === comment.id && !replyTo?.replyId && (
                        <div className="mt-3 pl-2 border-l-2 border-purple-500/30">
                          {replyImage && (
                            <div className="mb-2 relative inline-block">
                              <img src={replyImage} alt="Reply preview" className="max-h-24 rounded-lg" />
                              <button
                                onClick={() => setReplyImage(null)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply... (URLs will become clickable)"
                              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-400"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && (replyText.trim() || replyImage)) {
                                  handleReply()
                                }
                              }}
                            />
                            <label className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg cursor-pointer transition-colors flex items-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, true)}
                                className="hidden"
                              />
                            </label>
                            <button
                              onClick={handleReply}
                              disabled={!replyText.trim() && !replyImage}
                              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                            >
                              Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyTo(null)
                                setReplyText('')
                                setReplyImage(null)
                              }}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 space-y-2">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-semibold text-white text-sm">{reply.author}</span>
                                <span className="text-gray-400 text-xs ml-2">{formatTimestamp(reply.timestamp)}</span>
                              </div>
                            </div>
                            {reply.content && (
                              <p className="text-gray-300 text-sm">{renderTextWithLinks(reply.content)}</p>
                            )}
                            {reply.image && (
                              <img src={reply.image} alt="Reply attachment" className={`${reply.content ? 'mt-2' : ''} max-w-full rounded-lg`} style={{ maxHeight: '200px' }} />
                            )}
                            <div className="mt-2 flex items-center gap-4 text-sm">
                              <button 
                                onClick={() => handleLikeComment(reply.id, true, comment.id)}
                                className={`flex items-center gap-1.5 transition-colors ${
                                  likedComments.has(reply.id) 
                                    ? 'text-purple-400 hover:text-purple-300' 
                                    : 'text-gray-400 hover:text-purple-400'
                                }`}
                              >
                                <svg 
                                  className="w-3.5 h-3.5" 
                                  fill={likedComments.has(reply.id) ? "currentColor" : "none"} 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span>{reply.likes}</span>
                              </button>
                              <button 
                                onClick={() => setReplyTo(replyTo?.commentId === comment.id && replyTo?.replyId === reply.id ? null : { commentId: comment.id, replyId: reply.id })}
                                className="text-gray-400 hover:text-purple-400 transition-colors"
                              >
                                Reply
                              </button>
                              {reply.replies && reply.replies.length > 0 && (
                                <span className="text-gray-400">
                                  {reply.replies.length} {reply.replies.length === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>
                            
                            {/* Nested Reply Input */}
                            {replyTo?.commentId === comment.id && replyTo?.replyId === reply.id && (
                              <div className="mt-3 pl-2 border-l-2 border-purple-500/30">
                                {replyImage && (
                                  <div className="mb-2 relative inline-block">
                                    <img src={replyImage} alt="Reply preview" className="max-h-20 rounded-lg" />
                                    <button
                                      onClick={() => setReplyImage(null)}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Reply to this comment..."
                                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs placeholder-gray-400 focus:outline-none focus:border-purple-400"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && (replyText.trim() || replyImage)) {
                                        handleReply()
                                      }
                                    }}
                                  />
                                  <label className="px-2 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg cursor-pointer transition-colors flex items-center">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(e, true)}
                                      className="hidden"
                                    />
                                  </label>
                                  <button
                                    onClick={handleReply}
                                    disabled={!replyText.trim() && !replyImage}
                                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
                                  >
                                    Reply
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyTo(null)
                                      setReplyText('')
                                      setReplyImage(null)
                                    }}
                                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Nested Replies */}
                            {reply.replies && reply.replies.length > 0 && (
                              <div className="ml-6 mt-3 space-y-2">
                                {reply.replies.map((nestedReply: any) => (
                                  <div key={nestedReply.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div className="flex justify-between items-start mb-1">
                                      <div>
                                        <span className="font-semibold text-white text-xs">{nestedReply.author}</span>
                                        <span className="text-gray-400 text-xs ml-2">{formatTimestamp(nestedReply.timestamp)}</span>
                                      </div>
                                    </div>
                                    {nestedReply.content && (
                                      <p className="text-gray-300 text-xs">{renderTextWithLinks(nestedReply.content)}</p>
                                    )}
                                    {nestedReply.image && (
                                      <img src={nestedReply.image} alt="Nested reply attachment" className={`${nestedReply.content ? 'mt-2' : ''} max-w-full rounded-lg`} style={{ maxHeight: '150px' }} />
                                    )}
                                    <div className="mt-2">
                                      <button 
                                        onClick={() => handleLikeComment(nestedReply.id, true, comment.id)}
                                        className={`flex items-center gap-1 text-xs transition-colors ${
                                          likedComments.has(nestedReply.id) 
                                            ? 'text-purple-400 hover:text-purple-300' 
                                            : 'text-gray-400 hover:text-purple-400'
                                        }`}
                                      >
                                        <svg 
                                          className="w-3 h-3" 
                                          fill={likedComments.has(nestedReply.id) ? "currentColor" : "none"} 
                                          stroke="currentColor" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        <span>{nestedReply.likes}</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}