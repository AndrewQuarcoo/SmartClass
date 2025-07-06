# SmartClass Advanced Features Guide

This document covers the advanced features that have been implemented to enhance the SmartClass platform with AI-powered content generation, ChromaDB integration, intelligent caching, and comprehensive monitoring.

## 🚀 Feature Overview

### ✅ **Implemented Features**

1. **🤖 RAG-Enhanced Content Generation**
   - Retrieval-Augmented Generation using ChromaDB
   - Curriculum-aligned AI content validation
   - Intelligent content enhancement

2. **📊 Enhanced Progress Tracking**
   - Subtopic-level progress rings
   - Difficulty-based color coding
   - Time tracking and scoring
   - Interactive tooltips and animations

3. **⚡ Intelligent Content Caching**
   - Client-side caching with localStorage persistence
   - Cache hit rate monitoring
   - Automatic cache invalidation
   - Background content preloading

4. **🗄️ ChromaDB Admin Interface**
   - Document search and exploration
   - System health monitoring
   - Cache management tools
   - Connection status monitoring

## 📋 Prerequisites

Before using the advanced features, ensure you have:

1. **ChromaDB Service Running**:
   ```bash
   # Start ChromaDB with CORS enabled
   docker run -e CHROMA_SERVER_CORS_ALLOW_ORIGINS='["http://localhost:3000"]' \
     --rm -v ./chroma-data:/chroma/chroma -p 8000:8000 chromadb/chroma:latest
   ```

2. **Environment Variables** (in `smartclass/.env.local`):
   ```bash
   # AI Model Service URL
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   
   # ChromaDB Configuration
   NEXT_PUBLIC_CHROMADB_URL=http://127.0.0.1:8000
   NEXT_PUBLIC_CHROMADB_COLLECTION=syllabus_content
   
   # Optional debugging
   NEXT_PUBLIC_AI_DEBUG=false
   ```

3. **Dependencies Installed**:
   ```bash
   cd smartclass
   npm install chromadb@^1.8.1
   ```

## 🔧 Configuration Setup

### 1. ChromaDB Setup

