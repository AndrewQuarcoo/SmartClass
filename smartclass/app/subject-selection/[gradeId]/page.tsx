"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { subjects } from "@/data/subjects"
import { grades } from "@/data/grades"
import SubjectIcon from "@/components/subject-icon"
import { ArrowLeft } from "lucide-react"

export default function SubjectSelectionPage({ params }: { params: Promise<{ gradeId: string }> }) {
  const router = useRouter()
  const { gradeId } = use(params)

  const grade = grades.find((g) => g.id === gradeId)

  const handleSubjectSelect = (subjectId: string) => {
    // Navigate to subject introduction page instead of topics
    router.push(`/subject-introduction/${gradeId}/${subjectId}`)
  }

  const handleBack = () => {
    router.push("/grade-selection")
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
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <SubjectIcon subject="all" />
            </div>
          </div>
          <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            YOUR LEARNING PATH
          </div>
          <h1 className="text-3xl font-bold mb-2 dark:text-white">{grade?.name || "Grade"} Subjects</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-lg">Select a subject to start learning</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 cursor-pointer hover:border-yellow-400 dark:hover:border-yellow-500 transition-all duration-200 flex flex-col items-center"
              onClick={() => handleSubjectSelect(subject.id)}
            >
              <div className="mb-3">
                <SubjectIcon subject={subject.id} />
              </div>
              <span className="text-center font-medium dark:text-white">{subject.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
