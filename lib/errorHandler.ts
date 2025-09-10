// Comprehensive error handling for blockchain operations
import { WalletError } from '@solana/wallet-adapter-base'

export enum ErrorCode {
  // Wallet Errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_DISCONNECTED = 'WALLET_DISCONNECTED',
  WALLET_TIMEOUT = 'WALLET_TIMEOUT',
  WALLET_REJECTED = 'WALLET_REJECTED',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Transaction Errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SLIPPAGE_TOLERANCE_EXCEEDED = 'SLIPPAGE_TOLERANCE_EXCEEDED',
  PRICE_IMPACT_TOO_HIGH = 'PRICE_IMPACT_TOO_HIGH',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  
  // Smart Contract Errors
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  CAMPAIGN_NOT_FOUND = 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_ENDED = 'CAMPAIGN_ENDED',
  
  // Token Errors
  TOKEN_ACCOUNT_NOT_FOUND = 'TOKEN_ACCOUNT_NOT_FOUND',
  INSUFFICIENT_TOKEN_BALANCE = 'INSUFFICIENT_TOKEN_BALANCE',
  TOKEN_MINT_ERROR = 'TOKEN_MINT_ERROR',
  
  // DEX Errors
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  LIQUIDITY_INSUFFICIENT = 'LIQUIDITY_INSUFFICIENT',
  DEX_UNAVAILABLE = 'DEX_UNAVAILABLE',
  GRADUATION_FAILED = 'GRADUATION_FAILED',
  
  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  AMOUNT_TOO_LOW = 'AMOUNT_TOO_LOW',
  AMOUNT_TOO_HIGH = 'AMOUNT_TOO_HIGH',
  
  // Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED'
}

export interface BlockchainError {
  code: ErrorCode
  message: string
  originalError?: any
  userMessage: string
  recoverable: boolean
  retryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
  timestamp: number
}

export class ErrorHandler {
  private static errorCount = new Map<ErrorCode, number>()
  private static errorListeners: Set<(error: BlockchainError) => void> = new Set()

  // Subscribe to error events
  static onError(callback: (error: BlockchainError) => void): () => void {
    this.errorListeners.add(callback)
    return () => this.errorListeners.delete(callback)
  }

