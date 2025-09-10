import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface InfoTooltipProps {
  text: string
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <div className="relative inline-block ml-1 group">
      <div className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors inline-flex items-center justify-center cursor-help">
        <InformationCircleIcon className="w-3 h-3 text-gray-400" />
      </div>
      
      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
        <div className="bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-lg p-3 max-w-xs w-max shadow-xl border border-gray-700">
          <div className="relative">
            {text}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-px">
              <div className="border-4 border-transparent border-t-gray-900/95"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}