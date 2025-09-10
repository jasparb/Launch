import { PlatformUser } from './platformWallet'

// OAuth configuration for social platforms
const OAUTH_CONFIG = {
  twitter: {
    clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || 'demo_client_id',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/auth/twitter/callback' || 'http://localhost:3000/auth/twitter/callback',
    scope: 'tweet.read users.read follows.read likes.read'
  },
  discord: {
    clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'demo_client_id',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/auth/discord/callback' || 'http://localhost:3000/auth/discord/callback',
    scope: 'identify guilds'
  },
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'demo_client_id',
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/auth/google/callback' || 'http://localhost:3000/auth/google/callback',
    scope: 'openid profile email'
  }
}

export interface SocialConnection {
  platform: 'twitter' | 'discord' | 'google' | 'instagram' | 'telegram'
  userId: string
  username: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
  connectedAt: number
}

export interface TaskVerificationResult {
  success: boolean
  message: string
  proof?: any
  error?: string
}

export class SocialVerificationManager {
  private connections: Map<string, SocialConnection[]> = new Map()

  // Initialize OAuth flow for a platform
  initiateOAuth(platform: 'twitter' | 'discord' | 'google', userId: string): string {
    const config = OAUTH_CONFIG[platform]
    const state = btoa(JSON.stringify({ userId, platform, timestamp: Date.now() }))
    
    switch (platform) {
      case 'twitter':
        return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${encodeURIComponent(config.scope)}&state=${state}&code_challenge=challenge&code_challenge_method=plain`
      
      case 'discord':
        return `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=${encodeURIComponent(config.scope)}&state=${state}`
      
      case 'google':
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=${encodeURIComponent(config.scope)}&state=${state}`
      
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  // Handle OAuth callback and store connection
  async handleOAuthCallback(platform: string, code: string, state: string): Promise<SocialConnection> {
    const stateData = JSON.parse(atob(state))
    
    // Exchange code for access token (would use actual API calls in production)
    const mockToken = await this.exchangeCodeForToken(platform, code)
    
    const connection: SocialConnection = {
      platform: platform as any,
      userId: stateData.userId,
      username: mockToken.username,
      accessToken: mockToken.accessToken,
      refreshToken: mockToken.refreshToken,
      expiresAt: Date.now() + (mockToken.expiresIn * 1000),
      connectedAt: Date.now()
    }

    // Store connection
    const userConnections = this.connections.get(stateData.userId) || []
    const existingIndex = userConnections.findIndex(conn => conn.platform === platform)
    
    if (existingIndex >= 0) {
      userConnections[existingIndex] = connection
    } else {
      userConnections.push(connection)
    }
    
    this.connections.set(stateData.userId, userConnections)
    
    return connection
  }

  // Mock token exchange (would be real API calls in production)
  private async exchangeCodeForToken(platform: string, code: string) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      accessToken: `${platform}_access_${code}_${Date.now()}`,
      refreshToken: `${platform}_refresh_${code}_${Date.now()}`,
      expiresIn: 3600,
      username: `user_${platform}_${Math.random().toString(36).substring(7)}`
    }
  }

  // Get user's social connections
  getUserConnections(userId: string): SocialConnection[] {
    return this.connections.get(userId) || []
  }

  // Check if user has connected a specific platform
  hasConnection(userId: string, platform: string): boolean {
    const connections = this.getUserConnections(userId)
    return connections.some(conn => conn.platform === platform && conn.expiresAt > Date.now())
  }