  // Main error handling method
  static handle(error: any, context?: Record<string, any>): BlockchainError {
    const blockchainError = this.parseError(error, context)
    
    // Track error frequency
    const currentCount = this.errorCount.get(blockchainError.code) || 0
    this.errorCount.set(blockchainError.code, currentCount + 1)
    
    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(blockchainError)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
      }
    })

    // Log error
    console.error('Blockchain operation error:', {
      code: blockchainError.code,
      message: blockchainError.message,
      context: blockchainError.context,
      originalError: blockchainError.originalError
    })

    return blockchainError
  }

  // Parse and classify errors
  private static parseError(error: any, context?: Record<string, any>): BlockchainError {
    const timestamp = Date.now()
    const baseError: Partial<BlockchainError> = {
      originalError: error,
      context,
      timestamp
    }

    // Wallet Errors
    if (error instanceof WalletError || error?.name === 'WalletError') {
      return {
        ...baseError,
        code: ErrorCode.WALLET_REJECTED,
        message: error.message || 'Wallet operation failed',
        userMessage: 'Please check your wallet and try again. Make sure your wallet is unlocked and connected.',
        recoverable: true,
        retryable: true,
        severity: 'medium'
      } as BlockchainError
    }

    // Check error message patterns
    const errorMessage = error?.message || error?.toString() || ''
    const errorLower = errorMessage.toLowerCase()

    // Rate Limiting Errors (429)
    if (errorLower.includes('429') || errorLower.includes('too many requests') || errorLower.includes('rate limit')) {
      return {
        ...baseError,
        code: ErrorCode.RATE_LIMITED,
        message: errorMessage,
        userMessage: 'Network is experiencing high traffic. Please wait a moment before trying again.',
        recoverable: true,
        retryable: false, // Don't auto-retry rate limits to avoid infinite loops
        severity: 'medium'
      } as BlockchainError
    }

    // Network/RPC Errors
    if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch')) {
      return {
        ...baseError,
        code: ErrorCode.NETWORK_ERROR,
        message: errorMessage,
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        recoverable: true,
        retryable: true,
        severity: 'medium'
      } as BlockchainError
    }

    if (errorLower.includes('timeout')) {
      return {
        ...baseError,
        code: ErrorCode.TIMEOUT_ERROR,
        message: errorMessage,
        userMessage: 'Operation timed out. The network may be congested. Please try again.',
        recoverable: true,
        retryable: true,
        severity: 'medium'
      } as BlockchainError
    }

    // Balance Errors
    if (errorLower.includes('insufficient') && errorLower.includes('balance')) {
      return {
        ...baseError,
        code: ErrorCode.INSUFFICIENT_BALANCE,
        message: errorMessage,
        userMessage: 'Insufficient balance to complete this transaction. Please check your wallet balance.',
        recoverable: false,
        retryable: false,
        severity: 'high'
      } as BlockchainError
    }

    // Transaction Errors
    if (errorLower.includes('simulation failed') || errorLower.includes('blockhash not found')) {
      return {
        ...baseError,
        code: ErrorCode.SIMULATION_FAILED,
        message: errorMessage,
        userMessage: 'Transaction simulation failed. This may be due to network congestion. Please try again.',
        recoverable: true,
        retryable: true,
        severity: 'medium'
      } as BlockchainError
    }

    if (errorLower.includes('slippage') || errorLower.includes('price impact')) {
      return {
        ...baseError,
        code: ErrorCode.SLIPPAGE_TOLERANCE_EXCEEDED,
        message: errorMessage,
        userMessage: 'Price moved too much during the transaction. Try increasing slippage tolerance or reducing trade size.',
        recoverable: true,
        retryable: true,
        severity: 'medium'
      } as BlockchainError
    }

    // Account Errors
    if (errorLower.includes('account not found') || errorLower.includes('invalid account')) {
      return {
        ...baseError,
        code: ErrorCode.ACCOUNT_NOT_FOUND,
        message: errorMessage,
        userMessage: 'Required account not found. This may be a temporary issue or the account may not exist yet.',
        recoverable: true,
        retryable: true,
        severity: 'medium'
      } as BlockchainError
    }

    // Program Errors
    if (errorLower.includes('program error') || errorLower.includes('anchor error')) {
      return {
        ...baseError,
        code: ErrorCode.PROGRAM_ERROR,
        message: errorMessage,
        userMessage: 'Smart contract error occurred. Please try again or contact support if the issue persists.',
        recoverable: true,
        retryable: true,
        severity: 'high'
      } as BlockchainError
    }

    // Campaign Specific Errors
    if (errorLower.includes('campaign') && errorLower.includes('ended')) {
      return {
        ...baseError,
        code: ErrorCode.CAMPAIGN_ENDED,
        message: errorMessage,
        userMessage: 'This campaign has ended and is no longer accepting contributions.',
        recoverable: false,
        retryable: false,
        severity: 'low'
      } as BlockchainError
    }

    // Token Errors
    if (errorLower.includes('token account') || errorLower.includes('associated token')) {
      return {
        ...baseError,
        code: ErrorCode.TOKEN_ACCOUNT_NOT_FOUND,
        message: errorMessage,
        userMessage: 'Token account not found. We\'ll create one for you automatically.',
        recoverable: true,
        retryable: true,
        severity: 'low'
      } as BlockchainError
    }

    // User Rejected
    if (errorLower.includes('user rejected') || errorLower.includes('rejected') || errorLower.includes('cancelled')) {
      return {
        ...baseError,
        code: ErrorCode.WALLET_REJECTED,
        message: errorMessage,
        userMessage: 'Transaction was cancelled. Please try again when ready.',
        recoverable: true,
        retryable: true,
        severity: 'low'
      } as BlockchainError
    }

    // Generic fallback
    return {
      ...baseError,
      code: ErrorCode.UNKNOWN_ERROR,
      message: errorMessage || 'An unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      recoverable: true,
      retryable: true,
      severity: 'medium'
    } as BlockchainError
  }

  // Get user-friendly retry suggestions
  static getRetryGuidance(error: BlockchainError): string[] {
    const suggestions: string[] = []

    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.TIMEOUT_ERROR:
        suggestions.push('Check your internet connection')
        suggestions.push('Try switching to a different RPC endpoint')
        suggestions.push('Wait a moment and try again')
        break

      case ErrorCode.RATE_LIMITED:
        suggestions.push('Wait 30-60 seconds before trying again')
        suggestions.push('The network is experiencing high traffic')
        suggestions.push('Try using a different RPC endpoint')
        break

      case ErrorCode.INSUFFICIENT_BALANCE:
        suggestions.push('Add more SOL to your wallet')
        suggestions.push('Reduce the transaction amount')
        suggestions.push('Check for pending transactions that may have locked funds')
        break

      case ErrorCode.SLIPPAGE_TOLERANCE_EXCEEDED:
        suggestions.push('Increase your slippage tolerance')
        suggestions.push('Try a smaller transaction amount')
        suggestions.push('Wait for less volatile market conditions')
        break

      case ErrorCode.SIMULATION_FAILED:
        suggestions.push('Wait for network congestion to reduce')
        suggestions.push('Try again with a higher priority fee')
        suggestions.push('Check if your transaction parameters are valid')
        break

      case ErrorCode.WALLET_REJECTED:
        suggestions.push('Make sure your wallet is unlocked')
        suggestions.push('Check wallet permissions for this site')
        suggestions.push('Try refreshing the page and reconnecting')
        break

      case ErrorCode.TOKEN_ACCOUNT_NOT_FOUND:
        suggestions.push('The token account will be created automatically')
        suggestions.push('Ensure you have enough SOL for account creation fees')
        break

      default:
        suggestions.push('Try the operation again')
        suggestions.push('Check your wallet connection')
        suggestions.push('Contact support if the issue persists')
    }

    return suggestions
  }

  // Get error statistics
  static getErrorStats(): Record<ErrorCode, number> {
    return Object.fromEntries(this.errorCount) as Record<ErrorCode, number>
  }

  // Reset error tracking
  static resetStats(): void {
    this.errorCount.clear()
  }

  // Check if error should trigger automatic retry
  static shouldAutoRetry(error: BlockchainError, attemptCount: number): boolean {
    if (!error.retryable || attemptCount >= 3) return false

    const autoRetryErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.SIMULATION_FAILED,
      ErrorCode.RPC_ERROR
    ]

    return autoRetryErrors.includes(error.code)
  }

  // Get error severity color
  static getSeverityColor(severity: BlockchainError['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-orange-400'
      case 'critical': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  // Format error for display
  static formatErrorDisplay(error: BlockchainError): {
    title: string
    message: string
    suggestions: string[]
    icon: string
  } {
    const suggestions = this.getRetryGuidance(error)
    
    let icon = '⚠️'
    let title = 'Operation Failed'

    switch (error.severity) {
      case 'low':
        icon = 'ℹ️'
        title = 'Minor Issue'
        break
      case 'medium':
        icon = '⚠️'
        title = 'Operation Failed'
        break
      case 'high':
        icon = '❌'
        title = 'Transaction Error'
        break
      case 'critical':
        icon = '🚨'
        title = 'Critical Error'
        break
    }

    return {
      title,
      message: error.userMessage,
      suggestions,
      icon
    }
  }
}

// Wrapper for async operations with error handling
export async function withErrorHandler<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<{ success: true; data: T } | { success: false; error: BlockchainError }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const blockchainError = ErrorHandler.handle(error, context)
    return { success: false, error: blockchainError }
  }
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  context?: Record<string, any>
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const blockchainError = ErrorHandler.handle(error, { ...context, attempt })

      // Never retry rate limits to prevent infinite loops
      if (blockchainError.code === ErrorCode.RATE_LIMITED) {
        console.warn('Rate limited by RPC. Stopping retries to prevent spam.')
        throw blockchainError
      }

      if (attempt === maxAttempts || !ErrorHandler.shouldAutoRetry(blockchainError, attempt)) {
        throw blockchainError
      }

      // Exponential backoff with jitter
      let delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
      
      // Special handling for network errors - longer delays
      if (blockchainError.code === ErrorCode.NETWORK_ERROR || blockchainError.code === ErrorCode.TIMEOUT_ERROR) {
        delay = Math.max(delay, 5000) // Minimum 5 second delay for network issues
      }

      console.log(`Retrying operation after ${delay}ms delay (attempt ${attempt}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}