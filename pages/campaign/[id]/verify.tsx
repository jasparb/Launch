import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWallet } from '@solana/wallet-adapter-react'
import { taskSubmissions, TaskSubmission } from '../../../lib/taskSubmissions'
import { airdropDistributor } from '../../../lib/airdropTokenDistribution'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PhotoIcon,
  LinkIcon,
  DocumentTextIcon,
  KeyIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function CreatorVerificationDashboard() {
  const router = useRouter()
  const { id: campaignId } = router.query
  const { publicKey } = useWallet()
  
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<TaskSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    todaySubmissions: 0,
    approvalRate: 0
  })
  const [distributionStats, setDistributionStats] = useState({
    totalDistributed: 0,
    totalPending: 0,
    totalFailed: 0,
    totalUsers: 0,
    averageAmount: 0
  })
  const [isDistributing, setIsDistributing] = useState(false)

  useEffect(() => {
    if (campaignId && typeof campaignId === 'string') {
      loadSubmissions()
      loadStats()
    }
  }, [campaignId, filter])

  useEffect(() => {
    // Apply search filter
    let filtered = submissions
    
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.userId.includes(searchTerm)
      )
    }
    
    setFilteredSubmissions(filtered)
  }, [submissions, searchTerm])

  const loadSubmissions = () => {
    if (!campaignId || typeof campaignId !== 'string') return
    
    const statusFilter = filter === 'all' ? undefined : filter
    const subs = taskSubmissions.getSubmissionsForCampaign(campaignId, { status: statusFilter })
    setSubmissions(subs)
  }

  const loadStats = () => {
    if (!campaignId || typeof campaignId !== 'string') return
    
    const campaignStats = taskSubmissions.getStats(campaignId)
    setStats(campaignStats)
    
    // Load distribution stats
    const distStats = airdropDistributor.getDistributionStats(campaignId)
    setDistributionStats(distStats)
  }

  const handleReview = async (submissionId: string, decision: 'approved' | 'rejected', notes?: string) => {
    if (!publicKey) {
      alert('Please connect your wallet to review submissions')
      return
    }

    setIsReviewing(true)
    
    try {
      if (decision === 'approved') {
        // Use enhanced approval with immediate token distribution
        const result = await airdropDistributor.approveAndDistribute(
          submissionId,
          publicKey.toString(),
          notes
        )
        
        if (result.error) {
          console.warn('Token distribution failed:', result.error)
          alert(`Submission approved but token distribution failed: ${result.error}`)
        } else {
          alert(`Submission approved and tokens distributed!`)
        }
      } else {
        // Regular rejection without token distribution
        await taskSubmissions.reviewSubmission(
          submissionId,
          decision,
          publicKey.toString(),
          notes
        )
        alert(`Submission ${decision}!`)
      }
      
      // Reload submissions and stats
      loadSubmissions()
      loadStats()
      
      // Clear selection
      setSelectedSubmission(null)
      setSelectedIds([])
      
    } catch (error) {
      console.error('Review error:', error)
      alert('Failed to review submission')
    } finally {
      setIsReviewing(false)
    }
  }

  const handleBatchReview = async (decision: 'approved' | 'rejected') => {
    if (!publicKey) {
      alert('Please connect your wallet to review submissions')
      return
    }

    if (selectedIds.length === 0) {
      alert('Please select submissions to review')
      return
    }

    const confirmMessage = `Are you sure you want to ${decision === 'approved' ? 'approve' : 'reject'} ${selectedIds.length} submissions?`
    if (!confirm(confirmMessage)) return

    setIsReviewing(true)
    
    try {
      if (decision === 'approved') {
        // Batch approve with token distribution
        let successful = 0
        let failed = 0
        const errors: string[] = []
        
        for (const submissionId of selectedIds) {
          try {
            const result = await airdropDistributor.approveAndDistribute(
              submissionId,
              publicKey.toString(),
              `Batch approval`
            )
            
            if (result.error) {
              failed++
              errors.push(`${submissionId}: ${result.error}`)
            } else {
              successful++
            }
          } catch (error) {
            failed++
            errors.push(`${submissionId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
        
        if (errors.length > 0) {
          console.warn('Batch distribution errors:', errors)
          alert(`Batch complete: ${successful} successful, ${failed} failed. Check console for details.`)
        } else {
          alert(`${selectedIds.length} submissions approved and tokens distributed!`)
        }
      } else {
        // Regular batch rejection
        await taskSubmissions.batchReview(
          selectedIds,
          decision,
          publicKey.toString(),
          `Batch ${decision}`
        )
        alert(`${selectedIds.length} submissions ${decision}!`)
      }
      
      // Reload
      loadSubmissions()
      loadStats()
      setSelectedIds([])
      
    } catch (error) {
      console.error('Batch review error:', error)
      alert('Failed to batch review submissions')
    } finally {
      setIsReviewing(false)
    }
  }

  const handleBulkDistribution = async () => {
    if (!publicKey) {
      alert('Please connect your wallet')
      return
    }

    if (!campaignId || typeof campaignId !== 'string') return

    const confirmMessage = 'Process all approved submissions for token distribution?'
    if (!confirm(confirmMessage)) return

    setIsDistributing(true)

    try {
      const result = await airdropDistributor.processApprovedSubmissions(campaignId)
      
      const message = `Distribution complete: ${result.successful} successful, ${result.failed} failed`
      if (result.errors.length > 0) {
        console.warn('Distribution errors:', result.errors)
        alert(message + '. Check console for details.')
      } else {
        alert(message)
      }
      
      loadStats()
    } catch (error) {
      console.error('Bulk distribution error:', error)
      alert('Failed to process distributions')
    } finally {
      setIsDistributing(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === filteredSubmissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubmissions.map(s => s.id))
    }
  }

  const getProofIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <PhotoIcon className="w-5 h-5" />
      case 'link': return <LinkIcon className="w-5 h-5" />
      case 'text': return <DocumentTextIcon className="w-5 h-5" />
      case 'code': return <KeyIcon className="w-5 h-5" />
      default: return null
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/campaign/${campaignId}`)}
                className="text-white hover:text-purple-400 transition-colors"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-white">Verification Dashboard</h1>
            </div>
            
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-white font-semibold">{stats.pending}</div>
                <div className="text-gray-400">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-semibold">{stats.approved}</div>
                <div className="text-gray-400">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-semibold">{stats.rejected}</div>
                <div className="text-gray-400">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-semibold">{stats.approvalRate.toFixed(0)}%</div>
                <div className="text-gray-400">Approval Rate</div>
              </div>
              <div className="border-l border-white/20 pl-4 ml-2">
                <div className="text-center">
                  <div className="text-yellow-400 font-semibold">{distributionStats.totalDistributed.toLocaleString()}</div>
                  <div className="text-gray-400">Tokens Sent</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-semibold">{distributionStats.totalUsers}</div>
                <div className="text-gray-400">Recipients</div>
              </div>
              {distributionStats.totalFailed > 0 && (
                <div className="text-center">
                  <div className="text-orange-400 font-semibold">{distributionStats.totalFailed}</div>
                  <div className="text-gray-400">Failed</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters and Search */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="flex flex-wrap gap-4">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filter === status
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by user or task..."
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Batch Actions */}
              {filter === 'pending' && selectedIds.length > 0 && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleBatchReview('approved')}
                    disabled={isReviewing}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                  >
                    Approve {selectedIds.length} Selected
                  </button>
                  <button
                    onClick={() => handleBatchReview('rejected')}
                    disabled={isReviewing}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                  >
                    Reject {selectedIds.length} Selected
                  </button>
                </div>
              )}

              {/* Bulk Distribution */}
              {(stats.approved > distributionStats.totalUsers || distributionStats.totalFailed > 0) && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleBulkDistribution}
                    disabled={isDistributing}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                  >
                    {isDistributing ? 'Processing...' : `🚀 Distribute Tokens to Approved Users`}
                  </button>
                  {distributionStats.totalFailed > 0 && (
                    <button
                      onClick={() => airdropDistributor.retryFailedDistributions(campaignId as string)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all"
                    >
                      Retry {distributionStats.totalFailed} Failed
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Submissions */}
            <div className="space-y-3">
              {filter === 'pending' && (
                <div className="flex items-center gap-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-400"
                  />
                  <span className="text-sm text-gray-300">Select All</span>
                </div>
              )}

              {filteredSubmissions.map(submission => (
                <div
                  key={submission.id}
                  className={`bg-white/10 backdrop-blur-md rounded-lg border transition-all cursor-pointer ${
                    selectedSubmission?.id === submission.id
                      ? 'border-purple-400 ring-2 ring-purple-400/50'
                      : 'border-white/20 hover:border-white/30'
                  }`}
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {filter === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(submission.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelection(submission.id)
                          }}
                          className="mt-1 rounded border-gray-400"
                        />
                      )}

                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-white">{submission.taskName}</h3>
                            <p className="text-sm text-gray-300">by {submission.userName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getProofIcon(submission.proof.type)}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              submission.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : submission.status === 'approved'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {submission.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">
                            {formatTime(submission.submittedAt)}
                          </span>
                          <span className="text-purple-300 font-medium">
                            +{submission.rewardAmount} {submission.tokenSymbol}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No submissions found
                </div>
              )}
            </div>
          </div>

          {/* Submission Detail */}
          <div className="lg:col-span-1">
            {selectedSubmission ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 sticky top-4">
                <div className="p-6 border-b border-white/20">
                  <h2 className="text-lg font-bold text-white mb-1">Submission Details</h2>
                  <p className="text-sm text-gray-300">{selectedSubmission.taskName}</p>
                </div>

                <div className="p-6 space-y-4">
                  {/* User Info */}
                  <div>
                    <label className="text-sm text-gray-400">User</label>
                    <p className="text-white">{selectedSubmission.userName}</p>
                    <p className="text-xs text-gray-400">{selectedSubmission.userId}</p>
                  </div>

                  {/* Proof */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Proof</label>
                    {selectedSubmission.proof.type === 'screenshot' && selectedSubmission.proof.imageUrl ? (
                      <img
                        src={selectedSubmission.proof.imageUrl}
                        alt="Proof screenshot"
                        className="w-full rounded-lg border border-white/20"
                      />
                    ) : selectedSubmission.proof.type === 'link' ? (
                      <a
                        href={selectedSubmission.proof.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline break-all"
                      >
                        {selectedSubmission.proof.content}
                      </a>
                    ) : (
                      <p className="text-white bg-white/5 p-3 rounded-lg break-all">
                        {selectedSubmission.proof.content}
                      </p>
                    )}
                  </div>

                  {/* Additional Notes */}
                  {selectedSubmission.proof.additionalNotes && (
                    <div>
                      <label className="text-sm text-gray-400">Additional Notes</label>
                      <p className="text-white bg-white/5 p-3 rounded-lg">
                        {selectedSubmission.proof.additionalNotes}
                      </p>
                    </div>
                  )}

                  {/* Reward */}
                  <div>
                    <label className="text-sm text-gray-400">Reward</label>
                    <p className="text-purple-300 font-semibold">
                      {selectedSubmission.rewardAmount} {selectedSubmission.tokenSymbol}
                    </p>
                  </div>

                  {/* Review Notes */}
                  {selectedSubmission.reviewNotes && (
                    <div>
                      <label className="text-sm text-gray-400">Review Notes</label>
                      <p className="text-white bg-white/5 p-3 rounded-lg">
                        {selectedSubmission.reviewNotes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedSubmission.status === 'pending' && (
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => handleReview(selectedSubmission.id, 'approved')}
                        disabled={isReviewing}
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Rejection reason (optional):')
                          if (notes !== null) {
                            handleReview(selectedSubmission.id, 'rejected', notes || undefined)
                          }
                        }}
                        disabled={isReviewing}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <XCircleIcon className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300">Select a submission to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}