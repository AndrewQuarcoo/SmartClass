"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  Search, 
  RefreshCw, 
  FileText, 
  Activity,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { chromaClient, ChromaDocument, checkChromaDBStatus } from '@/lib/chromadb-client'
import { getSystemStatus } from '@/data/ai-content'
import { contentCache } from '@/lib/content-cache'

interface AdminStats {
  chromadb: {
    available: boolean
    collectionExists: boolean
    documentCount: number
    message: string
  }
  cache: {
    totalEntries: number
    memoryUsage: number
    hitRate: number
    hits: number
    misses: number
  }
  ai: {
    available: boolean
    message: string
  }
}

export default function ChromaDBAdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChromaDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedGrade, setSelectedGrade] = useState<string>('')

  // Load initial stats
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const systemStatus = await getSystemStatus()
      setStats(systemStatus)
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const searchDocuments = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const results = await chromaClient.searchCurriculum(
        searchQuery,
        selectedSubject || undefined,
        selectedGrade || undefined,
        20
      )
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching documents:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = () => {
    contentCache.clear()
    loadStats()
  }

  const formatDistance = (distance: number) => {
    return ((1 - distance) * 100).toFixed(1) + '%'
  }

  const getStatusIcon = (available: boolean) => {
    return available ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-500" />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-8 h-8" />
              ChromaDB Admin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and monitor your curriculum vector database
            </p>
          </div>
          <Button onClick={loadStats} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* System Status Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ChromaDB Status</CardTitle>
                {getStatusIcon(stats.chromadb.available)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.chromadb.documentCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.chromadb.message}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Service</CardTitle>
                {getStatusIcon(stats.ai.available)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.ai.available ? 'Online' : 'Offline'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.ai.message}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.cache.hitRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.cache.totalEntries} entries • {stats.cache.memoryUsage}KB
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Document Search
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Document Search Tab */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Curriculum Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Search curriculum content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchDocuments()}
                    className="flex-1"
                  />
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="">All Subjects</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="english">English</option>
                    <option value="science">Science</option>
                    <option value="social-studies">Social Studies</option>
                  </select>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="">All Grades</option>
                    <option value="grade-1">Grade 1</option>
                    <option value="grade-2">Grade 2</option>
                    <option value="grade-3">Grade 3</option>
                    <option value="grade-4">Grade 4</option>
                    <option value="grade-5">Grade 5</option>
                    <option value="grade-6">Grade 6</option>
                  </select>
                  <Button onClick={searchDocuments} disabled={isLoading}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Search Results */}
                <div className="space-y-4">
                  {searchResults.map((doc, index) => (
                    <Card key={doc.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Document {index + 1}</span>
                          </div>
                          <Badge variant="secondary">
                            Relevance: {formatDistance(doc.distance || 0)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
                          {doc.text.slice(0, 300)}...
                        </p>
                        
                        {doc.metadata && (
                          <div className="flex gap-2 flex-wrap">
                            {doc.metadata.subject && (
                              <Badge variant="outline">Subject: {doc.metadata.subject}</Badge>
                            )}
                            {doc.metadata.grade && (
                              <Badge variant="outline">Grade: {doc.metadata.grade}</Badge>
                            )}
                            {doc.metadata.topic && (
                              <Badge variant="outline">Topic: {doc.metadata.topic}</Badge>
                            )}
                            {doc.metadata.document_type && (
                              <Badge variant="outline">Type: {doc.metadata.document_type}</Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {searchResults.length === 0 && searchQuery && (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No documents found for your search query.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cache Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Entries:</span>
                        <span className="font-medium">{stats.cache.totalEntries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory Usage:</span>
                        <span className="font-medium">{stats.cache.memoryUsage} KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hit Rate:</span>
                        <span className="font-medium">{stats.cache.hitRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Hits:</span>
                        <span className="font-medium">{stats.cache.hits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Misses:</span>
                        <span className="font-medium">{stats.cache.misses}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>ChromaDB:</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(stats.chromadb.available)}
                          <span className={stats.chromadb.available ? 'text-green-600' : 'text-red-600'}>
                            {stats.chromadb.available ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AI Service:</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(stats.ai.available)}
                          <span className={stats.ai.available ? 'text-green-600' : 'text-red-600'}>
                            {stats.ai.available ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Documents:</span>
                        <span className="font-medium">
                          {stats.chromadb.documentCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Clear Cache</h3>
                    <p className="text-sm text-gray-600">
                      Remove all cached content and force fresh generation
                    </p>
                  </div>
                  <Button variant="outline" onClick={clearCache}>
                    Clear Cache
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connection Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">ChromaDB URL</label>
                    <Input 
                      value={process.env.NEXT_PUBLIC_CHROMADB_URL || 'http://127.0.0.1:8000'} 
                      disabled 
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Collection Name</label>
                    <Input 
                      value={process.env.NEXT_PUBLIC_CHROMADB_COLLECTION || 'syllabus_content'} 
                      disabled 
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Configuration is set via environment variables
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 