  // Verify Twitter follow task
  async verifyTwitterFollow(userId: string, targetUsername: string): Promise<TaskVerificationResult> {
    const connection = this.getUserConnections(userId).find(conn => conn.platform === 'twitter')
    
    if (!connection) {
      return {
        success: false,
        message: 'Twitter account not connected. Please connect your Twitter account first.',
        error: 'NO_CONNECTION'
      }
    }

    try {
      // In production, make actual Twitter API call
      const isFollowing = await this.checkTwitterFollow(connection.accessToken, targetUsername)
      
      if (isFollowing) {
        return {
          success: true,
          message: `Successfully verified that you follow @${targetUsername}`,
          proof: {
            platform: 'twitter',
            action: 'follow',
            target: targetUsername,
            verifiedAt: Date.now(),
            username: connection.username
          }
        }
      } else {
        return {
          success: false,
          message: `You must follow @${targetUsername} to complete this task`,
          error: 'NOT_FOLLOWING'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify Twitter follow. Please try again.',
        error: 'VERIFICATION_FAILED'
      }
    }
  }

  // Verify Twitter retweet task
  async verifyTwitterRetweet(userId: string, tweetUrl: string): Promise<TaskVerificationResult> {
    const connection = this.getUserConnections(userId).find(conn => conn.platform === 'twitter')
    
    if (!connection) {
      return {
        success: false,
        message: 'Twitter account not connected',
        error: 'NO_CONNECTION'
      }
    }

    try {
      const tweetId = this.extractTweetId(tweetUrl)
      const hasRetweeted = await this.checkTwitterRetweet(connection.accessToken, tweetId)
      
      if (hasRetweeted) {
        return {
          success: true,
          message: 'Successfully verified your retweet',
          proof: {
            platform: 'twitter',
            action: 'retweet',
            target: tweetUrl,
            verifiedAt: Date.now(),
            username: connection.username
          }
        }
      } else {
        return {
          success: false,
          message: 'You must retweet the post to complete this task',
          error: 'NOT_RETWEETED'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify retweet. Please try again.',
        error: 'VERIFICATION_FAILED'
      }
    }
  }

  // Verify Discord server join
  async verifyDiscordJoin(userId: string, serverId: string): Promise<TaskVerificationResult> {
    const connection = this.getUserConnections(userId).find(conn => conn.platform === 'discord')
    
    if (!connection) {
      return {
        success: false,
        message: 'Discord account not connected',
        error: 'NO_CONNECTION'
      }
    }

    try {
      const isMember = await this.checkDiscordMembership(connection.accessToken, serverId)
      
      if (isMember) {
        return {
          success: true,
          message: 'Successfully verified Discord server membership',
          proof: {
            platform: 'discord',
            action: 'join',
            target: serverId,
            verifiedAt: Date.now(),
            username: connection.username
          }
        }
      } else {
        return {
          success: false,
          message: 'You must join the Discord server to complete this task',
          error: 'NOT_MEMBER'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify Discord membership. Please try again.',
        error: 'VERIFICATION_FAILED'
      }
    }
  }

  // Verify website visit (using session tracking)
  async verifyWebsiteVisit(userId: string, websiteUrl: string): Promise<TaskVerificationResult> {
    // For website visits, we can use referrer tracking or session tokens
    const visitKey = `visit_${userId}_${btoa(websiteUrl)}`
    const hasVisited = localStorage.getItem(visitKey)
    
    if (hasVisited) {
      const visitData = JSON.parse(hasVisited)
      if (Date.now() - visitData.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
        return {
          success: true,
          message: 'Website visit verified',
          proof: {
            platform: 'website',
            action: 'visit',
            target: websiteUrl,
            verifiedAt: visitData.timestamp
          }
        }
      }
    }

    return {
      success: false,
      message: 'Website visit not detected. Please visit the website and try again.',
      error: 'NO_VISIT'
    }
  }

  // Register website visit
  registerWebsiteVisit(userId: string, websiteUrl: string): void {
    const visitKey = `visit_${userId}_${btoa(websiteUrl)}`
    const visitData = {
      timestamp: Date.now(),
      url: websiteUrl,
      userId: userId
    }
    localStorage.setItem(visitKey, JSON.stringify(visitData))
  }

  // Helper methods for API calls (mock implementations)
  private async checkTwitterFollow(accessToken: string, targetUsername: string): Promise<boolean> {
    // Mock implementation - would make actual Twitter API call
    await new Promise(resolve => setTimeout(resolve, 500))
    return Math.random() > 0.3 // 70% success rate for demo
  }

  private async checkTwitterRetweet(accessToken: string, tweetId: string): Promise<boolean> {
    // Mock implementation - would make actual Twitter API call
    await new Promise(resolve => setTimeout(resolve, 500))
    return Math.random() > 0.3
  }

  private async checkDiscordMembership(accessToken: string, serverId: string): Promise<boolean> {
    // Mock implementation - would make actual Discord API call
    await new Promise(resolve => setTimeout(resolve, 500))
    return Math.random() > 0.3
  }

  private extractTweetId(tweetUrl: string): string {
    const match = tweetUrl.match(/status\/(\d+)/)
    return match ? match[1] : ''
  }
}

// Singleton instance
export const socialVerification = new SocialVerificationManager()

// Social verification utilities
export const socialUtils = {
  // Create verification link for a task
  createVerificationLink(taskType: string, verificationData: string, userId: string): string {
    switch (taskType) {
      case 'TwitterFollow':
        return `https://twitter.com/${verificationData.replace('@', '')}`
      case 'TwitterRetweet':
      case 'TwitterLike':
        return verificationData
      case 'DiscordJoin':
        return verificationData
      case 'TelegramJoin':
        return verificationData
      case 'InstagramFollow':
        return `https://instagram.com/${verificationData.replace('@', '')}`
      case 'WebsiteVisit':
        // Add tracking parameter
        const url = new URL(verificationData)
        url.searchParams.set('ref', 'launch_fund')
        url.searchParams.set('user', userId)
        return url.toString()
      default:
        return verificationData
    }
  },

  // Get human-readable platform name
  getPlatformName(platform: string): string {
    const names: { [key: string]: string } = {
      twitter: 'Twitter',
      discord: 'Discord',
      telegram: 'Telegram',
      instagram: 'Instagram',
      google: 'Google'
    }
    return names[platform] || platform
  },

  // Check if task requires OAuth
  requiresOAuth(taskType: string): boolean {
    return ['TwitterFollow', 'TwitterRetweet', 'TwitterLike', 'DiscordJoin'].includes(taskType)
  },

  // Get required platform for task
  getRequiredPlatform(taskType: string): string | null {
    const platforms: { [key: string]: string } = {
      TwitterFollow: 'twitter',
      TwitterRetweet: 'twitter',
      TwitterLike: 'twitter',
      DiscordJoin: 'discord'
    }
    return platforms[taskType] || null
  }
}