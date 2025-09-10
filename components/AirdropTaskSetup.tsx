import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import InfoTooltip from './InfoTooltip'

interface AirdropTask {
  taskType: TaskType
  rewardAmount: number
  verificationData: string
  maxCompletions: number
  isActive: boolean
}

enum TaskType {
  TwitterFollow = 'TwitterFollow',
  TwitterRetweet = 'TwitterRetweet',
  TwitterLike = 'TwitterLike',
  DiscordJoin = 'DiscordJoin',
  TelegramJoin = 'TelegramJoin',
  InstagramFollow = 'InstagramFollow',
  InstagramStory = 'InstagramStory',
  EmailSubscribe = 'EmailSubscribe',
  WebsiteVisit = 'WebsiteVisit',
  Referral = 'Referral',
  Custom = 'Custom'
}

enum RewardMode {
  PerTask = 'PerTask',
  AllRequired = 'AllRequired'
}

interface AirdropTaskSetupProps {
  campaignPubkey: string
  onClose: () => void
  onSave: (config: any) => void
}

const TASK_TYPE_LABELS = {
  [TaskType.TwitterFollow]: 'Follow on Twitter',
  [TaskType.TwitterRetweet]: 'Retweet Post',
  [TaskType.TwitterLike]: 'Like Tweet',
  [TaskType.DiscordJoin]: 'Join Discord Server',
  [TaskType.TelegramJoin]: 'Join Telegram Channel',
  [TaskType.InstagramFollow]: 'Follow on Instagram',
  [TaskType.InstagramStory]: 'Repost Instagram Story',
  [TaskType.EmailSubscribe]: 'Subscribe to Newsletter',
  [TaskType.WebsiteVisit]: 'Visit Website',
  [TaskType.Referral]: 'Refer a Friend',
  [TaskType.Custom]: 'Custom Task'
}

const TASK_TYPE_DESCRIPTIONS = {
  [TaskType.TwitterFollow]: 'Users follow your Twitter account',
  [TaskType.TwitterRetweet]: 'Users retweet a specific post',
  [TaskType.TwitterLike]: 'Users like a specific tweet',
  [TaskType.DiscordJoin]: 'Users join your Discord server',
  [TaskType.TelegramJoin]: 'Users join your Telegram channel',
  [TaskType.InstagramFollow]: 'Users follow your Instagram account',
  [TaskType.InstagramStory]: 'Users repost to their Instagram story',
  [TaskType.EmailSubscribe]: 'Users subscribe to your newsletter',
  [TaskType.WebsiteVisit]: 'Users visit your website',
  [TaskType.Referral]: 'Users refer friends to complete tasks',
  [TaskType.Custom]: 'Define your own custom task'
}

const TASK_TYPE_PLACEHOLDERS = {
  [TaskType.TwitterFollow]: '@username',
  [TaskType.TwitterRetweet]: 'Tweet URL',
  [TaskType.TwitterLike]: 'Tweet URL', 
  [TaskType.DiscordJoin]: 'Discord invite link',
  [TaskType.TelegramJoin]: 'Telegram channel link',
  [TaskType.InstagramFollow]: '@username',
  [TaskType.InstagramStory]: '@username',
  [TaskType.EmailSubscribe]: 'Newsletter signup URL',
  [TaskType.WebsiteVisit]: 'Website URL',
  [TaskType.Referral]: 'Minimum referrals (e.g., "3")',
  [TaskType.Custom]: 'Task instructions'
}

