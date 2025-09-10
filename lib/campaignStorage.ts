export interface Campaign {
  id: string
  publicKey: string
  name: string
  description: string
  coverPhoto?: string
  creator: string
  creatorDisplayName?: string
  targetAmount: number
  raisedAmount: number
  tokenPrice: number
  tokenName?: string
  tokenSymbol?: string
  tokenMint?: string // Token mint address for launched tokens
  totalSupply?: string
  tokenIcon?: string
  marketCap: number
  volume24h: number
  holders: number
  endTimestamp?: number
  duration: string
  fundingRatio: string
  conversionStrategy: string
  enableAirdrop: boolean
  enableRoadmap: boolean
  airdropConfig?: any
  roadmapConfig?: any
  attachments?: Array<{
    id: string
    name: string
    label?: string
    type: string
    size: number
    url?: string
  }>
  links?: Array<{
    id: string
    label: string
    url: string
  }>
  realTokenReserves?: number // For real blockchain campaigns
  tokenTotalSupply?: number // For real blockchain campaigns
  createdAt: number
}

export class CampaignManager {
  private static instance: CampaignManager
  private campaigns: Map<string, Campaign> = new Map()

  static getInstance(): CampaignManager {
    if (!CampaignManager.instance) {
      CampaignManager.instance = new CampaignManager()
    }
    return CampaignManager.instance
  }

  constructor() {
    this.loadFromStorage()
  }

  async createCampaign(data: {
    name: string
    description: string
    targetAmount: string
    duration: string
    fundingRatio: string
    conversionStrategy: string
    enableAirdrop: boolean
    enableRoadmap: boolean
    airdropConfig?: any
    roadmapConfig?: any
    attachments?: Array<{
      id: string
      name: string
      label?: string
      type: string
      size: number
      file?: File
    }>
    links?: Array<{
      id: string
      label: string
      url: string
    }>
    coverPhoto?: string
    tokenName?: string
    tokenSymbol?: string
    totalSupply?: string
    tokenIcon?: string
  }, creator: string, creatorDisplayName?: string): Promise<Campaign> {
    const campaignId = this.generateCampaignId()
    const now = Date.now()
    
    // Calculate end timestamp based on duration
    let endTimestamp: number | undefined
    if (data.duration !== 'no_end_date') {
      const durationDays = parseInt(data.duration)
      endTimestamp = now + (durationDays * 24 * 60 * 60 * 1000)
    }

    // Process attachments (files stored as data URLs for now)
    const processedAttachments = data.attachments?.map(att => ({
      id: att.id,
      name: att.name,
      label: att.label || att.name,
      type: att.type,
      size: att.size,
      url: '' // No URL - files handled as uploads
    }))

    // Filter out empty links
    const processedLinks = data.links?.filter(link => link.url.trim() && link.label.trim())

    const campaign: Campaign = {
      id: campaignId,
      publicKey: campaignId, // Using same ID for simplicity
      name: data.name,
      description: data.description,
      coverPhoto: data.coverPhoto, // Store the base64 data URL
      creator,
      creatorDisplayName,
      targetAmount: parseFloat(data.targetAmount),
      raisedAmount: 0,
      tokenPrice: 0.0001, // Starting price
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      totalSupply: data.totalSupply,
      tokenIcon: data.tokenIcon,
      marketCap: 0,
      volume24h: 0,
      holders: 0,
      endTimestamp,
      duration: data.duration,
      fundingRatio: data.fundingRatio,
      conversionStrategy: data.conversionStrategy,
      enableAirdrop: data.enableAirdrop,
      enableRoadmap: data.enableRoadmap,
      airdropConfig: data.airdropConfig,
      roadmapConfig: data.roadmapConfig,
      attachments: processedAttachments,
      links: processedLinks,
      createdAt: now
    }

    this.campaigns.set(campaignId, campaign)
    this.saveToStorage()
    
    return campaign
  }

  getAllCampaigns(): Campaign[] {
    return Array.from(this.campaigns.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  getCampaign(id: string): Campaign | null {
    return this.campaigns.get(id) || null
  }

  updateCampaign(id: string, updates: Partial<Campaign>): void {
    const campaign = this.campaigns.get(id)
    if (campaign) {
      const updatedCampaign = { ...campaign, ...updates }
      this.campaigns.set(id, updatedCampaign)
      this.saveToStorage()
    }
  }

  deleteCampaign(id: string): void {
    this.campaigns.delete(id)
    this.saveToStorage()
  }

  addCampaign(campaignData: any): void {
    const campaign: Campaign = {
      ...campaignData,
      publicKey: campaignData.id || campaignData.publicKey || this.generateCampaignId()
    }
    this.campaigns.set(campaign.id, campaign)
    this.saveToStorage()
  }

  private generateCampaignId(): string {
    return `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_campaigns', JSON.stringify(Array.from(this.campaigns.entries())))
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const campaignsData = localStorage.getItem('user_campaigns')
      if (campaignsData) {
        this.campaigns = new Map(JSON.parse(campaignsData))
      }
    }
  }
}

// Singleton instance
export const campaignManager = CampaignManager.getInstance()