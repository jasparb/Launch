// Task Submission Management System

export interface TaskSubmission {
  id: string
  campaignId: string
  taskId: number
  taskName: string
  taskType: string
  userId: string
  userName: string
  userWallet?: string
  submittedAt: number
  proof: {
    type: 'link' | 'screenshot' | 'text' | 'code'
    content: string
    imageUrl?: string
    additionalNotes?: string
  }
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: number
  reviewedBy?: string
  reviewNotes?: string
  rewardAmount: number
  tokenSymbol: string
}

export interface SubmissionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  todaySubmissions: number
  avgReviewTime: number
  approvalRate: number
}

class TaskSubmissionManager {
  private submissions: Map<string, TaskSubmission[]> = new Map()
  private submissionById: Map<string, TaskSubmission> = new Map()

  // Create a new submission
  async createSubmission(data: {
    campaignId: string
    taskId: number
    taskName: string
    taskType: string
    userId: string
    userName: string
    userWallet?: string
    proof: TaskSubmission['proof']
    rewardAmount: number
    tokenSymbol: string
  }): Promise<TaskSubmission> {
    const submission: TaskSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      campaignId: data.campaignId,
      taskId: data.taskId,
      taskName: data.taskName,
      taskType: data.taskType,
      userId: data.userId,
      userName: data.userName,
      userWallet: data.userWallet,
      submittedAt: Date.now(),
      proof: data.proof,
      status: 'pending',
      rewardAmount: data.rewardAmount,
      tokenSymbol: data.tokenSymbol
    }

    // Store submission
    const campaignSubmissions = this.submissions.get(data.campaignId) || []
    campaignSubmissions.push(submission)
    this.submissions.set(data.campaignId, campaignSubmissions)
    this.submissionById.set(submission.id, submission)

    // Store in localStorage for persistence
    this.saveToLocalStorage()

    return submission
  }

  // Get submissions for a campaign
  getSubmissionsForCampaign(campaignId: string, filter?: {
    status?: 'pending' | 'approved' | 'rejected'
    taskId?: number
    userId?: string
  }): TaskSubmission[] {
    let submissions = this.submissions.get(campaignId) || []

    if (filter) {
      if (filter.status) {
        submissions = submissions.filter(s => s.status === filter.status)
      }
      if (filter.taskId !== undefined) {
        submissions = submissions.filter(s => s.taskId === filter.taskId)
      }
      if (filter.userId) {
        submissions = submissions.filter(s => s.userId === filter.userId)
      }
    }

    // Sort by submission time (newest first for pending, oldest first for review)
    return submissions.sort((a, b) => {
      if (filter?.status === 'pending') {
        return a.submittedAt - b.submittedAt // Oldest first for review
      }
      return b.submittedAt - a.submittedAt // Newest first otherwise
    })
  }

  // Get submission by ID
  getSubmissionById(submissionId: string): TaskSubmission | undefined {
    return this.submissionById.get(submissionId)
  }

  // Review a submission (approve/reject)
  async reviewSubmission(
    submissionId: string,
    decision: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): Promise<TaskSubmission | null> {
    const submission = this.submissionById.get(submissionId)
    if (!submission) return null

    submission.status = decision
    submission.reviewedAt = Date.now()
    submission.reviewedBy = reviewerId
    submission.reviewNotes = notes

    // Update in storage
    this.submissionById.set(submissionId, submission)
    const campaignSubmissions = this.submissions.get(submission.campaignId) || []
    const index = campaignSubmissions.findIndex(s => s.id === submissionId)
    if (index !== -1) {
      campaignSubmissions[index] = submission
      this.submissions.set(submission.campaignId, campaignSubmissions)
    }

    this.saveToLocalStorage()
    return submission
  }

  // Batch review submissions
  async batchReview(
    submissionIds: string[],
    decision: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): Promise<TaskSubmission[]> {
    const reviewed: TaskSubmission[] = []

    for (const id of submissionIds) {
      const result = await this.reviewSubmission(id, decision, reviewerId, notes)
      if (result) reviewed.push(result)
    }

    return reviewed
  }

  // Get statistics for a campaign
  getStats(campaignId: string): SubmissionStats {
    const submissions = this.submissions.get(campaignId) || []
    const now = Date.now()
    const dayAgo = now - (24 * 60 * 60 * 1000)

    const pending = submissions.filter(s => s.status === 'pending').length
    const approved = submissions.filter(s => s.status === 'approved').length
    const rejected = submissions.filter(s => s.status === 'rejected').length
    const todaySubmissions = submissions.filter(s => s.submittedAt > dayAgo).length

    // Calculate average review time for reviewed submissions
    const reviewedSubmissions = submissions.filter(s => s.reviewedAt)
    const avgReviewTime = reviewedSubmissions.length > 0
      ? reviewedSubmissions.reduce((sum, s) => sum + (s.reviewedAt! - s.submittedAt), 0) / reviewedSubmissions.length
      : 0

    const approvalRate = (approved + rejected) > 0
      ? (approved / (approved + rejected)) * 100
      : 0

    return {
      total: submissions.length,
      pending,
      approved,
      rejected,
      todaySubmissions,
      avgReviewTime,
      approvalRate
    }
  }

  // Check if user has already submitted for a task
  hasUserSubmitted(campaignId: string, taskId: number, userId: string): boolean {
    const submissions = this.submissions.get(campaignId) || []
    return submissions.some(s => 
      s.taskId === taskId && 
      s.userId === userId &&
      (s.status === 'pending' || s.status === 'approved')
    )
  }

  // Get user's submission history
  getUserSubmissions(userId: string, campaignId?: string): TaskSubmission[] {
    let allSubmissions: TaskSubmission[] = []

    if (campaignId) {
      allSubmissions = this.submissions.get(campaignId) || []
    } else {
      // Get from all campaigns
      this.submissions.forEach(campaignSubmissions => {
        allSubmissions.push(...campaignSubmissions)
      })
    }

    return allSubmissions
      .filter(s => s.userId === userId)
      .sort((a, b) => b.submittedAt - a.submittedAt)
  }

  // Load from localStorage
  loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem('task_submissions')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        
        // Rebuild maps
        this.submissions.clear()
        this.submissionById.clear()

        Object.entries(data.campaigns).forEach(([campaignId, submissions]) => {
          this.submissions.set(campaignId, submissions as TaskSubmission[])
          ;(submissions as TaskSubmission[]).forEach(sub => {
            this.submissionById.set(sub.id, sub)
          })
        })
      } catch (error) {
        console.error('Failed to load submissions:', error)
      }
    }
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return

    const data = {
      campaigns: Object.fromEntries(this.submissions),
      timestamp: Date.now()
    }

    localStorage.setItem('task_submissions', JSON.stringify(data))
  }

  // Clear old submissions (cleanup)
  clearOldSubmissions(daysToKeep: number = 30): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)

    this.submissions.forEach((submissions, campaignId) => {
      const filtered = submissions.filter(s => s.submittedAt > cutoffTime)
      this.submissions.set(campaignId, filtered)
    })

    // Rebuild submissionById map
    this.submissionById.clear()
    this.submissions.forEach(submissions => {
      submissions.forEach(sub => {
        this.submissionById.set(sub.id, sub)
      })
    })

    this.saveToLocalStorage()
  }
}

// Singleton instance
export const taskSubmissions = new TaskSubmissionManager()

// Load on initialization
if (typeof window !== 'undefined') {
  taskSubmissions.loadFromLocalStorage()
}