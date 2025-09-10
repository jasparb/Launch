// Claim Code System for Non-Crypto Users
// Allows Stripe/traditional payment users to claim NFTs later

export class ClaimCodeSystem {
  private readonly CLAIM_CODES_KEY = 'access_key_claim_codes'
  private readonly USED_CODES_KEY = 'used_claim_codes'
  
  // Generate a unique, human-readable claim code
  generateClaimCode(): string {
    const prefix = 'FUNDIT'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = prefix + '-'
    
    // Generate 3 groups of 4 characters
    for (let group = 0; group < 3; group++) {
      if (group > 0) code += '-'
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    }
    
    return code // Format: FUNDIT-XXXX-XXXX-XXXX
  }
  
  // Create a claim code after Stripe payment
  createClaimCode(data: {
    campaignId: string
    campaignName: string
    customerEmail: string
    paymentIntentId: string
    amount: number
    accessKeyConfig: any
  }): { code: string; expiresAt: number } {
    const code = this.generateClaimCode()
    const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year expiry
    
    const claimData = {
      code,
      ...data,
      createdAt: Date.now(),
      expiresAt,
      claimed: false,
      claimedBy: null,
      claimedAt: null
    }
    
    // Store the claim code
    const existingCodes = this.getAllClaimCodes()
    existingCodes[code] = claimData
    localStorage.setItem(this.CLAIM_CODES_KEY, JSON.stringify(existingCodes))
    
    // Also store by email for lookup
    this.storeCodeForEmail(data.customerEmail, code)
    
    return { code, expiresAt }
  }
  
  // Store codes by email for easy lookup
  private storeCodeForEmail(email: string, code: string) {
    const emailCodesKey = `claim_codes_email_${email.toLowerCase()}`
    const existingCodes = JSON.parse(localStorage.getItem(emailCodesKey) || '[]')
    existingCodes.push({
      code,
      createdAt: Date.now()
    })
    localStorage.setItem(emailCodesKey, JSON.stringify(existingCodes))
  }
  
  // Get all claim codes (for admin/debugging)
  getAllClaimCodes(): Record<string, any> {
    return JSON.parse(localStorage.getItem(this.CLAIM_CODES_KEY) || '{}')
  }
  
  // Get codes for a specific email
  getCodesForEmail(email: string): any[] {
    const emailCodesKey = `claim_codes_email_${email.toLowerCase()}`
    const codes = JSON.parse(localStorage.getItem(emailCodesKey) || '[]')
    
    // Get full code data
    const allCodes = this.getAllClaimCodes()
    return codes.map((c: any) => allCodes[c.code]).filter(Boolean)
  }
  
  // Validate a claim code
  validateCode(code: string): {
    valid: boolean
    error?: string
    data?: any
  } {
    const allCodes = this.getAllClaimCodes()
    const claimData = allCodes[code]
    
    if (!claimData) {
      return { valid: false, error: 'Invalid code' }
    }
    
    if (claimData.claimed) {
      return { valid: false, error: 'Code already claimed' }
    }
    
    if (claimData.expiresAt < Date.now()) {
      return { valid: false, error: 'Code expired' }
    }
    
    return { valid: true, data: claimData }
  }
  
  // Redeem a claim code
  redeemCode(code: string, walletAddress: string): {
    success: boolean
    error?: string
    accessKey?: any
  } {
    const validation = this.validateCode(code)
    
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    
    const claimData = validation.data
    
    // Mark code as used
    const allCodes = this.getAllClaimCodes()
    allCodes[code] = {
      ...claimData,
      claimed: true,
      claimedBy: walletAddress,
      claimedAt: Date.now()
    }
    localStorage.setItem(this.CLAIM_CODES_KEY, JSON.stringify(allCodes))
    
    // Mint the access key for the wallet
    const tokenId = `AK_${claimData.campaignId}_${Date.now()}_${code.slice(-4)}`
    
    // Store minted key
    const mintedKeys = JSON.parse(
      localStorage.getItem(`minted_keys_${claimData.campaignId}`) || '{}'
    )
    mintedKeys[walletAddress] = {
      tokenId,
      mintedAt: Date.now(),
      campaign: claimData.campaignName,
      artwork: claimData.accessKeyConfig?.artwork,
      claimCode: code,
      paymentMethod: 'stripe'
    }
    localStorage.setItem(
      `minted_keys_${claimData.campaignId}`,
      JSON.stringify(mintedKeys)
    )
    
    // Update supply count
    const currentSupply = parseInt(
      localStorage.getItem(`access_key_supply_${claimData.campaignId}`) || '0'
    )
    localStorage.setItem(
      `access_key_supply_${claimData.campaignId}`,
      (currentSupply + 1).toString()
    )
    
    return {
      success: true,
      accessKey: {
        tokenId,
        campaignId: claimData.campaignId,
        campaignName: claimData.campaignName
      }
    }
  }
  
  // Get pending (unclaimed) codes count
  getPendingCodesCount(): number {
    const allCodes = this.getAllClaimCodes()
    return Object.values(allCodes).filter((c: any) => !c.claimed).length
  }
  
  // Check if an email has unclaimed codes
  hasUnclaimedCodes(email: string): boolean {
    const codes = this.getCodesForEmail(email)
    return codes.some(c => !c.claimed)
  }
}

export const claimCodeSystem = new ClaimCodeSystem()