The system expects a ChromaDB collection named `syllabus_content` with documents containing curriculum information. Based on the search results from the [chroma-langchain-nextjs example](https://github.com/amikos-tech/chroma-langchain-nextjs), you can import data using:

```bash
# Example using Chroma Data Pipes
export OPENAI_API_KEY=sk-XXXXX
cdp imp url https://your-curriculum-source.com/ -d 3 | \
  cdp chunk -s 512 | \
  cdp tx emoji-clean -m | \
  cdp embed --ef openai | \
  cdp import "http://localhost:8000/syllabus_content" --create --upsert
```

### 2. Document Structure

ChromaDB documents should have metadata structure:
```json
{
  "subject": "mathematics",
  "grade": "grade-3",
  "topic": "fractions",
  "subtopic": "intro-fractions",
  "document_type": "curriculum_standard",
  "page_number": 15
}
```

## 🎯 Feature Usage

### RAG-Enhanced Content Generation

The system automatically uses RAG when ChromaDB is available:

```typescript
import { getAIContentForSubtopic } from '@/data/ai-content'

// This will automatically use RAG if ChromaDB is connected
const content = await getAIContentForSubtopic(
  'counting',      // subtopicId
  'math-numbers',  // topicId
  'mathematics',   // subjectId
  'grade-1',       // gradeId
  5               // numCards
)

// Content includes validation and curriculum alignment
content.forEach(card => {
  console.log('Curriculum alignment:', card.validation?.curriculumAlignment)
  console.log('Suggestions:', card.validation?.suggestions)
})
```

### Enhanced Progress Tracking

Use the new progress ring components in your pages:

```typescript
import EnhancedProgressRing, { ProgressRingGroup } from '@/components/enhanced-progress-ring'

const subtopics = [
  {
    id: 'counting',
    title: 'Counting',
    completed: true,
    currentStep: 5,
    totalSteps: 5,
    score: 95,
    timeSpent: 45,
    lastAccessed: new Date(),
    difficulty: 'easy' as const
  }
  // ... more subtopics
]

// Individual progress ring
<EnhancedProgressRing 
  subtopic={subtopics[0]}
  size="lg"
  onClick={() => navigate(`/content/${gradeId}/${subjectId}/${topicId}/${subtopicId}`)}
/>

// Group of progress rings
<ProgressRingGroup
  subtopics={subtopics}
  title="Mathematics Progress"
  layout="grid"
  onSubtopicClick={(subtopicId) => navigate(subtopicId)}
/>
```

### Content Caching

The caching system works automatically, but you can also control it:

```typescript
import { contentCache, getSystemStatus } from '@/data/ai-content'

// Check cache statistics
const stats = contentCache.getStats()
console.log(`Cache hit rate: ${stats.hitRate}%`)
console.log(`Memory usage: ${stats.memoryUsage}KB`)

// Manually invalidate cache for a topic
contentCache.invalidateTopic('math-numbers', 'counting')

// Clear all cache
contentCache.clear()

// Get comprehensive system status
const systemStatus = await getSystemStatus()
console.log('AI Service:', systemStatus.ai)
console.log('ChromaDB:', systemStatus.chromadb)
console.log('Cache:', systemStatus.cache)
```

### Preloading Content

Improve UX by preloading next topics:

```typescript
import { preloadNextTopics } from '@/data/ai-content'
import { topics } from '@/data/topics'

// Preload content for next topics in background
await preloadNextTopics(
  'math-numbers',     // currentTopicId
  'counting',         // currentSubtopicId
  'mathematics',      // subjectId
  'grade-1',          // gradeId
  topics             // allTopics array
)
```

## 🛠️ ChromaDB Admin Interface

Access the admin interface at `/admin/chromadb` to:

### Document Search
- Search curriculum documents by content
- Filter by subject and grade
- View relevance scores and metadata
- Explore document content

### System Monitoring
- Monitor ChromaDB connection status
- Track AI service availability
- View cache performance metrics
- Check document counts and health

### Cache Management
- View cache statistics (hit rate, memory usage)
- Clear cache manually
- Monitor cache performance

![ChromaDB Admin Interface](https://github.com/flanker/chromadb-admin) inspired design provides a clean interface for content management.

## 📊 Performance Optimizations

### Caching Strategy
- **Content**: 30-minute TTL for AI-generated content
- **Fallback**: 5-minute TTL for fallback content
- **Persistence**: localStorage for cross-session caching
- **Cleanup**: Automatic LRU eviction and expired entry cleanup

### Background Loading
- Preload next 2 topics while user studies current content
- Cache validation results to avoid re-validation
- Lazy load ChromaDB connections

### Memory Management
- Maximum 100 cache entries
- Automatic cleanup every 5 minutes
- Memory usage monitoring and alerts

## 🔍 Monitoring & Debugging

### System Status Dashboard

```typescript
import { getSystemStatus } from '@/data/ai-content'

const status = await getSystemStatus()
// Returns comprehensive status of all systems
```

### Debug Mode

Enable detailed logging:
```bash
NEXT_PUBLIC_AI_DEBUG=true
```

This provides console logs for:
- Cache hits/misses
- RAG enhancement decisions
- ChromaDB query results
- Content validation scores

### Health Checks

Monitor system health:
- **AI Service**: `/health` endpoint status
- **ChromaDB**: Connection and collection validation
- **Cache**: Hit rate and memory usage
- **Performance**: Response times and error rates

## 🚨 Troubleshooting

### Common Issues

1. **ChromaDB Connection Failed**
   ```
   Error: ChromaDB connection failed
   ```
   - Check if ChromaDB is running on correct port
   - Verify CORS settings allow your domain
   - Ensure collection exists with correct name

2. **Low Cache Hit Rate**
   - Check if cache is being cleared too frequently
   - Verify TTL settings are appropriate
   - Monitor for memory constraints

3. **Poor Content Validation Scores**
   - Ensure ChromaDB has relevant curriculum documents
   - Check document metadata structure
   - Verify embedding quality

### Performance Tuning

1. **Optimize Cache TTL**:
   ```typescript
   // Adjust TTL based on content volatility
   contentCache.set(cacheKey, data, 60 * 60 * 1000) // 1 hour
   ```

2. **Preload Strategy**:
   ```typescript
   // Preload more aggressively for high-traffic topics
   await preloadNextTopics(/* ... */, allTopics.slice(0, 5))
   ```

3. **ChromaDB Query Optimization**:
   ```typescript
   // Limit results for better performance
   const results = await chromaClient.searchCurriculum(query, subject, grade, 5)
   ```

## 🔄 Integration with Existing Features

### Gamification System
- Progress rings integrate with existing XP system
- Achievement toasts work with enhanced progress tracking
- Streak counters use cached progress data

### Content Generation
- RAG enhancement preserves existing content format
- Fallback system maintains compatibility
- Validation adds metadata without breaking changes

### UI Components
- Enhanced progress rings replace existing progress indicators
- Admin interface uses existing UI component library
- Caching is transparent to existing components

## 📈 Future Enhancements

Planned improvements include:
- Real-time ChromaDB sync
- Advanced analytics dashboard
- Content recommendation engine
- Automated curriculum alignment scoring
- Multi-language RAG support

## 📚 Resources

- [ChromaDB Documentation](https://docs.trychroma.com)
- [ChromaDB Admin UI Reference](https://github.com/flanker/chromadb-admin)
- [Next.js + ChromaDB Integration](https://github.com/amikos-tech/chroma-langchain-nextjs)
- [SmartClass AI Integration Guide](./README-AI-INTEGRATION.md)

## 🎉 Getting Started

1. **Start Services**:
   ```bash
   # Terminal 1: Start ChromaDB
   docker run -e CHROMA_SERVER_CORS_ALLOW_ORIGINS='["http://localhost:3000"]' \
     --rm -v ./chroma-data:/chroma/chroma -p 8000:8000 chromadb/chroma:latest
   
   # Terminal 2: Start AI Model Service
   python start_api.py
   
   # Terminal 3: Start Next.js
   cd smartclass && npm run dev
   ```

2. **Access Features**:
   - Main App: `http://localhost:3000`
   - Admin Interface: `http://localhost:3000/admin/chromadb`
   - AI API Docs: `http://127.0.0.1:8000/docs`

3. **Monitor Performance**:
   - Check system status in admin interface
   - Monitor cache hit rates
   - Validate content alignment scores

The advanced features are now ready to enhance your SmartClass educational experience with AI-powered, curriculum-aligned content generation! 🚀 