import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import ClientWalletButton from '../components/ClientWalletButton'
import { FilmIcon, CurrencyDollarIcon, RocketLaunchIcon, TicketIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

// Studio^3 Film Project
const STUDIO3_PROJECT = {
  // Project details
  projectName: 'The End of The World',
  studioName: 'Studio^3',
  adminWallet: '6sL2o96i5dV7gvfEBSjsdF66aQzrNpHqd1TufumigQMg',
  fundingGoal: 10000, // $10,000 USD
  pricePerCopy: 1, // $1 per digital copy
  copiesNeeded: 10000, // 10,000 copies to reach goal
  
  // Wallet for donations
  studioWallet: '8oYmUTGBuBqzukESX68SXB67nxopemnRrVmzH3hrGpAd',
  
  // Studio^3 Token Plan
  tokenInfo: {
    name: 'Studio^3 Token',
    symbol: 'S3',
    totalSupply: 1000000000, // 1 billion tokens
    airdropRatio: 1000, // 1000 S3 tokens per $1 donated
    utilityFeatures: [
      'Governance voting on future productions',
      'Early access to all Studio^3 films',
      'Revenue sharing from film sales',
      'Exclusive behind-the-scenes content',
      'Producer credits for top holders'
    ]
  }
}

export default function Studio3Presale() {
  const { publicKey } = useWallet()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [copiesSold, setCopiesSold] = useState(0)
  const [purchaseAmount, setPurchaseAmount] = useState(1)
  const [userPurchases, setUserPurchases] = useState(0)
  const [supporters, setSupporters] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<{ [key: number]: boolean }>({2: true}) // Phase 2 (current funding) starts expanded
  const [stepCompletions, setStepCompletions] = useState<{ [key: string]: boolean }>({})
  const [comments, setComments] = useState<Array<{
    id: string,
    wallet: string,
    message: string,
    timestamp: Date,
    isDonor: boolean,
    image?: string,
    replies?: Array<{
      id: string,
      wallet: string,
      message: string,
      timestamp: Date,
      isDonor: boolean,
      image?: string
    }>
  }>>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    // Initialize Solana connection
    const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
    setConnection(conn)

    // Load existing sales data - cleared for mainnet launch
    if (typeof window !== 'undefined') {
      // Clear any testnet data for mainnet launch
      if (localStorage.getItem('studio3_testnet_cleared') !== 'true') {
        localStorage.clear()
        localStorage.setItem('studio3_testnet_cleared', 'true')
        console.log('Cleared testnet data for mainnet launch')
      }
      
      const salesData = localStorage.getItem('studio3_sales') || '{"total": 0, "supporters": []}'
      const parsed = JSON.parse(salesData)
      setCopiesSold(parsed.total)
      setSupporters(parsed.supporters || [])

      // Load step completions
      const storageKey = `roadmap_steps_${STUDIO3_PROJECT.projectName}`
      const currentSteps = JSON.parse(localStorage.getItem(storageKey) || '{}')
      setStepCompletions(currentSteps)

      // Load comments
      const commentsKey = `studio3_comments_${STUDIO3_PROJECT.projectName}`
      const savedComments = JSON.parse(localStorage.getItem(commentsKey) || '[]')
      setComments(savedComments.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
        replies: c.replies?.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) })) || []
      })))

      // Load user's purchases
      if (publicKey) {
        const userKey = publicKey.toString()
        const userSupporter = parsed.supporters.find((s: any) => s.wallet === userKey)
        if (userSupporter) {
          setUserPurchases(userSupporter.copies)
        }
      }
    }
  }, [publicKey])

  const handlePurchase = async () => {
    if (!publicKey || !connection) {
      alert('Please connect your wallet first')
      return
    }

    setIsProcessing(true)

    try {
      // Calculate SOL amount (using current SOL price - update as needed)
      const solPrice = 150 // Update with current SOL price or fetch from oracle
      const usdAmount = purchaseAmount * STUDIO3_PROJECT.pricePerCopy
      const solAmount = usdAmount / solPrice

      // Create transaction for donation
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(STUDIO3_PROJECT.studioWallet),
          lamports: Math.floor(solAmount * LAMPORTS_PER_SOL)
        })
      )

      // Send transaction
      const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = 
        await connection.getLatestBlockhashAndContext()

      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Request wallet to sign and send
      const wallet = window.solana
      const signed = await wallet.signTransaction(transaction)
      const txid = await connection.sendRawTransaction(signed.serialize())
      
      // Wait for confirmation
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature: txid
      })

      // Record the purchase for airdrop tracking
      recordPurchase(publicKey.toString(), purchaseAmount, txid)

      alert(`Success! You've pre-ordered ${purchaseAmount} digital copies.\n\nTransaction: ${txid}\n\nYou'll receive ${purchaseAmount * STUDIO3_PROJECT.tokenInfo.airdropRatio} Studio^3 tokens in Phase 4!`)

    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const recordPurchase = (wallet: string, copies: number, txid: string) => {
    if (typeof window !== 'undefined') {
      const salesData = localStorage.getItem('studio3_sales') || '{"total": 0, "supporters": []}'
      const parsed = JSON.parse(salesData)
      
      // Update or add supporter
      const existingIndex = parsed.supporters.findIndex((s: any) => s.wallet === wallet)
      if (existingIndex >= 0) {
        parsed.supporters[existingIndex].copies += copies
        parsed.supporters[existingIndex].transactions.push(txid)
        parsed.supporters[existingIndex].futureAirdrop += copies * STUDIO3_PROJECT.tokenInfo.airdropRatio
        parsed.supporters[existingIndex].lastPurchase = Date.now()
      } else {
        parsed.supporters.push({
          wallet,
          copies,
          transactions: [txid],
          futureAirdrop: copies * STUDIO3_PROJECT.tokenInfo.airdropRatio,
          timestamp: Date.now(),
          lastPurchase: Date.now()
        })
      }

      // Store for governance token distribution (separate storage for security)
      const governanceKey = 'studio3_governance_distribution'
      const governanceData = JSON.parse(localStorage.getItem(governanceKey) || '{}')
      
      if (!governanceData[wallet]) {
        governanceData[wallet] = {
          address: wallet,
          totalTokens: 0,
          totalSpent: 0,
          firstPurchase: Date.now(),
          purchases: []
        }
      }
      
      governanceData[wallet].totalTokens += copies * STUDIO3_PROJECT.tokenInfo.airdropRatio
      governanceData[wallet].totalSpent += copies * STUDIO3_PROJECT.pricePerCopy
      governanceData[wallet].lastPurchase = Date.now()
      governanceData[wallet].purchases.push({
        copies,
        tokens: copies * STUDIO3_PROJECT.tokenInfo.airdropRatio,
        spent: copies * STUDIO3_PROJECT.pricePerCopy,
        txid,
        timestamp: Date.now()
      })
      
      localStorage.setItem(governanceKey, JSON.stringify(governanceData))
      
      console.log(`Governance tokens allocated: ${copies * STUDIO3_PROJECT.tokenInfo.airdropRatio} S³ tokens for ${wallet}`)
      
      parsed.total += copies
      
      localStorage.setItem('studio3_sales', JSON.stringify(parsed))
      
      // Update UI
      setCopiesSold(parsed.total)
      setSupporters(parsed.supporters)
      setUserPurchases((prev) => prev + copies)
    }
  }

  const progressPercentage = (copiesSold / STUDIO3_PROJECT.copiesNeeded) * 100
  const remainingCopies = STUDIO3_PROJECT.copiesNeeded - copiesSold
  const totalRaised = copiesSold * STUDIO3_PROJECT.pricePerCopy

  const togglePhase = (phaseNumber: number) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseNumber]: !prev[phaseNumber]
    }))
  }

  const isAdmin = publicKey && publicKey.toString() === STUDIO3_PROJECT.adminWallet

  const toggleStepCompletion = (phaseId: number, stepIndex: number) => {
    if (!isAdmin) return
    
    const stepKey = `${phaseId}_${stepIndex}`
    const newCompletions = { ...stepCompletions }
    newCompletions[stepKey] = !newCompletions[stepKey]
    
    // Update state immediately for instant UI feedback
    setStepCompletions(newCompletions)
    
    // Save to localStorage
    const storageKey = `roadmap_steps_${STUDIO3_PROJECT.projectName}`
    localStorage.setItem(storageKey, JSON.stringify(newCompletions))
  }

  const getStepStatus = (phaseId: number, stepIndex: number, defaultStatus: string) => {
    const stepKey = `${phaseId}_${stepIndex}`
    
    // For non-admin users, show the stored completion status
    if (!isAdmin) {
      return stepCompletions[stepKey] ? 'complete' : defaultStatus
    }
    
    // For admin, allow toggling
    return stepCompletions[stepKey] ? 'complete' : defaultStatus
  }

  const handleCommentSubmit = () => {
    if (!publicKey || !newComment.trim()) return

    const userKey = publicKey.toString()
    const isDonor = supporters.some((s: any) => s.wallet === userKey)
    
    const comment = {
      id: Date.now().toString(),
      wallet: userKey,
      message: newComment.trim(),
      timestamp: new Date(),
      isDonor,
      image: selectedImage || undefined,
      replies: []
    }

    const updatedComments = [comment, ...comments]
    setComments(updatedComments)
    setNewComment('')
    setSelectedImage(null)

    // Save to localStorage
    const commentsKey = `studio3_comments_${STUDIO3_PROJECT.projectName}`
    localStorage.setItem(commentsKey, JSON.stringify(updatedComments))
  }

  const handleReplySubmit = (commentId: string) => {
    if (!publicKey || !replyText.trim()) return

    const userKey = publicKey.toString()
    const isDonor = supporters.some((s: any) => s.wallet === userKey)
    
    const reply = {
      id: Date.now().toString(),
      wallet: userKey,
      message: replyText.trim(),
      timestamp: new Date(),
      isDonor,
      image: selectedImage || undefined
    }

    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply]
        }
      }
      return comment
    })

    setComments(updatedComments)
    setReplyText('')
    setReplyingTo(null)
    setSelectedImage(null)

    // Save to localStorage
    const commentsKey = `studio3_comments_${STUDIO3_PROJECT.projectName}`
    localStorage.setItem(commentsKey, JSON.stringify(updatedComments))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Function to clear all data (for testing/reset purposes)
  const clearAllData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('studio3_sales')
      localStorage.removeItem('studio3_governance_distribution')
      localStorage.removeItem(`roadmap_steps_${STUDIO3_PROJECT.projectName}`)
      localStorage.removeItem(`studio3_comments_${STUDIO3_PROJECT.projectName}`)
      
      // Reset state
      setCopiesSold(0)
      setSupporters([])
      setUserPurchases(0)
      setComments([])
      setStepCompletions({})
      
      console.log('All data cleared')
    }
  }

  const roadmapPhases = [
    {
      id: 1,
      title: "Phase 1: Pre-Production",
      status: "complete",
      statusColor: "bg-green-500",
      borderColor: "border-green-500",
      textColor: "text-green-400",
      description: "Laying The Foundation",
      statusText: "Materials available on site",
      details: [
        { text: "Original Narrative Published", status: "pending" },
        { text: "Screenplay & Script Adaptations Published", status: "pending" },
        { text: "Concept Art & Storyboard Published", status: "pending" },
        { text: "Release Role Audition and Crew Call Campaigns", status: "pending" },
        { text: "Reveal Cast and Crew", status: "pending" }
      ]
    },
    {
      id: 2,
      title: "Phase 2: Production",
      status: "current",
      statusColor: "bg-blue-500",
      borderColor: "border-blue-500",
      textColor: "text-blue-400",
      description: "Action!",
      statusText: `$${totalRaised} of $10,000 raised`,
      details: [
        { text: "Deploy Production Plan", status: "pending" },
        { text: "Execute Production Plan", status: "pending" },
        { text: "Wrap Announcement", status: "pending" }
      ]
    },
    {
      id: 3,
      title: "Phase 3: Post-Production",
      status: "pending",
      statusColor: "bg-gray-600",
      borderColor: "border-gray-500",
      textColor: "text-gray-400",
      description: "Putting it all together",
      statusText: "",
      details: [
        { text: "Lock Self in Office", status: "pending" },
        { text: "Open Premiere Pro", status: "pending" },
        { text: "Edit to Perfection", status: "pending" },
        { text: "Upload Opening Scene to Socials", status: "pending" }
      ]
    },
    {
      id: 4,
      title: "Phase 4: Distribution", 
      status: "pending",
      statusColor: "bg-gray-600",
      borderColor: "border-gray-500",
      textColor: "text-gray-400",
      description: "A Gift For You!",
      statusText: "",
      details: [
        { text: "Airdrop Tokens and Digital Copies", status: "pending" },
        { text: "Deploy S³ Token", status: "pending" },
        { text: "Submit to Major Film Festivals (Sundance, SXSW, Fantasia)", status: "pending" },
        { text: "Submit to All Film Festivals in America", status: "pending" }
      ]
    },
    {
      id: 5,
      title: "Phase 5: Endgame",
      status: "pending", 
      statusColor: "bg-gray-600",
      borderColor: "border-gray-500",
      textColor: "text-gray-400",
      description: "Communal Takeover",
      statusText: "",
      details: [
        { text: "Theatrical Premiere in Communal Voted Venue", status: "pending" },
        { text: "Inject revenue into S³ token", status: "pending" },
        { text: "Community governance voting on next Studio³ film project", status: "pending" }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-950 to-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md border-b border-indigo-500/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">Studio³</div>
              <div className="text-indigo-400">Decentralized Production House</div>
            </div>
            <ClientWalletButton />
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <div className="bg-black/30 border-b border-indigo-500/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center space-x-8 py-4">
            <a href="#hero" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Pre-Order
            </a>
            <a href="#roadmap" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Production Roadmap
            </a>
            <a href="#community" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Community
            </a>
            <a href="#supporters" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Supporters
            </a>
            <a href="#tokens" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Token Info
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div id="hero" className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Pre-Order "{STUDIO3_PROJECT.projectName}"
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            $1 Digital Copy • Earn Studio³ Tokens
          </p>
          
          {/* Key Value Props */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
              <TicketIcon className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">$1 Digital Copy</h3>
              <p className="text-gray-300 text-sm">Get the film when it's complete</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
              <FilmIcon className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Fund Production</h3>
              <p className="text-gray-300 text-sm">100% goes to making the film</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
              <RocketLaunchIcon className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Earn S³ Tokens</h3>
              <p className="text-gray-300 text-sm">1000 tokens per dollar spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Project Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Funding Progress */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-8 border border-indigo-500/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Funding Progress</h2>
                <span className="text-3xl font-bold text-green-400">
                  ${totalRaised.toLocaleString()}
                </span>
              </div>
              
              <div className="mb-6">
                <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-3"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  >
                    <span className="text-sm font-bold text-white">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-400 mt-3">
                  <span>{copiesSold.toLocaleString()} copies sold</span>
                  <span>{remainingCopies.toLocaleString()} needed</span>
                  <span>Goal: ${STUDIO3_PROJECT.fundingGoal.toLocaleString()}</span>
                </div>
              </div>

              {/* Purchase Section */}
              <div className="bg-black/30 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Pre-Order Digital Copies</h3>
                
                <div className="flex gap-4 mb-4">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={purchaseAmount === 0 ? '' : purchaseAmount}
                    onChange={(e) => setPurchaseAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="Number of copies"
                  />
                  <div className="px-4 py-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
                    <div className="text-white font-bold">${purchaseAmount}</div>
                    <div className="text-indigo-300 text-xs">{purchaseAmount * STUDIO3_PROJECT.tokenInfo.airdropRatio} S³ tokens</div>
                  </div>
                </div>
                
                <button
                  onClick={handlePurchase}
                  disabled={!publicKey || isProcessing}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white py-4 rounded-lg font-bold text-lg transition-all"
                >
                  {isProcessing ? 'Processing...' : publicKey ? `Pre-Order ${purchaseAmount} Copies` : 'Connect Wallet'}
                </button>
                
                <p className="text-xs text-gray-400 mt-3 text-center">
                  You'll receive your digital copy when the film is complete (Est. 6-8 months)
                </p>
              </div>
            </div>

            {/* Studio^3 Token Info */}
            <div id="tokens" className="bg-white/5 backdrop-blur rounded-xl p-8 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl font-bold text-purple-400">S³</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white">Studio³ Token</h2>
                    <div className="relative group">
                      <div className="w-4 h-4 bg-indigo-500/20 border border-indigo-400/40 rounded-full flex items-center justify-center cursor-help">
                        <span className="text-indigo-300 text-xs">i</span>
                      </div>
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 invisible group-hover:visible bg-gray-800 border border-indigo-400/30 rounded-lg p-3 w-64 z-50 shadow-xl">
                        <p className="text-xs text-gray-200">
                          <strong className="text-indigo-300">Governance Token:</strong> Holders can vote on future Studio³ decisions, receive revenue sharing from film profits, and influence production choices.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-purple-300">Future of Independent Film Funding</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-white font-bold mb-3">Token Utility</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {STUDIO3_PROJECT.tokenInfo.utilityFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-white font-bold mb-3">Token Economics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Supply:</span>
                      <span className="text-white">TBD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Airdrop Rate:</span>
                      <span className="text-white">1000 S³ per $1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Launch:</span>
                      <span className="text-white">Phase 4</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm">
                  <strong>How it works:</strong> Every dollar you spend on digital copies earns you 1000 Studio³ tokens. 
                  These tokens give you governance rights and revenue sharing from all future Studio³ productions.
                </p>
              </div>
            </div>

            {/* Production Roadmap */}
            <div id="roadmap" className="bg-white/5 backdrop-blur rounded-xl p-8 border border-amber-500/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                Production Roadmap - The End of The World
              </h2>
              
              <div className="space-y-4">
                {roadmapPhases.map((phase, index) => (
                  <div key={phase.id} className="bg-black/20 rounded-lg border border-white/10 overflow-hidden">
                    {/* Phase Header - Clickable */}
                    <button
                      onClick={() => togglePhase(phase.id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-all"
                    >
                      {/* Phase Info */}
                      <div className="flex-1 text-left">
                        <h3 className="text-white font-bold mb-1">{phase.title}</h3>
                        <p className="text-gray-300 text-sm mb-1">{phase.description}</p>
                        <div className={`text-xs ${phase.textColor}`}>{phase.statusText}</div>
                      </div>
                      
                      {/* Dropdown Arrow */}
                      <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedPhases[phase.id] ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Expandable Content */}
                    {expandedPhases[phase.id] && (
                      <div className="px-4 pb-4 border-t border-white/10">
                        <div className="ml-4 mt-4 space-y-1">
                          {phase.details.map((detail, detailIndex) => {
                            const dynamicStatus = getStepStatus(phase.id, detailIndex, detail.status)
                            return (
                              <div key={detailIndex} className="flex items-start gap-3 relative">
                                {/* Status Indicator with Connecting Line */}
                                <div className="flex flex-col items-center relative">
                                  {/* Status Dot - Clickable for admin */}
                                  <div 
                                    className={`relative z-10 ${isAdmin ? 'cursor-pointer' : ''}`}
                                    onClick={() => toggleStepCompletion(phase.id, detailIndex)}
                                  >
                                    {dynamicStatus === 'complete' ? (
                                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">✓</span>
                                      </div>
                                    ) : dynamicStatus === 'current' ? (
                                      <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 bg-gray-600 border border-gray-500 rounded-full"></div>
                                    )}
                                  </div>
                                  
                                  {/* Connecting Line - only if not the last item */}
                                  {detailIndex < phase.details.length - 1 && (
                                    <div className={`w-px h-8 ${
                                      dynamicStatus === 'complete' ? 'bg-green-500' :
                                      dynamicStatus === 'current' ? 'bg-blue-500' : 'bg-gray-600'
                                    }`}></div>
                                  )}
                                </div>
                                
                                {/* Detail Content */}
                                <div className="flex-1 pb-6">
                                  <span className={`text-sm ${
                                    dynamicStatus === 'complete' ? 'text-green-300' :
                                    dynamicStatus === 'current' ? 'text-blue-300' : 'text-gray-300'
                                  }`}>
                                    {detail.text}
                                  </span>
                                  
                                  {/* Progress Bar for Current Items */}
                                  {dynamicStatus === 'current' && detail.progress !== undefined && (
                                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(detail.progress, 100)}%` }}
                                      ></div>
                                    </div>
                                  )}
                                  
                                  {/* Admin indicator */}
                                  {isAdmin && (
                                    <div className="mt-1">
                                      <span className="text-xs text-yellow-400">Click dot to toggle completion</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>

            {/* Community Tab */}
            <div id="community" className="bg-white/5 backdrop-blur rounded-xl p-8 border border-blue-500/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                Community
              </h2>

              {/* Comment Input */}
              {publicKey ? (
                <div className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about the project..."
                    className="w-full bg-black/20 border border-white/20 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 min-h-[100px]"
                  />
                  
                  {/* Image Preview */}
                  {selectedImage && (
                    <div className="mt-3 relative">
                      <img 
                        src={selectedImage} 
                        alt="Preview" 
                        className="max-h-32 rounded-lg border border-white/20"
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">
                        {supporters.some((s: any) => s.wallet === publicKey.toString()) 
                          ? "DONOR" 
                          : "Connected wallet"}
                      </span>
                      
                      {/* Image Upload Button */}
                      <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-all">
                        Add Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <button
                      onClick={handleCommentSubmit}
                      disabled={!newComment.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 text-center py-8 bg-black/20 rounded-lg border border-white/10">
                  <p className="text-gray-400 mb-4">Connect your wallet to join the community discussion</p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-black/20 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 font-mono text-sm">
                            {formatWalletAddress(comment.wallet)}
                          </span>
                          {comment.isDonor && (
                            <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                              DONOR
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {comment.timestamp.toLocaleDateString()} {comment.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{comment.message}</p>
                      
                      {/* Display Image if exists */}
                      {comment.image && (
                        <img 
                          src={comment.image} 
                          alt="Comment attachment" 
                          className="mt-3 max-h-48 rounded-lg border border-white/20 cursor-pointer hover:opacity-90"
                          onClick={() => window.open(comment.image, '_blank')}
                        />
                      )}
                      
                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-semibold"
                      >
                        Reply {comment.replies && comment.replies.length > 0 && `(${comment.replies.length})`}
                      </button>
                      
                      {/* Reply Input */}
                      {replyingTo === comment.id && publicKey && (
                        <div className="mt-3 ml-4 border-l-2 border-blue-500/30 pl-4">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 min-h-[80px] text-sm"
                          />
                          
                          {/* Reply Image Preview */}
                          {selectedImage && (
                            <div className="mt-2 relative inline-block">
                              <img 
                                src={selectedImage} 
                                alt="Preview" 
                                className="max-h-24 rounded-lg border border-white/20"
                              />
                              <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-2">
                            <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
                              Image
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              onClick={() => handleReplySubmit(comment.id)}
                              disabled={!replyText.trim()}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1 rounded text-sm"
                            >
                              Post Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyText('')
                                setSelectedImage(null)
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Display Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-700 pl-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-black/30 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 font-mono text-xs">
                                    {formatWalletAddress(reply.wallet)}
                                  </span>
                                  {reply.isDonor && (
                                    <span className="bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded text-xs">
                                      DONOR
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {reply.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm">{reply.message}</p>
                              {reply.image && (
                                <img 
                                  src={reply.image} 
                                  alt="Reply attachment" 
                                  className="mt-2 max-h-32 rounded-lg border border-white/20 cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(reply.image, '_blank')}
                                />
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

          </div>

          {/* Right Column - Info & Stats */}
          <div className="space-y-6">
            
            {/* Your Investment */}
            {publicKey && userPurchases > 0 && (
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur rounded-xl p-6 border border-green-500/30">
                <h3 className="text-xl font-bold text-white mb-4">Your Investment</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Digital Copies:</span>
                    <span className="text-white font-bold">{userPurchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Spent:</span>
                    <span className="text-white font-bold">${userPurchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">S³ Tokens (Pending):</span>
                    <span className="text-purple-400 font-bold">{userPurchases * 100}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-xs">
                    You're an official Studio³ producer!
                  </p>
                </div>
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Campaign Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Supporters:</span>
                  <span className="text-white font-bold">{supporters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg. Purchase:</span>
                  <span className="text-white font-bold">
                    {supporters.length > 0 ? Math.round(copiesSold / supporters.length) : 0} copies
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">S³ to Airdrop:</span>
                  <span className="text-purple-400 font-bold">{(copiesSold * 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Days to Deadline:</span>
                  <span className="text-white font-bold">45</span>
                </div>
              </div>
            </div>

            {/* Recent Supporters */}
            {supporters.length > 0 && (
              <div id="supporters" className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Recent Supporters</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {supporters.slice(-10).reverse().map((supporter, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                          <span className="text-indigo-400 text-xs">#{supporters.length - i}</span>
                        </div>
                        <div>
                          <p className="text-white font-mono text-sm">
                            {supporter.wallet.slice(0, 4)}...{supporter.wallet.slice(-4)}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(supporter.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{supporter.copies} copies</p>
                        <p className="text-purple-400 text-xs">{supporter.futureAirdrop} S³</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why Support */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Why Support?</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>100% of funds go directly to production</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Transparent spending reports monthly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Own a piece of Studio³'s future</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Support independent filmmaking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Get credited as a producer</span>
                </li>
              </ul>
            </div>

            {/* Share */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-indigo-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Spread the Word</h3>
              <div className="space-y-3">
                <button className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white py-3 rounded-lg font-semibold">
                  Share on Twitter
                </button>
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold">
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}