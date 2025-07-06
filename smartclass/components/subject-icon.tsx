"use client"

import {
  BookOpen,
  Calculator,
  FlaskRoundIcon as Flask,
  Globe,
  Code,
  Map,
  Atom,
  Building2,
  GraduationCap,
  History,
  Palette,
  Laptop,
  CircleDot,
  Languages,
  Heart,
  Star,
  Briefcase,
  Activity,
  Wrench,
} from "lucide-react"

interface SubjectIconProps {
  subject: string
  size?: "normal" | "large"
}

export default function SubjectIcon({ subject, size = "normal" }: SubjectIconProps) {
  const getIconAndColor = () => {
    switch (subject) {
      case "english-language":
        return {
          icon: <BookOpen size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-blue-100 dark:bg-blue-900/30",
        }
      case "mathematics":
        return {
          icon: <Calculator size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-purple-100 dark:bg-purple-900/30",
        }
      case "science":
        return {
          icon: <Flask size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-green-100 dark:bg-green-900/30",
        }
      case "social-studies":
        return {
          icon: <Globe size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-orange-100 dark:bg-orange-900/30",
        }
      case "french-language":
        return {
          icon: <Languages size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-blue-100 dark:bg-blue-900/30",
        }
      case "arabic":
        return {
          icon: <Star size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-yellow-100 dark:bg-yellow-900/30",
        }
      case "ghanaian-language":
        return {
          icon: <Languages size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-green-100 dark:bg-green-900/30",
        }
      case "physical-education":
        return {
          icon: <Activity size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-red-100 dark:bg-red-900/30",
        }
      case "religious-moral-education":
        return {
          icon: <Star size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-purple-100 dark:bg-purple-900/30",
        }
      case "creative-arts":
        return {
          icon: <Palette size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-yellow-100 dark:bg-yellow-900/30",
        }
      case "career-technology":
        return {
          icon: <Briefcase size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-teal-100 dark:bg-teal-900/30",
        }
      case "computing":
        return {
          icon: <Laptop size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-purple-100 dark:bg-purple-900/30",
        }
      case "coding":
        return {
          icon: <Code size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-purple-100 dark:bg-purple-900/30",
        }
      case "maps":
        return {
          icon: <Map size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-green-100 dark:bg-green-900/30",
        }
      // Legacy cases for backward compatibility
      case "all":
        return {
          icon: <CircleDot size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-red-100 dark:bg-red-900/30",
        }
      case "english":
        return {
          icon: <BookOpen size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-purple-100 dark:bg-purple-900/30",
        }
      case "physics":
        return {
          icon: <Atom size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-green-100 dark:bg-green-900/30",
        }
      case "chemistry":
        return {
          icon: <Flask size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-teal-100 dark:bg-teal-900/30",
        }
      case "biology":
        return {
          icon: <Flask size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-green-100 dark:bg-green-900/30",
        }
      case "history":
        return {
          icon: <History size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-blue-100 dark:bg-blue-900/30",
        }
      case "geography":
        return {
          icon: <Globe size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-orange-100 dark:bg-orange-900/30",
        }
      case "business":
        return {
          icon: <Building2 size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-yellow-100 dark:bg-yellow-900/30",
        }
      case "engineering":
        return {
          icon: <GraduationCap size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-blue-100 dark:bg-blue-900/30",
        }
      case "medicine":
        return {
          icon: <GraduationCap size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-pink-100 dark:bg-pink-900/30",
        }
      case "computers":
        return {
          icon: <Laptop size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-purple-100 dark:bg-purple-900/30",
        }
      case "arts":
        return {
          icon: <Palette size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-yellow-100 dark:bg-yellow-900/30",
        }
      default:
        return {
          icon: <BookOpen size={size === "large" ? 40 : 24} className="text-gray-700 dark:text-gray-300" />,
          color: "bg-blue-100 dark:bg-blue-900/30",
        }
    }
  }

  const { icon, color } = getIconAndColor()
  const sizeClass = size === "large" ? "w-24 h-24" : "w-12 h-12"

  return <div className={`${color} ${sizeClass} rounded-full flex items-center justify-center`}>{icon}</div>
}
