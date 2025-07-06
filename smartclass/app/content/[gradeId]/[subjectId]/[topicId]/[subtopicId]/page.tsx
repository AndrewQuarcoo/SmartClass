"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ContentCard from "@/components/content-card"
import QuizCard from "@/components/quiz-card"
import { grades } from "@/data/grades"
import { subjects } from "@/data/subjects"
import { topics } from "@/data/topics"
import { getAIContentForSubtopic, getAIQuizForTopic, isAIContentAvailable, AIContentCard, AIQuizQuestion } from "@/data/ai-content"
import CompletionScreen from "@/components/completion-screen"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import SubjectIcon from "@/components/subject-icon"
import { completeLesson, completeQuiz } from "@/lib/gamification"
import { AchievementToast } from "@/components/gamification/achievement-toast"

type ContentState =
  | "intro"
  | "content"
  | "thank-you"
  | "main-quiz"
  | "main-quiz-review"
  | "exam-practice"
  | "exam-review"
  | "completion"

export default function ContentPage({
  params,
}: {
  params: { gradeId: string; subjectId: string; topicId: string; subtopicId: string }
}) {
  const router = useRouter()
  const { gradeId, subjectId, topicId, subtopicId } = params

  const [contentState, setContentState] = useState<ContentState>("intro")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizResults, setQuizResults] = useState<Record<number, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  const [showAchievement, setShowAchievement] = useState(false)
  const [achievementData, setAchievementData] = useState({ title: "", description: "", xp: 0 })

  // AI content state
  const [content, setContent] = useState<AIContentCard[]>([])
  const [mainQuiz, setMainQuiz] = useState<AIQuizQuestion[]>([])
  const [examQuiz, setExamQuiz] = useState<AIQuizQuestion[]>([])
  const [aiServiceStatus, setAiServiceStatus] = useState<string>('')

  const grade = grades.find((g) => g.id === gradeId)
  const subject = subjects.find((s) => s.id === subjectId)
  const topic = topics.find((t) => t.id === topicId)
  const subtopic = topic?.subtopics.find((s) => s.id === subtopicId)

  // Load AI content when component mounts or subtopic changes
  useEffect(() => {
    const loadAIContent = async () => {
      setIsLoading(true)
      
      try {
        // Check AI service status
        const status = await isAIContentAvailable()
        setAiServiceStatus(status.message)
        
        // Load content and quizzes
        const [contentData, mainQuizData, examQuizData] = await Promise.all([
          getAIContentForSubtopic(subtopicId, topicId, subjectId, gradeId, 5),
          getAIQuizForTopic(topicId, subtopicId, subjectId, gradeId, "main"),
          getAIQuizForTopic(topicId, subtopicId, subjectId, gradeId, "exam")
        ])
        
        setContent(contentData)
        setMainQuiz(mainQuizData)
        setExamQuiz(examQuizData)
      } catch (error) {
        console.error('Error loading AI content:', error)
        setAiServiceStatus('Error loading content. Using fallback.')
      } finally {
        setIsLoading(false)
      }
    }

    // Reset state when navigating to a new subtopic
    setContentState("intro")
    setCurrentCardIndex(0)
    setQuizAnswers({})
    setQuizResults({})
    
    loadAIContent()
  }, [subtopicId, topicId, subjectId, gradeId])

  useEffect(() => {
    if (contentState === "thank-you") {
      // Mark lesson as completed
      completeLesson(`${topicId}-${subtopicId}`)

      // Show achievement toast
      setAchievementData({
        title: "Lesson Completed!",
        description: `You've completed ${subtopic?.title || "this lesson"}`,
        xp: 20,
      })
      setShowAchievement(true)
    } else if (contentState === "main-quiz-review") {
      // Calculate score
      const correctAnswers = Object.values(quizResults).filter((result) => result).length
      const totalQuestions = mainQuiz.length
      const score = Math.round((correctAnswers / totalQuestions) * 100)

      // Mark quiz as completed
      completeQuiz(`${topicId}-${subtopicId}-quiz`, score)

      // Show achievement toast
      setAchievementData({
        title: "Quiz Completed!",
        description: `You scored ${score}% on this quiz`,
        xp: Math.round(30 * (score / 100)),
      })
      setShowAchievement(true)
    }
  }, [contentState, topicId, subtopicId, quizResults, mainQuiz, subtopic?.title])

  // Introduction and thank you content
  const introContent = [
    {
      title: `Introduction to ${topic?.title || "Topic"}`,
      body: `<p>Welcome to this lesson on ${topic?.title || "this topic"}!</p>
             <p>In this module, you will learn about:</p>
             <ul class="list-disc pl-6 my-4 space-y-2">
               <li>${topic?.description || "Various concepts related to this topic"}</li>
               <li>Key principles and applications</li>
               <li>Practical examples and exercises</li>
             </ul>
             <p>Let's get started with our first subtopic: <strong>${subtopic?.title || "Subtopic"}</strong></p>`,
    },
  ]

  const thankYouContent = [
    {
      title: `Thank You for Completing ${subtopic?.title || "This Subtopic"}`,
      body: `<p>Congratulations on completing this subtopic!</p>
             <p>You've learned about:</p>
             <ul class="list-disc pl-6 my-4 space-y-2">
               <li>${subtopic?.description || "Key concepts in this subtopic"}</li>
               <li>Important principles and applications</li>
               <li>Practical examples and exercises</li>
             </ul>
             <p>Now it's time to test your knowledge with a quiz!</p>`,
    },
  ]

  // Helper functions to convert AI types to component-expected types
  const convertQuizForComponent = (quiz: AIQuizQuestion[]) => {
    return quiz.map(q => ({
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correct_answer,
      explanation: q.explanation
    }))
  }

  const convertContentForComponent = (content: AIContentCard[]) => {
    return content.map(c => ({
      title: c.title,
      body: c.body,
      image: c.image
    }))
  }

  // Determine the current content based on state
  const currentContent = (() => {
    switch (contentState) {
      case "intro":
        return introContent
      case "content":
        return convertContentForComponent(content)
      case "thank-you":
        return thankYouContent
      case "main-quiz":
      case "main-quiz-review":
        return convertQuizForComponent(mainQuiz)
      case "exam-practice":
      case "exam-review":
        return convertQuizForComponent(examQuiz)
      default:
        return []
    }
  })()

  const handleNextCard = () => {
    if (currentCardIndex < currentContent.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
    } else {
      // Transition to next state based on current state
      switch (contentState) {
        case "intro":
          setContentState("content")
          setCurrentCardIndex(0)
          break
        case "content":
          setContentState("thank-you")
          setCurrentCardIndex(0)
          break
        case "thank-you":
          // After thank you, go directly to main quiz
          setContentState("main-quiz")
          setCurrentCardIndex(0)
          setQuizAnswers({})
          break
        case "main-quiz":
          evaluateQuiz(mainQuiz)
          setContentState("main-quiz-review")
          setCurrentCardIndex(0)
          break
        case "main-quiz-review":
          setContentState("exam-practice")
          setCurrentCardIndex(0)
          setQuizAnswers({})
          break
        case "exam-practice":
          evaluateQuiz(examQuiz)
          setContentState("exam-review")
          setCurrentCardIndex(0)
          break
        case "exam-review":
          setContentState("completion")
          break
      }
    }
  }

  const evaluateQuiz = (quiz: AIQuizQuestion[]) => {
    const results: Record<number, boolean> = {}
    quiz.forEach((question, index) => {
      results[index] = quizAnswers[index] === question.correct_answer
    })
    setQuizResults(results)
  }

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionIndex]: answer,
    })
  }

  const handleNextTopic = () => {
    // Find the next topic in the sequence
    const currentTopicIndex = topics.findIndex((t) => t.id === topicId)
    if (currentTopicIndex < topics.length - 1) {
      const nextTopic = topics[currentTopicIndex + 1]
      if (nextTopic && nextTopic.subtopics.length > 0) {
        router.push(`/content/${gradeId}/${subjectId}/${nextTopic.id}/${nextTopic.subtopics[0].id}`)
      }
    }
  }

  const handleGoHome = () => {
    router.push("/grade-selection")
  }

  const handleBack = () => {
    router.push(`/topics/${gradeId}/${subjectId}`)
  }

  // Special handling for coding and maps modules
  useEffect(() => {
    if (subjectId === "coding") {
      router.push(`/coding/${gradeId}/${topicId}/${subtopicId}`)
    } else if (subjectId === "maps") {
      router.push(`/maps/${gradeId}/${topicId}/${subtopicId}`)
    }
  }, [subjectId, gradeId, topicId, subtopicId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center space-y-4">
        <div className="text-xl dark:text-white">Loading content...</div>
        {aiServiceStatus && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
            {aiServiceStatus}
          </div>
        )}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (contentState === "completion") {
    return <CompletionScreen topicTitle={topic?.title || ""} onNextTopic={handleNextTopic} onGoHome={handleGoHome} />
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span>Back to Topics</span>
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <SubjectIcon subject={subjectId} />
          </div>
          <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            {topic?.title || "Topic"}
          </div>
          <h1 className="text-2xl font-bold mb-2 dark:text-white">
            {(() => {
              switch (contentState) {
                case "intro":
                  return "Introduction"
                case "content":
                  return subtopic?.title || "Learning Content"
                case "thank-you":
                  return "Thank You"
                case "main-quiz":
                  return "Main Quiz"
                case "main-quiz-review":
                  return "Quiz Review"
                case "exam-practice":
                  return "Exam Practice"
                case "exam-review":
                  return "Exam Review"
                default:
                  return "Learning Content"
              }
            })()}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${contentState}-${currentCardIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            {(["intro", "content", "thank-you"].includes(contentState) && currentContent[currentCardIndex]) && (
              <ContentCard
                content={currentContent[currentCardIndex] as { title: string; body: string; image?: string }}
                onNext={handleNextCard}
                totalCards={currentContent.length}
                currentCard={currentCardIndex + 1}
              />
            )}
            {(["main-quiz", "exam-practice"].includes(contentState) && currentContent[currentCardIndex]) && (
              <QuizCard
                question={currentContent[currentCardIndex] as { question: string; options: string[]; correctAnswer: string; explanation: string }}
                selectedAnswer={quizAnswers[currentCardIndex] || ""}
                onAnswerSelect={(answer) => handleAnswerSelect(currentCardIndex, answer)}
                onNext={handleNextCard}
                totalQuestions={currentContent.length}
                currentQuestion={currentCardIndex + 1}
                isReview={false}
              />
            )}
            {(["main-quiz-review", "exam-review"].includes(contentState) && currentContent[currentCardIndex]) && (
              <QuizCard
                question={currentContent[currentCardIndex] as { question: string; options: string[]; correctAnswer: string; explanation: string }}
                selectedAnswer={quizAnswers[currentCardIndex] || ""}
                isCorrect={quizResults[currentCardIndex]}
                onNext={handleNextCard}
                totalQuestions={currentContent.length}
                currentQuestion={currentCardIndex + 1}
                isReview={true}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {showAchievement && (
          <AchievementToast
            title={achievementData.title}
            description={achievementData.description}
            xp={achievementData.xp}
            onClose={() => setShowAchievement(false)}
          />
        )}
      </div>
    </div>
  )
}