export default function AirdropTaskSetup({ campaignPubkey, onClose, onSave }: AirdropTaskSetupProps) {
  const { publicKey } = useWallet()
  const [rewardMode, setRewardMode] = useState<RewardMode>(RewardMode.PerTask)
  const [bundleReward, setBundleReward] = useState<number>(0)
  const [totalBudgetPercentage, setTotalBudgetPercentage] = useState<number>(5)
  const [endDate, setEndDate] = useState<string>('30')
  const [tasks, setTasks] = useState<AirdropTask[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTask = () => {
    const newTask: AirdropTask = {
      taskType: TaskType.TwitterFollow,
      rewardAmount: 100,
      verificationData: '',
      maxCompletions: 1000,
      isActive: true
    }
    setTasks([...tasks, newTask])
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const updateTask = (index: number, field: keyof AirdropTask, value: any) => {
    const updatedTasks = [...tasks]
    updatedTasks[index] = { ...updatedTasks[index], [field]: value }
    setTasks(updatedTasks)
  }

  const calculateTotalBudget = () => {
    // Assuming 1B total supply for calculation
    const totalSupply = 1000000000
    return Math.floor((totalBudgetPercentage / 100) * totalSupply)
  }

  const calculateTotalRewards = () => {
    if (rewardMode === RewardMode.AllRequired) {
      return bundleReward * 1000 // Estimate for 1000 completions
    }
    return tasks.reduce((total, task) => total + (task.rewardAmount * task.maxCompletions), 0)
  }

  const validateConfig = () => {
    if (tasks.length === 0) return 'Add at least one task'
    if (totalBudgetPercentage <= 0) return 'Set a total budget percentage'
    if (calculateTotalRewards() > calculateTotalBudget()) return 'Total rewards exceed budget'
    // No validation needed for end date since dropdown always has a value
    
    for (const task of tasks) {
      if (!task.verificationData.trim()) return 'All tasks need verification data'
      if (task.rewardAmount <= 0) return 'All tasks need positive rewards'
      if (task.maxCompletions <= 0) return 'All tasks need max completions'
    }
    
    return null
  }

  const handleSubmit = async () => {
    const error = validateConfig()
    if (error) {
      alert(error)
      return
    }

    setIsSubmitting(true)
    try {
      const config = {
        rewardMode,
        tasks: tasks.map(task => ({
          task_type: task.taskType,
          reward_amount: task.rewardAmount,
          verification_data: task.verificationData,
          max_completions: task.maxCompletions,
          completed_count: 0,
          is_active: task.isActive
        })),
        bundle_reward: bundleReward,
        total_budget: calculateTotalBudget(),
        tokens_distributed: 0,
        is_active: true,
        end_timestamp: endDate === 'no_end_date' ? null : new Date().getTime() / 1000 + (parseInt(endDate) * 24 * 60 * 60)
      }

      // TODO: Call smart contract setup_airdrop_tasks instruction
      console.log('Airdrop config:', config)
      
      onSave(config)
      onClose()
    } catch (error) {
      console.error('Error setting up airdrop:', error)
      alert('Failed to setup airdrop tasks')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalBudget = calculateTotalBudget()
  const totalRewards = calculateTotalRewards()
  const budgetExceeded = totalRewards > totalBudget

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Setup Airdrop Tasks</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Reward Mode Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              Reward Mode
              <InfoTooltip text="Choose how users earn tokens: Per Task (immediate rewards for each task) or Bundle (reward only after completing all tasks)." />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  rewardMode === RewardMode.PerTask
                    ? 'border-purple-400 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setRewardMode(RewardMode.PerTask)}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    rewardMode === RewardMode.PerTask ? 'bg-purple-400' : 'bg-gray-400'
                  }`} />
                  <h4 className="font-semibold text-white">Per Task Rewards</h4>
                </div>
                <p className="text-sm text-gray-300">
                  Users earn tokens for each task they complete independently
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  rewardMode === RewardMode.AllRequired
                    ? 'border-purple-400 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setRewardMode(RewardMode.AllRequired)}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    rewardMode === RewardMode.AllRequired ? 'bg-purple-400' : 'bg-gray-400'
                  }`} />
                  <h4 className="font-semibold text-white">All Tasks Required</h4>
                </div>
                <p className="text-sm text-gray-300">
                  Users must complete ALL tasks to receive bundle reward
                </p>
              </div>
            </div>
          </div>

          {/* Budget and Bundle Reward */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <span className="flex items-center">
                  Total Token Budget (%)
                  <InfoTooltip text="Percentage of total token supply to allocate for airdrop tasks. 5% is recommended for most projects - enough to incentivize community growth while preserving token value." />
                </span>
              </label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={totalBudgetPercentage}
                onChange={(e) => setTotalBudgetPercentage(Number(e.target.value))}
                placeholder="5"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                {totalBudgetPercentage}% of 1B supply = {totalBudget.toLocaleString()} tokens
              </p>
            </div>

            {rewardMode === RewardMode.AllRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <span className="flex items-center">
                    Bundle Reward (tokens)
                    <InfoTooltip text="Tokens awarded when a user completes ALL tasks. Higher rewards encourage full completion but may reduce participation." />
                  </span>
                </label>
                <input
                  type="number"
                  value={bundleReward}
                  onChange={(e) => setBundleReward(Number(e.target.value))}
                  placeholder="2000"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <span className="flex items-center">
                  Duration
                  <InfoTooltip text="How long airdrop tasks will accept new completions. Choose 'No End Date' for unlimited duration or set a specific period." />
                </span>
              </label>
              <select
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="no_end_date">No End Date</option>
              </select>
            </div>
          </div>

          {/* Budget Warning */}
          {budgetExceeded && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400 rounded-lg">
              <p className="text-red-400 text-sm">
                ⚠️ Total rewards ({totalRewards.toLocaleString()}) exceed budget ({totalBudget.toLocaleString()})
              </p>
            </div>
          )}

          {/* Tasks Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Tasks</h3>
              <button
                onClick={addTask}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Task
              </button>
            </div>

            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-white">Task {index + 1}</h4>
                    <button
                      onClick={() => removeTask(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center">
                          Task Type
                          <InfoTooltip text="Choose the type of action users must complete. Different types require different verification data." />
                        </span>
                      </label>
                      <select
                        value={task.taskType}
                        onChange={(e) => updateTask(index, 'taskType', e.target.value as TaskType)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                      >
                        {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-gray-800">
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center">
                          Reward (tokens)
                          <InfoTooltip text="Number of tokens users receive for completing this specific task. Balance reward size with your total budget." />
                        </span>
                      </label>
                      <input
                        type="number"
                        value={task.rewardAmount}
                        onChange={(e) => updateTask(index, 'rewardAmount', Number(e.target.value))}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center">
                          Max Completions
                          <InfoTooltip text="Maximum number of users who can complete this task. Prevents unlimited token distribution and helps control budget." />
                        </span>
                      </label>
                      <input
                        type="number"
                        value={task.maxCompletions}
                        onChange={(e) => updateTask(index, 'maxCompletions', Number(e.target.value))}
                        placeholder="1000"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={task.isActive}
                          onChange={(e) => updateTask(index, 'isActive', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-300">Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center">
                        Verification Data
                        <InfoTooltip text="The specific information needed to verify task completion (e.g., @username for follows, tweet URL for retweets, custom instructions)." />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={task.verificationData}
                      onChange={(e) => updateTask(index, 'verificationData', e.target.value)}
                      placeholder={TASK_TYPE_PLACEHOLDERS[task.taskType]}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {TASK_TYPE_DESCRIPTIONS[task.taskType]}
                    </p>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No tasks added yet. Click "Add Task" to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {tasks.length > 0 && (
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="font-semibold text-white mb-2">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Tasks:</span>
                  <span className="text-white ml-2">{tasks.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Estimated Rewards:</span>
                  <span className={`ml-2 ${budgetExceeded ? 'text-red-400' : 'text-white'}`}>
                    {totalRewards.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Budget:</span>
                  <span className="text-white ml-2">{totalBudget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Mode:</span>
                  <span className="text-white ml-2">
                    {rewardMode === RewardMode.PerTask ? 'Per Task' : 'Bundle'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !!validateConfig()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
            >
              {isSubmitting ? 'Setting up...' : 'Setup Airdrop Tasks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}