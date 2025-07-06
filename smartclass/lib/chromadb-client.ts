/**
 * ChromaDB Client for RAG Integration
 * Provides retrieval-augmented generation capabilities for content validation and enhancement
 * Routes ChromaDB requests through AI service for file-based ChromaDB access
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
const COLLECTION_NAME = process.env.NEXT_PUBLIC_CHROMADB_COLLECTION || 'syllabus_collection'

export interface ChromaDocument {
  id: string
  text: string
  metadata: {
    subject?: string
    grade?: string
    topic?: string
    subtopic?: string
    document_type?: string
    page_number?: number
    [key: string]: any
  }
  distance?: number
}

export interface RetrievalContext {
  documents: ChromaDocument[]
  relevantContent: string
  sources: string[]
}

export interface RAGEnhancedContent {
  originalContent: any[]
  enhancedContent: any[]
  relevantContext: ChromaDocument[]
  confidenceScore: number
}

class ChromaDBClient {
  private isConnected: boolean = false
  private baseUrl: string = AI_SERVICE_URL

  constructor() {
    // Initialize with AI service URL
  }

  /**
   * Test ChromaDB connection via AI service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chromadb-status`)
      const data = await response.json()
      this.isConnected = data.available || false
      return this.isConnected
    } catch (error) {
      console.warn('ChromaDB connection failed:', error)
      this.isConnected = false
      return false
    }
  }

  /**
   * Retrieve relevant context for content generation
   */
  async retrieveContext(
    query: string,
    subjectId: string,
    gradeId: string,
    topicId?: string,
    nResults: number = 5
  ): Promise<RetrievalContext> {
    try {
      if (!this.isConnected) {
        await this.testConnection()
      }

      if (!this.isConnected) {
        return this.getEmptyContext()
      }

      // Use AI service search endpoint
      const response = await fetch(`${this.baseUrl}/search-curriculum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          subject: subjectId,
          grade: gradeId,
          n_results: nResults
        })
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !data.documents) {
        return this.getEmptyContext()
      }

      // Process results
      const documents: ChromaDocument[] = data.documents

      // Filter by relevance (distance threshold)
      const relevantDocs = documents.filter(doc => (doc.distance || 1.0) < 0.8)

      // Combine content for context
      const relevantContent = relevantDocs
        .map(doc => doc.text)
        .join('\n\n')
        .slice(0, 2000) // Limit context size

      // Extract sources
      const sources = relevantDocs
        .map(doc => {
          const meta = doc.metadata
          return meta.document_type || 'syllabus_document'
        })
        .filter((source, index, arr) => arr.indexOf(source) === index)

      return {
        documents: relevantDocs,
        relevantContent,
        sources
      }

    } catch (error) {
      console.error('Error retrieving ChromaDB context:', error)
      return this.getEmptyContext()
    }
  }

  /**
   * Search for specific curriculum content
   */
  async searchCurriculum(
    searchTerm: string,
    subjectId?: string,
    gradeId?: string,
    limit: number = 10
  ): Promise<ChromaDocument[]> {
    try {
      if (!this.isConnected) {
        await this.testConnection()
      }

      if (!this.isConnected) {
        return []
      }

      const response = await fetch(`${this.baseUrl}/search-curriculum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchTerm,
          subject: subjectId,
          grade: gradeId,
          n_results: limit
        })
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !data.documents) {
        return []
      }

      return data.documents

    } catch (error) {
      console.error('Error searching ChromaDB:', error)
      return []
    }
  }

  /**
   * Validate AI-generated content against curriculum
   */
  async validateContent(
    aiContent: string,
    subjectId: string,
    gradeId: string,
    topicId: string
  ): Promise<{
    isValid: boolean
    confidence: number
    suggestions: string[]
    curriculumAlignment: number
  }> {
    try {
      // Retrieve relevant curriculum content
      const context = await this.retrieveContext(
        aiContent.slice(0, 200), // Use first 200 chars as query
        subjectId,
        gradeId,
        topicId,
        3
      )

      if (context.documents.length === 0) {
        return {
          isValid: true, // Default to valid if no curriculum found
          confidence: 0.5,
          suggestions: ['No specific curriculum content found for validation'],
          curriculumAlignment: 0.5
        }
      }

      // Calculate alignment score based on document distances
      const avgDistance = context.documents.reduce((sum, doc) => sum + (doc.distance || 1.0), 0) / context.documents.length
      const curriculumAlignment = Math.max(0, 1 - avgDistance) // Convert distance to alignment score

      // Determine validity based on alignment
      const isValid = curriculumAlignment > 0.3
      const confidence = Math.min(0.95, curriculumAlignment * 1.2)

      // Generate suggestions based on curriculum content
      const suggestions: string[] = []
      
      if (curriculumAlignment < 0.5) {
        suggestions.push('Consider aligning content more closely with curriculum standards')
      }
      
      if (context.documents.length > 0) {
        const topics = context.documents
          .map(doc => doc.metadata.topic)
          .filter(Boolean)
          .filter((topic, index, arr) => arr.indexOf(topic) === index)
          .slice(0, 3)
        
        if (topics.length > 0) {
          suggestions.push(`Consider incorporating concepts from: ${topics.join(', ')}`)
        }
      }

      return {
        isValid,
        confidence,
        suggestions,
        curriculumAlignment
      }

    } catch (error) {
      console.error('Error validating content:', error)
      return {
        isValid: true,
        confidence: 0.5,
        suggestions: ['Content validation unavailable'],
        curriculumAlignment: 0.5
      }
    }
  }

  /**
   * Get collection statistics via AI service
   */
  async getCollectionStats(): Promise<{
    totalDocuments: number
    subjects: string[]
    grades: string[]
    isAvailable: boolean
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chromadb-status`)
      const data = await response.json()

      if (!data.available) {
        return {
          totalDocuments: 0,
          subjects: [],
          grades: [],
          isAvailable: false
        }
      }

      // For now, return basic stats
      // In future, could add specific endpoints for detailed stats
      return {
        totalDocuments: data.document_count || 0,
        subjects: [], // Could be enhanced with dedicated endpoint
        grades: [], // Could be enhanced with dedicated endpoint
        isAvailable: true
      }

    } catch (error) {
      console.error('Error getting collection stats:', error)
      return {
        totalDocuments: 0,
        subjects: [],
        grades: [],
        isAvailable: false
      }
    }
  }

  /**
   * Get empty context for fallback
   */
  private getEmptyContext(): RetrievalContext {
    return {
      documents: [],
      relevantContent: '',
      sources: []
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }
}

// Create singleton instance
export const chromaClient = new ChromaDBClient()

/**
 * Generate RAG-enhanced content using ChromaDB context
 */
export async function generateRAGEnhancedContent(
  prompt: string,
  subjectId: string,
  gradeId: string,
  topicId: string,
  subtopicId: string
): Promise<{
  enhancedPrompt: string
  context: RetrievalContext
  validation?: {
    isValid: boolean
    confidence: number
    suggestions: string[]
    curriculumAlignment: number
  }
}> {
  try {
    // Retrieve relevant context from ChromaDB via AI service
    const context = await chromaClient.retrieveContext(
      `${topicId} ${subtopicId} ${prompt}`,
      subjectId,
      gradeId,
      topicId,
      5
    )

    // Enhance prompt with context
    let enhancedPrompt = prompt
    
    if (context.relevantContent) {
      enhancedPrompt = `${prompt}\n\nRelevant curriculum context:\n${context.relevantContent}\n\nPlease ensure content aligns with the curriculum standards above.`
    }

    // Validate content if context is available
    let validation
    if (context.documents.length > 0) {
      validation = await chromaClient.validateContent(
        prompt,
        subjectId,
        gradeId,
        topicId
      )
    }

    return {
      enhancedPrompt,
      context,
      validation
    }

  } catch (error) {
    console.error('Error generating RAG-enhanced content:', error)
    
    // Return original prompt if enhancement fails
    return {
      enhancedPrompt: prompt,
      context: {
        documents: [],
        relevantContent: '',
        sources: []
      }
    }
  }
}

/**
 * Check if ChromaDB is available and properly configured
 */
export async function checkChromaDBStatus(): Promise<{
  available: boolean
  collectionExists: boolean
  documentCount: number
  message: string
}> {
  try {
    const isConnected = await chromaClient.testConnection()
    
    if (!isConnected) {
      return {
        available: false,
        collectionExists: false,
        documentCount: 0,
        message: 'ChromaDB service is not available'
      }
    }

    const stats = await chromaClient.getCollectionStats()

    return {
      available: true,
      collectionExists: stats.isAvailable,
      documentCount: stats.totalDocuments,
      message: stats.isAvailable 
        ? `ChromaDB ready with ${stats.totalDocuments} curriculum documents`
        : 'ChromaDB collection not found'
    }

  } catch (error) {
    return {
      available: false,
      collectionExists: false,
      documentCount: 0,
      message: 'Error checking ChromaDB status'
    }
  }
} 