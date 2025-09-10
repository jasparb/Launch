import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { CheckCircleIcon, XMarkIcon, CurrencyDollarIcon, HeartIcon, UserGroupIcon, ChatBubbleLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { claimCodeSystem } from '../lib/claimCodeSystem'

interface TaskRewardSystemProps {
  campaignId: string
  campaignName: string
  onAccessGranted: () => void
}

interface Task {
  id: string
  platform: 'twitter' | 'instagram' | 'tiktok' | 'discord'
  action: string
  description: string
  url?: string
  icon: React.ReactNode
  completed: boolean
}

export default function TaskRewardSystem({ campaignId, campaignName, onAccessGranted }: TaskRewardSystemProps) {
  const { publicKey } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [solPrice, setSolPrice] = useState<number>(0)
  const [solAmount, setSolAmount] = useState<string>('0')
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'sol' | 'usdc' | 'stripe'>('sol')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [showClaimCode, setShowClaimCode] = useState<{ code: string; email: string } | null>(null)
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'twitter-follow',
      platform: 'twitter',
      action: 'Follow on Twitter',
      description: 'Follow our Twitter account',
      url: 'https://twitter.com/yourproject',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>,
      completed: false
    },
    {
      id: 'twitter-retweet',
      platform: 'twitter',
      action: 'Retweet Announcement',
      description: 'Retweet our campaign announcement',
      url: 'https://twitter.com/yourproject/status/123',
      icon: <ShareIcon className="w-5 h-5" />,
      completed: false
    },
    {
      id: 'instagram-follow',
      platform: 'instagram',
      action: 'Follow on Instagram',
      description: 'Follow our Instagram page',
      url: 'https://instagram.com/yourproject',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>,
      completed: false
    },
    {
      id: 'tiktok-follow',
      platform: 'tiktok',
      action: 'Follow on TikTok',
      description: 'Follow our TikTok account',
      url: 'https://tiktok.com/@yourproject',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
      completed: false
    },
    {
      id: 'discord-join',
      platform: 'discord',
      action: 'Join Discord',
      description: 'Join our Discord community',
      url: 'https://discord.gg/yourproject',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515a.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0a12.64 12.64 0 00-.617-1.25a.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057a19.9 19.9 0 005.993 3.03a.078.078 0 00.084-.028a14.09 14.09 0 001.226-1.994a.076.076 0 00-.041-.106a13.107 13.107 0 01-1.872-.892a.077.077 0 01-.008-.128a10.2 10.2 0 00.372-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127a12.299 12.299 0 01-1.873.892a.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028a19.839 19.839 0 006.002-3.03a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/></svg>,
      completed: false
    }
  ])
  const [allTasksCompleted, setAllTasksCompleted] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    // Check if user already has access
    if (publicKey) {
      const accessKey = `campaign_access_${campaignId}_${publicKey.toString()}`
      const hasAccessStored = localStorage.getItem(accessKey) === 'true'
      if (hasAccessStored) {
        setHasAccess(true)
      }
    }
  }, [publicKey, campaignId])

  useEffect(() => {
    // Fetch SOL price when modal opens
    if (isOpen) {
      fetchSolPrice()
      
      // Refresh price every 30 seconds
      const interval = setInterval(() => {
        fetchSolPrice()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const fetchSolPrice = async () => {
    setIsLoadingPrice(true)
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await response.json()
      const price = data.solana.usd
      setSolPrice(price)
      // Calculate SOL amount for $1
      const solForOneDollar = (1 / price).toFixed(4)
      setSolAmount(solForOneDollar)
    } catch (error) {
      console.error('Error fetching SOL price:', error)
      // Fallback price if API fails
      setSolPrice(100)
      setSolAmount('0.0100')
    } finally {
      setIsLoadingPrice(false)
    }
  }

  useEffect(() => {
    // Check if all tasks are completed
    const allCompleted = tasks.every(task => task.completed)
    setAllTasksCompleted(allCompleted)
    
    if (allCompleted && publicKey) {
      grantAccess()
    }
  }, [tasks, publicKey])

  const handleTaskClick = (taskId: string, url?: string) => {
    // Open the social media link in a new tab
    if (url) {
      window.open(url, '_blank')
    }
    
    // Mark task as completed after a delay (simulating user action)
    setTimeout(() => {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: true } : task
        )
      )
    }, 2000)
  }

  const grantAccess = () => {
    if (publicKey) {
      const accessKey = `campaign_access_${campaignId}_${publicKey.toString()}`
      localStorage.setItem(accessKey, 'true')
      setHasAccess(true)
      onAccessGranted()
      
      // Close the modal after granting access
      setTimeout(() => {
        setIsOpen(false)
      }, 1500)
    }
  }

  const handlePayment = async () => {
    setIsProcessingPayment(true)
    setShowPayment(true)
    
    try {
      if (paymentMethod === 'stripe') {
        // Validate email
        if (!customerEmail || !customerEmail.includes('@')) {
          alert('Please enter a valid email address')
          setIsProcessingPayment(false)
          return
        }
        
        // In production, this would redirect to Stripe Checkout
        // For demo, simulate payment and generate claim code
        console.log('Processing Stripe payment for:', customerEmail)
        
        // Simulate payment processing
        setTimeout(() => {
          // Generate claim code
          const { code, expiresAt } = claimCodeSystem.createClaimCode({
            campaignId,
            campaignName,
            customerEmail,
            paymentIntentId: `pi_demo_${Date.now()}`,
            amount: 1.00,
            accessKeyConfig: {
              name: `${campaignName} Access Key`,
              artwork: null // Would come from campaign config
            }
          })
          
          // Show claim code to user
          setShowClaimCode({ code, email: customerEmail })
          setShowPayment(false)
          setIsProcessingPayment(false)
          
          // In production, also send email with the code
          console.log('Email would be sent to:', customerEmail, 'with code:', code)
        }, 2000)
      } else if (paymentMethod === 'usdc') {
        // USDC payment logic
        console.log('Processing USDC payment...')
        // Would interact with USDC smart contract here
        setTimeout(() => {
          grantAccess()
          setShowPayment(false)
          setIsProcessingPayment(false)
        }, 2000)
      } else {
        // SOL payment logic
        console.log('Processing SOL payment...')
        setTimeout(() => {
          grantAccess()
          setShowPayment(false)
          setIsProcessingPayment(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Payment failed:', error)
      setIsProcessingPayment(false)
      setShowPayment(false)
    }
  }

  if (hasAccess) {
    return (
      <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center gap-3">
          <CheckCircleSolid className="w-8 h-8 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Access Granted!</h3>
            <p className="text-sm text-gray-300">You have full access to this campaign's content and rewards.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Trigger Button */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Unlock Exclusive Access</h3>
            <p className="text-gray-300 text-sm">Complete tasks or contribute to get full access to this campaign</p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Get Access
          </button>
        </div>
      </div>

      {/* Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Unlock Campaign Access</h2>
                  <p className="text-white/90">Complete social tasks or make a contribution</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {!showPayment ? (
                <>
                  {/* Option 1: Complete Tasks */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5 text-purple-400" />
                      Option 1: Complete Social Tasks
                    </h3>
                    <div className="space-y-3">
                      {tasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => handleTaskClick(task.id, task.url)}
                          disabled={task.completed}
                          className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                            task.completed
                              ? 'bg-green-500/20 border-green-500/30'
                              : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-purple-400/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={task.completed ? 'text-green-400' : 'text-gray-400'}>
                              {task.icon}
                            </div>
                            <div className="text-left">
                              <p className={`font-medium ${task.completed ? 'text-green-400' : 'text-white'}`}>
                                {task.action}
                              </p>
                              <p className="text-xs text-gray-400">{task.description}</p>
                            </div>
                          </div>
                          {task.completed ? (
                            <CheckCircleSolid className="w-6 h-6 text-green-400" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-gray-500" />
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {allTasksCompleted && (
                      <div className="mt-4 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-semibold text-center">
                          All tasks completed! Access granted! 🎉
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gray-900 text-gray-400">OR</span>
                    </div>
                  </div>

                  {/* Option 2: Pay */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
                      Option 2: Quick Access with Payment
                    </h3>
                    
                    {/* Payment Method Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setPaymentMethod('sol')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          paymentMethod === 'sol' 
                            ? 'bg-purple-500/20 border border-purple-400 text-purple-400' 
                            : 'bg-white/5 border border-white/20 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">◎</span>
                          <span>SOL</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('usdc')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          paymentMethod === 'usdc' 
                            ? 'bg-purple-500/20 border border-purple-400 text-purple-400' 
                            : 'bg-white/5 border border-white/20 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>💵</span>
                          <span>USDC</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('stripe')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          paymentMethod === 'stripe' 
                            ? 'bg-purple-500/20 border border-purple-400 text-purple-400' 
                            : 'bg-white/5 border border-white/20 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>💳</span>
                          <span>Card</span>
                        </div>
                      </button>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                      {/* SOL Payment */}
                      {paymentMethod === 'sol' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-white font-semibold">Pay with Solana</p>
                              <p className="text-sm text-gray-400">Direct wallet payment</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">$1.00</p>
                              {isLoadingPrice ? (
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400"></div>
                                  <span>Loading...</span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-purple-400">≈ {solAmount} SOL</p>
                                  <p className="text-xs text-gray-500">1 SOL = ${solPrice.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-3 mb-4 border border-purple-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <span className="text-green-400 font-bold text-sm">$</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">You Pay</p>
                                  <p className="text-white font-semibold">$1.00 USD</p>
                                </div>
                              </div>
                              
                              <div className="text-purple-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <span className="text-purple-400 font-bold text-xs">SOL</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">You Send</p>
                                  <p className="text-white font-semibold">{solAmount} SOL</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <p className="text-xs text-gray-400">Live rate • Updates every 30 seconds</p>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* USDC Payment */}
                      {paymentMethod === 'usdc' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-white font-semibold">Pay with USDC</p>
                              <p className="text-sm text-gray-400">Stablecoin payment on Solana</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">1.00 USDC</p>
                              <p className="text-xs text-gray-500">No conversion needed</p>
                            </div>
                          </div>
                          
                          <div className="bg-blue-500/10 rounded-lg p-3 mb-4 border border-blue-500/20">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="text-blue-400 font-bold text-xs">USDC</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white font-medium">Stable Value Payment</p>
                                <p className="text-xs text-gray-400">1 USDC = $1.00 USD (always)</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 mb-4">
                            <p>✓ No price fluctuation</p>
                            <p>✓ Fast settlement on Solana</p>
                            <p>✓ Lower gas fees than Ethereum</p>
                          </div>
                        </>
                      )}
                      
                      {/* Stripe Payment */}
                      {paymentMethod === 'stripe' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-white font-semibold">Pay with Card</p>
                              <p className="text-sm text-gray-400">Credit/Debit card via Stripe</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">$1.00</p>
                              <p className="text-xs text-gray-500">+ processing fee</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Email Address (for claim code)
                            </label>
                            <input
                              type="email"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              placeholder="your@email.com"
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                              required
                            />
                            <p className="text-xs text-gray-400 mt-1">We'll send your claim code to this email</p>
                          </div>
                          
                          <div className="bg-green-500/10 rounded-lg p-3 mb-4 border border-green-500/20">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <div className="w-10 h-6 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">VISA</span>
                                </div>
                                <div className="w-10 h-6 rounded bg-gradient-to-r from-red-500 to-yellow-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">MC</span>
                                </div>
                                <div className="w-10 h-6 rounded bg-gradient-to-r from-blue-700 to-blue-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">AMEX</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">All major cards accepted</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 mb-4">
                            <p>✓ No crypto wallet needed</p>
                            <p>✓ Instant processing</p>
                            <p>✓ Secure payment via Stripe</p>
                          </div>
                        </>
                      )}
                      
                      <button
                        onClick={handlePayment}
                        disabled={isLoadingPrice && paymentMethod === 'sol'}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform hover:scale-[1.02] disabled:hover:scale-100 transition-all duration-200"
                      >
                        {isProcessingPayment ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </span>
                        ) : (
                          <>
                            {paymentMethod === 'sol' && (isLoadingPrice ? 'Loading Price...' : `Pay ${solAmount} SOL`)}
                            {paymentMethod === 'usdc' && 'Pay 1.00 USDC'}
                            {paymentMethod === 'stripe' && 'Pay with Card'}
                          </>
                        )}
                      </button>
                      
                      {!publicKey && paymentMethod !== 'stripe' && (
                        <p className="text-xs text-yellow-400 mt-2 text-center">
                          ⚠️ Please connect your wallet to pay with {paymentMethod === 'sol' ? 'SOL' : 'USDC'}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
                  <p className="text-white font-semibold">Processing payment...</p>
                  <p className="text-sm text-gray-400 mt-2">Please wait</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Code Success Modal */}
      {showClaimCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
              <p className="text-gray-300 mb-6">Your access key claim code is ready</p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/20">
                <p className="text-sm text-gray-400 mb-2">Your Claim Code</p>
                <p className="text-2xl font-mono font-bold text-white mb-4 break-all">
                  {showClaimCode.code}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(showClaimCode.code)}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-all"
                >
                  📋 Copy Code
                </button>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300">
                  📧 We've sent this code to <strong>{showClaimCode.email}</strong>
                </p>
              </div>
              
              <div className="space-y-3 text-left">
                <h4 className="text-white font-semibold">Next Steps:</h4>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li>1. Get a Solana wallet (Phantom, Solflare, etc.)</li>
                  <li>2. Visit <a href="/claim" className="text-purple-400 hover:text-purple-300 underline">fundit.com/claim</a></li>
                  <li>3. Enter your claim code to mint your NFT</li>
                </ol>
              </div>
              
              <button
                onClick={() => setShowClaimCode(null)}
                className="mt-6 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all w-full"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}