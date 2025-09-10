import { useState } from 'react'
import { PlusIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline'
import InfoTooltip from './InfoTooltip'

interface RoadmapStage {
  name: string
  description: string
  deliverables: string[]
}

interface RoadmapSetupProps {
  onClose: () => void
  onSave: (roadmapConfig: any) => void
}

export default function RoadmapSetup({ onClose, onSave }: RoadmapSetupProps) {
  const [roadmapStages, setRoadmapStages] = useState<RoadmapStage[]>([
    {
      name: '',
      description: '',
      deliverables: ['']
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addRoadmapStage = () => {
    setRoadmapStages([...roadmapStages, {
      name: '',
      description: '',
      deliverables: ['']
    }])
  }

  const removeRoadmapStage = (index: number) => {
    if (roadmapStages.length > 1) {
      setRoadmapStages(roadmapStages.filter((_, i) => i !== index))
    }
  }

  const updateRoadmapStage = (index: number, field: string, value: any) => {
    const updatedStages = [...roadmapStages]
    updatedStages[index] = { ...updatedStages[index], [field]: value }
    setRoadmapStages(updatedStages)
  }

  const addDeliverable = (stageIndex: number) => {
    const updatedStages = [...roadmapStages]
    updatedStages[stageIndex].deliverables.push('')
    setRoadmapStages(updatedStages)
  }

  const removeDeliverable = (stageIndex: number, deliverableIndex: number) => {
    const updatedStages = [...roadmapStages]
    if (updatedStages[stageIndex].deliverables.length > 1) {
      updatedStages[stageIndex].deliverables.splice(deliverableIndex, 1)
      setRoadmapStages(updatedStages)
    }
  }

  const updateDeliverable = (stageIndex: number, deliverableIndex: number, value: string) => {
    const updatedStages = [...roadmapStages]
    updatedStages[stageIndex].deliverables[deliverableIndex] = value
    setRoadmapStages(updatedStages)
  }

  const validateConfig = () => {
    if (roadmapStages.length === 0) return 'Add at least one stage'
    
    for (const stage of roadmapStages) {
      if (!stage.name.trim()) return 'All stages need names'
      if (!stage.description.trim()) return 'All stages need descriptions'
      if (stage.deliverables.some(d => !d.trim())) return 'All deliverables need descriptions'
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
        stages: roadmapStages.map((stage, index) => ({
          index,
          name: stage.name,
          description: stage.description,
          deliverables: stage.deliverables.filter(d => d.trim()),
          is_completed: false
        })),
        total_stages: roadmapStages.length,
        is_active: true
      }

      onSave(config)
      onClose()
    } catch (error) {
      console.error('Error setting up roadmap:', error)
      alert('Failed to setup roadmap')
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-end items-center mb-6">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Header with Add Stage Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Setup Project Roadmap</h2>
            <button
              type="button"
              onClick={addRoadmapStage}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Stage
            </button>
          </div>

          {/* Stages */}
          <div className="space-y-6 mb-6">
            {roadmapStages.map((stage, stageIndex) => (
              <div key={stageIndex} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-white">Stage {stageIndex + 1}</h4>
                  {roadmapStages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoadmapStage(stageIndex)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center">
                      Stage Name
                      <InfoTooltip text="A clear, descriptive name for this milestone (e.g., 'MVP Development', 'Beta Launch')." />
                    </span>
                  </label>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateRoadmapStage(stageIndex, 'name', e.target.value)}
                    placeholder="e.g., MVP Development"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center">
                      Stage Description
                      <InfoTooltip text="Brief description of what will be accomplished in this stage." />
                    </span>
                  </label>
                  <textarea
                    value={stage.description}
                    onChange={(e) => updateRoadmapStage(stageIndex, 'description', e.target.value)}
                    rows={2}
                    placeholder="Describe what will be delivered in this stage..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      <span className="flex items-center">
                        Deliverables
                        <InfoTooltip text="Specific, measurable outcomes that will be completed in this stage." />
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => addDeliverable(stageIndex)}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      + Add Deliverable
                    </button>
                  </div>
                  <div className="space-y-2">
                    {stage.deliverables.map((deliverable, deliverableIndex) => (
                      <div key={deliverableIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={deliverable}
                          onChange={(e) => updateDeliverable(stageIndex, deliverableIndex, e.target.value)}
                          placeholder="e.g., Smart contracts deployed on mainnet"
                          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                        />
                        {stage.deliverables.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDeliverable(stageIndex, deliverableIndex)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>


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
              {isSubmitting ? 'Setting up...' : 'Setup Roadmap'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}