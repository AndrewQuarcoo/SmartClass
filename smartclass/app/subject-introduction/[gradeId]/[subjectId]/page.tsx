"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { subjects } from "@/data/subjects"
import { grades } from "@/data/grades"
import { Play, BookmarkPlus, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SubjectIntroductionPage({
  params,
}: {
  params: Promise<{ gradeId: string; subjectId: string }>
}) {
  const router = useRouter()
  const { gradeId, subjectId } = use(params)
  const [activeTab, setActiveTab] = useState("lessons")

  const subject = subjects.find((s) => s.id === subjectId)
  const grade = grades.find((g) => g.id === gradeId)

  const handleStartClass = () => {
    router.push(`/topics/${gradeId}/${subjectId}`)
  }

  const handleBack = () => {
    router.push(`/subject-selection/${gradeId}`)
  }

  // Get subject description or a default one
  const getSubjectDescription = () => {
    switch (subjectId) {
      case "english-language":
        return "Develop reading, writing, and communication skills through engaging with diverse texts and creative expression."
      case "mathematics":
        return "Explore numbers, patterns, and problem-solving techniques that form the foundation of mathematical thinking."
      case "science":
        return "Discover the natural world through observation, experimentation, and understanding scientific principles."
      case "social-studies":
        return "Understand societies, cultures, and human interactions across time and geography."
      case "french-language":
        return "Learn French language skills including speaking, reading, writing, and cultural understanding."
      case "arabic":
        return "Study Arabic language, script, and cultural heritage with focus on communication skills."
      case "ghanaian-language":
        return "Explore local Ghanaian languages, traditions, and cultural heritage."
      case "physical-education":
        return "Develop physical fitness, sports skills, and healthy lifestyle habits."
      case "religious-moral-education":
        return "Explore ethical values, moral principles, and spiritual development."
      case "creative-arts":
        return "Express creativity through visual arts, music, drama, and design."
      case "career-technology":
        return "Learn practical skills and technology for future career preparation."
      case "computing":
        return "Master computer science fundamentals and digital technology skills."
      case "coding":
        return "Learn programming fundamentals and computational thinking through hands-on coding exercises."
      case "maps":
        return "Explore geography, cartography, and spatial relationships through interactive map experiences."
      default:
        return subject?.description || "Explore this subject through interactive lessons and engaging content."
    }
  }

  // Get subject image based on subject ID
  const getSubjectImage = () => {
    switch (subjectId) {
      case "english-language":
        return "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=400&fit=crop&crop=center"
      case "mathematics":
        return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop&crop=center"
      case "science":
        return "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=400&fit=crop&crop=center"
      case "social-studies":
        return "https://images.unsplash.com/photo-1636865266989-58043bceaa71?q=80&w=1080&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&h=400&fit=crop&crop=center"
      case "french-language":
        return "https://plus.unsplash.com/premium_photo-1663036583472-84bee4a90090?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&h=400&fit=crop&crop=center"
      case "arabic":
        return "https://plus.unsplash.com/premium_photo-1677966719936-3de1c1d94421?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&h=400&fit=crop&crop=center"
      case "ghanaian-language":
        return "https://images.unsplash.com/photo-1515658323406-25d61c141a6e?q=80&w=709&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      case "physical-education":
        return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop&crop=center"
      case "religious-moral-education":
        return "https://plus.unsplash.com/premium_vector-1724847824230-914e6e4ecdcc?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&h=400&fit=crop&crop=center"
      case "creative-arts":
        return "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop&crop=center"
      case "career-technology":
        return "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&h=400&fit=crop&crop=center"
      case "computing":
        return "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&h=400&fit=crop&crop=center"
      case "coding":
        return "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop&crop=center"
      case "maps":
        return "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=800&h=400&fit=crop&crop=center"
      default:
        return `https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop&crop=center`
    }
  }

  return (
    <div className="min-h-screen bg-black dark:bg-black text-white">
      {/* Back button and theme toggle */}
      <div className="absolute top-4 left-4 z-50">
        <button onClick={handleBack} className="flex items-center text-white/80 hover:text-white">
          <ArrowLeft size={20} className="mr-2" />
          <span>Back</span>
        </button>
      </div>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="relative">
        {/* Background image with overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black z-10"></div>
        <div className="h-[70vh] bg-gray-900 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={getSubjectImage()}
              alt={subject?.name || "Subject"}
              className="w-full h-full object-cover opacity-40"
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20 -mt-40 px-4 pb-20 max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2 uppercase tracking-wider">{subject?.name || "Subject"}</h1>
          <div className="w-12 h-1 bg-yellow-400 mx-auto mb-4"></div>
          <p className="text-center text-gray-300 mb-8">{getSubjectDescription()}</p>

          <Button
            onClick={handleStartClass}
            className="w-full py-6 text-lg font-medium bg-yellow-400 hover:bg-yellow-500 text-black transition-colors rounded-none"
          >
            START CLASS
          </Button>

          {/* Tabs */}
          <div className="mt-10 border-b border-gray-800">
            <div className="flex">
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "lessons" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab("lessons")}
              >
                LESSONS
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "overview" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab("overview")}
              >
                OVERVIEW
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "resources" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab("resources")}
              >
                CLASS RESOURCES
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {activeTab === "lessons" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  This class includes multiple lessons covering key concepts and practical applications in{" "}
                  {subject?.name || "this subject"}.
                </p>
                <Button
                  onClick={handleStartClass}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-black transition-colors rounded-none"
                >
                  Start Learning
                </Button>
              </div>
            )}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  {subject?.name || "This subject"} provides a comprehensive foundation for students in{" "}
                  {grade?.name || "this grade"}. Through interactive lessons and engaging content, students will develop
                  essential skills and knowledge.
                </p>
              </div>
            )}
            {activeTab === "resources" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Additional resources including practice exercises, reference materials, and supplementary content are
                  available to enhance your learning experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
