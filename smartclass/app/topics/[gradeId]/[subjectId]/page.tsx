"use client"
import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { topics } from "@/data/topics"
import { grades } from "@/data/grades"
import { subjects } from "@/data/subjects"
import SubjectIcon from "@/components/subject-icon"
import LevelCard from "@/components/level-card"
import { getAITopicsForSubject } from "@/data/ai-content"
import type { TopicDescription } from "@/lib/api-client"

export default function TopicsPage({
  params,
}: {
  params: Promise<{ gradeId: string; subjectId: string }>
}) {
  const router = useRouter()
  const { gradeId, subjectId } = use(params)

  const grade = grades.find((g) => g.id === gradeId)
  const subject = subjects.find((s) => s.id === subjectId)

  // State for AI-generated topics
  const [aiTopics, setAiTopics] = useState<TopicDescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [useAI, setUseAI] = useState(true)

  // Load AI topics when component mounts
  useEffect(() => {
    const loadAITopics = async () => {
      setIsLoading(true)
      try {
        // Generate ALL topics from syllabus, not just 5
        const generatedTopics = await getAITopicsForSubject(subjectId, gradeId, 10)
        setAiTopics(generatedTopics)
        setUseAI(true)
      } catch (error) {
        console.error('Failed to load AI topics:', error)
        setUseAI(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadAITopics()
  }, [subjectId, gradeId])

  // Use AI topics if available, otherwise fallback to static topics
  const displayTopics = useAI && aiTopics.length > 0 ? aiTopics : topics.filter((topic) => topic.subjectId === subjectId)

  // Group topics by level (works for both AI and static topics)
  const topicsByLevel = displayTopics.reduce(
    (acc, topic, index) => {
      const level = topic.level || index + 1
      if (!acc[level]) {
        acc[level] = []
      }
      acc[level].push(topic)
      return acc
    },
    {} as Record<number, any[]>,
  )

  const levels = Object.keys(topicsByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  const handleStartTopic = (topicId: string) => {
    if (useAI && aiTopics.length > 0) {
      // For AI topics, use the topic_id directly and create a default subtopic
      router.push(`/content/${gradeId}/${subjectId}/${topicId}/introduction`)
    } else {
      // For static topics, find the topic and use its first subtopic
      const topic = topics.find((t) => t.id === topicId)
      if (topic && topic.subtopics && topic.subtopics.length > 0) {
        router.push(`/content/${gradeId}/${subjectId}/${topicId}/${topic.subtopics[0].id}`)
      }
    }
  }

  const handleBack = () => {
    router.push(`/subject-introduction/${gradeId}/${subjectId}`)
  }

  const handleGetStarted = () => {
    // Find the first topic of the first level
    if (levels.length > 0 && topicsByLevel[levels[0]].length > 0) {
      const firstTopic = topicsByLevel[levels[0]][0]
      
      if (useAI && aiTopics.length > 0) {
        // For AI topics, use topic_id directly
        router.push(`/content/${gradeId}/${subjectId}/${firstTopic.topic_id}/introduction`)
      } else if (firstTopic.subtopics && firstTopic.subtopics.length > 0) {
        // For static topics, use first subtopic
        router.push(`/content/${gradeId}/${subjectId}/${firstTopic.id}/${firstTopic.subtopics[0].id}`)
      }
    }
  }

  // Get subject description
  const getSubjectDescription = () => {
    switch (subjectId) {
      case "mathematics":
        return "Master key mathematical concepts and problem-solving techniques"
      case "english":
        return "Develop essential reading, writing, and communication skills"
      case "science":
        return "Master key scientific ideas & technologies of the future"
      case "social-studies":
        return "Understand societies, cultures, and human interactions"
      case "coding":
        return "Build programming skills and computational thinking"
      case "maps":
        return "Explore geography and spatial relationships"
      default:
        return `Master key concepts in ${subject?.name || "this subject"}`
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span>Back</span>
        </button>

        <div className="flex flex-col items-center text-center mb-12">
          <div className="mb-4">
            <SubjectIcon subject={subjectId} size="large" />
          </div>
          <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            YOUR LEARNING PATH
          </div>
          <h1 className="text-3xl font-bold mb-2 dark:text-white">{subject?.name || "Subject"}</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-lg">{getSubjectDescription()}</p>
          
          {/* AI Status Indicator */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {isLoading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-transparent mr-2"></div>
                Loading AI curriculum...
              </span>
            ) : useAI && aiTopics.length > 0 ? (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                AI-Generated Topics from Syllabus
              </span>
            ) : (
              <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                Using Fallback Topics
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-40"
              />
            ))
          ) : (
            levels.map((level, index) => {
              const levelTopics = topicsByLevel[level]
              const firstTopic = levelTopics[0]

              // Handle both AI topics and static topics
              const topicId = useAI ? firstTopic.topic_id : firstTopic.id
              const title = firstTopic.title
              const description = firstTopic.description

              return (
                <LevelCard
                  key={level}
                  level={level}
                  title={title}
                  description={description}
                  isRecommended={index === 0}
                  isActive={index === 0}
                  onClick={() => handleStartTopic(topicId)}
                />
              )
            })
          )}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleGetStarted}
            className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white px-12 py-6 rounded-full text-lg"
          >
            Get started
          </Button>
        </div>
      </div>
    </div>
  )
}
