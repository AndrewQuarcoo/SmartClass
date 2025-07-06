"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, Lock, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubtopicProgress {
  id: string
  title: string
  completed: boolean
  currentStep: number
  totalSteps: number
  score?: number
  timeSpent?: number // in minutes
  lastAccessed?: Date
  difficulty: 'easy' | 'medium' | 'hard'
}

interface EnhancedProgressRingProps {
  subtopic: SubtopicProgress
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  onClick?: () => void
  className?: string
}

export default function EnhancedProgressRing({
  subtopic,
  size = 'md',
  showDetails = true,
  onClick,
  className
}: EnhancedProgressRingProps) {
  const progress = subtopic.totalSteps > 0 ? (subtopic.currentStep / subtopic.totalSteps) * 100 : 0
  const isCompleted = subtopic.completed
  const isStarted = subtopic.currentStep > 0
  const isLocked = !isStarted && subtopic.currentStep === 0

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-16 h-16',
      ring: 'w-14 h-14',
      strokeWidth: 3,
      text: 'text-xs',
      icon: 12
    },
    md: {
      container: 'w-20 h-20',
      ring: 'w-18 h-18',
      strokeWidth: 4,
      text: 'text-sm',
      icon: 16
    },
    lg: {
      container: 'w-24 h-24',
      ring: 'w-22 h-22',
      strokeWidth: 5,
      text: 'text-base',
      icon: 20
    }
  }

  const config = sizeConfig[size]
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Color schemes based on status and difficulty
  const getColorScheme = () => {
    if (isCompleted) {
      return {
        ring: 'stroke-green-500',
        background: 'stroke-green-100',
        text: 'text-green-600',
        icon: 'text-green-600',
        glow: 'shadow-green-200'
      }
    }
    if (isStarted) {
      const difficultyColors = {
        easy: {
          ring: 'stroke-blue-500',
          background: 'stroke-blue-100',
          text: 'text-blue-600',
          icon: 'text-blue-600',
          glow: 'shadow-blue-200'
        },
        medium: {
          ring: 'stroke-yellow-500',
          background: 'stroke-yellow-100',
          text: 'text-yellow-600',
          icon: 'text-yellow-600',
          glow: 'shadow-yellow-200'
        },
        hard: {
          ring: 'stroke-purple-500',
          background: 'stroke-purple-100',
          text: 'text-purple-600',
          icon: 'text-purple-600',
          glow: 'shadow-purple-200'
        }
      }
      return difficultyColors[subtopic.difficulty]
    }
    return {
      ring: 'stroke-gray-300',
      background: 'stroke-gray-100',
      text: 'text-gray-400',
      icon: 'text-gray-400',
      glow: 'shadow-gray-100'
    }
  }

  const colors = getColorScheme()

  const renderIcon = () => {
    if (isCompleted) {
      return <CheckCircle size={config.icon} className={colors.icon} />
    }
    if (isStarted) {
      return <Clock size={config.icon} className={colors.icon} />
    }
    return <Lock size={config.icon} className={colors.icon} />
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <div className={cn("relative group", className)}>
      <motion.div
        className={cn(
          "relative flex items-center justify-center cursor-pointer",
          config.container,
          onClick && "hover:scale-105 transition-transform duration-200"
        )}
        onClick={onClick}
        whileHover={{ scale: onClick ? 1.05 : 1 }}
        whileTap={{ scale: onClick ? 0.95 : 1 }}
      >
        {/* Progress Ring */}
        <svg
          className={cn("absolute inset-0", config.ring)}
          viewBox="0 0 100 100"
          style={{ filter: isCompleted ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))' : undefined }}
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth={config.strokeWidth}
            className={colors.background}
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className={colors.ring}
            style={{
              strokeDasharray,
              strokeDashoffset,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            transform="rotate(-90 50 50)"
          />
        </svg>

        {/* Center Content */}
        <div className="flex flex-col items-center justify-center">
          {size !== 'sm' && renderIcon()}
          {size === 'lg' && (
            <motion.div 
              className={cn("mt-1 font-semibold", config.text, colors.text)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Math.round(progress)}%
            </motion.div>
          )}
        </div>

        {/* Score badge for completed subtopics */}
        {isCompleted && subtopic.score && size !== 'sm' && (
          <motion.div
            className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
          >
            <Star size={12} fill="currentColor" />
          </motion.div>
        )}
      </motion.div>

      {/* Tooltip/Details */}
      {showDetails && (
        <motion.div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10"
          initial={false}
        >
          <div className="font-semibold">{subtopic.title}</div>
          <div className="text-gray-300">
            {isCompleted ? (
              <>
                Completed • Score: {subtopic.score}%
                {subtopic.timeSpent && ` • ${formatTime(subtopic.timeSpent)}`}
              </>
            ) : isStarted ? (
              <>
                Step {subtopic.currentStep} of {subtopic.totalSteps}
                {subtopic.timeSpent && ` • ${formatTime(subtopic.timeSpent)}`}
              </>
            ) : (
              'Click to start'
            )}
          </div>
          
          {/* Difficulty indicator */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-gray-400">Difficulty:</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "w-1 h-2 rounded-sm",
                    level <= (subtopic.difficulty === 'easy' ? 1 : subtopic.difficulty === 'medium' ? 2 : 3)
                      ? 'bg-white'
                      : 'bg-gray-600'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black" />
        </motion.div>
      )}
    </div>
  )
}

// Progress ring group component for displaying multiple subtopics
interface ProgressRingGroupProps {
  subtopics: SubtopicProgress[]
  title?: string
  layout?: 'horizontal' | 'grid'
  onSubtopicClick?: (subtopicId: string) => void
  className?: string
}

export function ProgressRingGroup({
  subtopics,
  title,
  layout = 'horizontal',
  onSubtopicClick,
  className
}: ProgressRingGroupProps) {
  const completedCount = subtopics.filter(s => s.completed).length
  const totalCount = subtopics.length
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold dark:text-white">{title}</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {completedCount}/{totalCount} completed ({Math.round(overallProgress)}%)
          </div>
        </div>
      )}

      <div className={cn(
        layout === 'grid' 
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          : "flex flex-wrap gap-4"
      )}>
        {subtopics.map((subtopic) => (
          <motion.div
            key={subtopic.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <EnhancedProgressRing
              subtopic={subtopic}
              size="md"
              onClick={() => onSubtopicClick?.(subtopic.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
} 