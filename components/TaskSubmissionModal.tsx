import { useState, useRef } from 'react'
import { PhotoIcon, LinkIcon, DocumentTextIcon, KeyIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface TaskSubmissionModalProps {
  taskName: string
  taskType: string
  onSubmit: (proof: {
    type: 'link' | 'screenshot' | 'text' | 'code'
    content: string
    imageUrl?: string
    additionalNotes?: string
  }) => void
  onClose: () => void
}

export default function TaskSubmissionModal({ taskName, taskType, onSubmit, onClose }: TaskSubmissionModalProps) {
  const [proofType, setProofType] = useState<'link' | 'screenshot' | 'text' | 'code'>('link')
  const [content, setContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImagePreview(base64String)
        setContent(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!content && proofType !== 'screenshot') {
      alert('Please provide proof of completion')
      return
    }

    if (proofType === 'screenshot' && !imagePreview) {
      alert('Please upload a screenshot')
      return
    }

    setIsSubmitting(true)

    const proof = {
      type: proofType,
      content: content,
      imageUrl: proofType === 'screenshot' ? imagePreview || undefined : undefined,
      additionalNotes: additionalNotes || undefined
    }

    onSubmit(proof)
  }

  const getPlaceholder = () => {
    switch (proofType) {
      case 'link':
        return 'https://twitter.com/yourusername/status/...'
      case 'text':
        return 'Describe how you completed the task...'
      case 'code':
        return 'Enter your completion code...'
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
      <div className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-xl rounded-xl border border-purple-400/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-purple-400/20">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Submit Task Completion</h2>
              <p className="text-purple-200 text-sm">{taskName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Proof Type Selection */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-3">
              How would you like to submit your proof?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProofType('link')}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  proofType === 'link'
                    ? 'bg-purple-500/30 border-purple-400 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                <span>Link</span>
              </button>
              
              <button
                onClick={() => setProofType('screenshot')}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  proofType === 'screenshot'
                    ? 'bg-purple-500/30 border-purple-400 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <PhotoIcon className="w-5 h-5" />
                <span>Screenshot</span>
              </button>
              
              <button
                onClick={() => setProofType('text')}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  proofType === 'text'
                    ? 'bg-purple-500/30 border-purple-400 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span>Description</span>
              </button>
              
              <button
                onClick={() => setProofType('code')}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  proofType === 'code'
                    ? 'bg-purple-500/30 border-purple-400 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <KeyIcon className="w-5 h-5" />
                <span>Code</span>
              </button>
            </div>
          </div>

          {/* Proof Input */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              {proofType === 'screenshot' ? 'Upload Screenshot' : 'Enter Proof'}
            </label>
            
            {proofType === 'screenshot' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Screenshot preview"
                      className="w-full rounded-lg border border-purple-400/30"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null)
                        setContent('')
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 bg-white/5 border-2 border-dashed border-purple-400/30 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                    <p className="text-purple-200 text-sm">Click to upload screenshot</p>
                    <p className="text-purple-300 text-xs mt-1">Max 5MB, PNG/JPG</p>
                  </button>
                )}
              </div>
            ) : proofType === 'text' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 min-h-[120px]"
                maxLength={1000}
              />
            ) : (
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                maxLength={500}
              />
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional context for the reviewer..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
            <p className="text-purple-200 text-sm">
              <strong>⏱️ Review Time:</strong> Most submissions are reviewed within 24 hours.
            </p>
            <p className="text-purple-200 text-sm mt-2">
              <strong>💰 Reward:</strong> You'll receive tokens automatically once approved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-400/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content && proofType !== 'screenshot') || (proofType === 'screenshot' && !imagePreview)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Proof'}
          </button>
        </div>
      </div>
    </div>
  )
}