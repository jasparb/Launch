// Project Script Access Control System
export interface ProjectScript {
  id: string
  name: string
  description: string
  filePath: string
  requiredTasks: string[]
  accessLevel: 'free' | 'verified' | 'premium'
  downloadCount: number
  version: string
  checksum: string
  createdAt: number
  updatedAt: number
}

export interface UserAccess {
  userId: string
  scriptId: string
  granted: boolean
  grantedAt: number
  grantedBy: string
  completedTasks: string[]
  accessLevel: 'free' | 'verified' | 'premium'
}

class ProjectScriptAccessManager {
  private scripts: Map<string, ProjectScript> = new Map()
  private userAccess: Map<string, UserAccess[]> = new Map()
  private storageKey = 'project_script_access'
  private scriptsKey = 'project_scripts'

  constructor() {
    this.loadData()
    this.initializeDefaultScripts()
  }

  private loadData() {
    if (typeof window !== 'undefined') {
      // Load scripts
      const scriptsData = localStorage.getItem(this.scriptsKey)
      if (scriptsData) {
        const parsed = JSON.parse(scriptsData)
        this.scripts = new Map(Object.entries(parsed))
      }

      // Load user access
      const accessData = localStorage.getItem(this.storageKey)
      if (accessData) {
        const parsed = JSON.parse(accessData)
        Object.entries(parsed).forEach(([userId, access]) => {
          this.userAccess.set(userId, access as UserAccess[])
        })
      }
    }
  }

  private saveData() {
    if (typeof window !== 'undefined') {
      // Save scripts
      const scriptsObj = Object.fromEntries(this.scripts.entries())
      localStorage.setItem(this.scriptsKey, JSON.stringify(scriptsObj))

      // Save user access
      const accessObj = Object.fromEntries(this.userAccess.entries())
      localStorage.setItem(this.storageKey, JSON.stringify(accessObj))
    }
  }

  private initializeDefaultScripts() {
    if (this.scripts.size === 0) {
      // Add some default project scripts
      this.addScript({
        id: 'launch-fund-setup',
        name: 'Launch.fund Setup Script',
        description: 'Complete setup automation for Launch.fund platform including Solana configuration and dependencies',
        filePath: '/scripts/launch-fund-setup.sh',
        requiredTasks: ['wallet-connection', 'social-follow'],
        accessLevel: 'free',
        downloadCount: 0,
        version: '1.0.0',
        checksum: 'sha256:abcd1234...',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      this.addScript({
        id: 'advanced-solana-tools',
        name: 'Advanced Solana Development Tools',
        description: 'Premium collection of Solana development utilities and testing frameworks',
        filePath: '/scripts/solana-dev-tools.zip',
        requiredTasks: ['campaign-creation', 'token-minting', 'community-engagement'],
        accessLevel: 'verified',
        downloadCount: 0,
        version: '2.1.0',
        checksum: 'sha256:efgh5678...',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      this.addScript({
        id: 'enterprise-blockchain-suite',
        name: 'Enterprise Blockchain Suite',
        description: 'Full enterprise-grade blockchain development and deployment suite',
        filePath: '/scripts/enterprise-suite.tar.gz',
        requiredTasks: ['kyc-verification', 'enterprise-tasks', 'advanced-testing'],
        accessLevel: 'premium',
        downloadCount: 0,
        version: '3.0.0',
        checksum: 'sha256:ijkl9012...',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
  }

  addScript(script: Omit<ProjectScript, 'id' | 'createdAt' | 'updatedAt'> & { id: string }): void {
    const newScript: ProjectScript = {
      ...script,
      createdAt: script.createdAt || Date.now(),
      updatedAt: Date.now()
    }
    
    this.scripts.set(script.id, newScript)
    this.saveData()
  }

  updateScript(scriptId: string, updates: Partial<ProjectScript>): boolean {
    const script = this.scripts.get(scriptId)
    if (!script) return false

    const updatedScript = {
      ...script,
      ...updates,
      updatedAt: Date.now()
    }

    this.scripts.set(scriptId, updatedScript)
    this.saveData()
    return true
  }

  getAllScripts(): ProjectScript[] {
    return Array.from(this.scripts.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  getScript(scriptId: string): ProjectScript | null {
    return this.scripts.get(scriptId) || null
  }

  // Check if user has access to a specific script
  checkAccess(userId: string, scriptId: string): {
    hasAccess: boolean
    reason?: string
    missingTasks?: string[]
    completedTasks?: string[]
  } {
    const script = this.scripts.get(scriptId)
    if (!script) {
      return { hasAccess: false, reason: 'Script not found' }
    }

    const userAccessList = this.userAccess.get(userId) || []
    const existingAccess = userAccessList.find(a => a.scriptId === scriptId)

    // If user has explicit access grant
    if (existingAccess?.granted) {
      return { hasAccess: true, completedTasks: existingAccess.completedTasks }
    }

    // Check if it's a free script
    if (script.accessLevel === 'free') {
      return { hasAccess: true, reason: 'Free access' }
    }

    // Check task completion requirements
    const completedTasks = this.getCompletedTasksForUser(userId)
    const missingTasks = script.requiredTasks.filter(task => !completedTasks.includes(task))

    if (missingTasks.length === 0) {
      // Auto-grant access if all tasks are completed
      this.grantAccess(userId, scriptId, 'system', completedTasks)
      return { hasAccess: true, completedTasks }
    }

    return {
      hasAccess: false,
      reason: 'Incomplete tasks',
      missingTasks,
      completedTasks
    }
  }

  // Get completed tasks for a user (integrates with task submission system)
  private getCompletedTasksForUser(userId: string): string[] {
    if (typeof window !== 'undefined') {
      // Import task submissions dynamically to avoid circular dependency
      const taskSubmissionsData = localStorage.getItem('task_submissions')
      if (taskSubmissionsData) {
        try {
          const data = JSON.parse(taskSubmissionsData)
          let approvedTasks: string[] = []
          
          // Get all approved submissions for this user across all campaigns
          Object.values(data.campaigns || {}).forEach((submissions: any[]) => {
            submissions.forEach(submission => {
              if (submission.userId === userId && submission.status === 'approved') {
                // Convert task names to script-compatible task IDs
                const taskId = this.convertTaskNameToId(submission.taskName, submission.taskType)
                if (taskId && !approvedTasks.includes(taskId)) {
                  approvedTasks.push(taskId)
                }
              }
            })
          })
          
          // Also check for manual task completions
          const manualTasks = localStorage.getItem(`completed_tasks_${userId}`)
          if (manualTasks) {
            const manual = JSON.parse(manualTasks)
            approvedTasks = [...new Set([...approvedTasks, ...manual])]
          }
          
          return approvedTasks
        } catch (error) {
          console.error('Error reading task submissions:', error)
        }
      }
      
      // Fallback to manual task completions
      const completedTasks = localStorage.getItem(`completed_tasks_${userId}`)
      return completedTasks ? JSON.parse(completedTasks) : []
    }
    return []
  }

  // Convert task names from submissions to script-compatible task IDs
  private convertTaskNameToId(taskName: string, taskType: string): string | null {
    const taskLower = taskName.toLowerCase()
    
    // Map common task names to script requirements
    if (taskLower.includes('wallet') || taskLower.includes('connect')) {
      return 'wallet-connection'
    }
    
    if (taskLower.includes('social') || taskLower.includes('follow') || taskLower.includes('twitter')) {
      return 'social-follow'
    }
    
    if (taskLower.includes('campaign') || taskLower.includes('create')) {
      return 'campaign-creation'
    }
    
    if (taskLower.includes('token') || taskLower.includes('mint')) {
      return 'token-minting'
    }
    
    if (taskLower.includes('community') || taskLower.includes('engage')) {
      return 'community-engagement'
    }
    
    if (taskLower.includes('kyc') || taskLower.includes('verification')) {
      return 'kyc-verification'
    }
    
    if (taskLower.includes('enterprise') || taskLower.includes('business')) {
      return 'enterprise-tasks'
    }
    
    if (taskLower.includes('test') || taskLower.includes('advanced')) {
      return 'advanced-testing'
    }
    
    // Default: use the task name as kebab-case
    return taskName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  // Mark a task as completed for a user
  markTaskCompleted(userId: string, taskId: string): void {
    if (typeof window !== 'undefined') {
      const completedTasks = this.getCompletedTasksForUser(userId)
      if (!completedTasks.includes(taskId)) {
        completedTasks.push(taskId)
        localStorage.setItem(`completed_tasks_${userId}`, JSON.stringify(completedTasks))
      }
    }
  }

  // Grant access to a user
  grantAccess(userId: string, scriptId: string, grantedBy: string, completedTasks: string[]): boolean {
    const script = this.scripts.get(scriptId)
    if (!script) return false

    let userAccessList = this.userAccess.get(userId) || []
    
    // Remove existing access record for this script
    userAccessList = userAccessList.filter(a => a.scriptId !== scriptId)
    
    // Add new access record
    const access: UserAccess = {
      userId,
      scriptId,
      granted: true,
      grantedAt: Date.now(),
      grantedBy,
      completedTasks,
      accessLevel: script.accessLevel
    }

    userAccessList.push(access)
    this.userAccess.set(userId, userAccessList)
    this.saveData()
    return true
  }

  // Revoke access from a user
  revokeAccess(userId: string, scriptId: string): boolean {
    const userAccessList = this.userAccess.get(userId)
    if (!userAccessList) return false

    const filteredAccess = userAccessList.filter(a => a.scriptId !== scriptId)
    
    if (filteredAccess.length === userAccessList.length) return false // No access to revoke

    this.userAccess.set(userId, filteredAccess)
    this.saveData()
    return true
  }

  // Get all access records for a user
  getUserAccess(userId: string): UserAccess[] {
    return this.userAccess.get(userId) || []
  }

  // Get all users who have access to a specific script
  getScriptUsers(scriptId: string): UserAccess[] {
    const users: UserAccess[] = []
    this.userAccess.forEach((accessList) => {
      const scriptAccess = accessList.find(a => a.scriptId === scriptId && a.granted)
      if (scriptAccess) {
        users.push(scriptAccess)
      }
    })
    return users
  }

  // Increment download count
  recordDownload(scriptId: string): void {
    const script = this.scripts.get(scriptId)
    if (script) {
      script.downloadCount++
      script.updatedAt = Date.now()
      this.scripts.set(scriptId, script)
      this.saveData()
    }
  }

  // Get scripts accessible to a user
  getAccessibleScripts(userId: string): Array<ProjectScript & { accessStatus: 'granted' | 'available' | 'locked', missingTasks?: string[] }> {
    return this.getAllScripts().map(script => {
      const access = this.checkAccess(userId, script.id)
      return {
        ...script,
        accessStatus: access.hasAccess ? 'granted' : (script.accessLevel === 'free' ? 'available' : 'locked'),
        missingTasks: access.missingTasks
      }
    })
  }

  // Admin functions
  getStats() {
    const scripts = this.getAllScripts()
    const totalDownloads = scripts.reduce((sum, script) => sum + script.downloadCount, 0)
    const totalUsers = this.userAccess.size
    const scriptsWithAccess = scripts.map(script => ({
      ...script,
      userCount: this.getScriptUsers(script.id).length
    }))

    return {
      totalScripts: scripts.length,
      totalDownloads,
      totalUsers,
      scriptsByLevel: {
        free: scripts.filter(s => s.accessLevel === 'free').length,
        verified: scripts.filter(s => s.accessLevel === 'verified').length,
        premium: scripts.filter(s => s.accessLevel === 'premium').length
      },
      scriptsWithAccess
    }
  }
}

export const projectScriptAccess = new ProjectScriptAccessManager()