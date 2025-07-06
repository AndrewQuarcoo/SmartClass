# SmartClass AI Integration

This document explains how the AI-powered content generation is integrated into the SmartClass platform.

## Overview

The SmartClass platform now supports AI-generated educational content and quizzes using a fine-tuned Llama 3.2-1B model. The system maintains graceful fallbacks to ensure the application works even when the AI service is unavailable.

## Architecture

### Components

1. **FastAPI Model Service** (`api_model_service.py`)
   - Serves the fine-tuned Llama model locally
   - Provides REST endpoints for content and quiz generation
   - Runs on http://127.0.0.1:8000 by default

2. **API Client** (`lib/api-client.ts`)
   - TypeScript client for communicating with the FastAPI service
   - Handles errors and provides fallback content
   - Configurable API URL via environment variables

3. **AI Content Module** (`data/ai-content.ts`)
   - High-level functions for generating educational content
   - Manages fallback content when AI service is unavailable
   - Converts AI response format to component-expected format

4. **Content Pages** (`app/content/[...]/page.tsx`)
   - Updated to use AI-generated content instead of static content
   - Shows loading states and AI service status
   - Maintains existing UI/UX design

## Configuration

### Environment Variables

Create a `.env.local` file in the `smartclass/` directory with:

```bash
# AI Model Service URL
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# Optional: Enable debugging
NEXT_PUBLIC_AI_DEBUG=false
```

### API Service Setup

1. **Install Dependencies** (in project root):
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the API Service**:
   ```bash
   python start_api.py
   ```
   
   Or manually:
   ```bash
   python api_model_service.py
   ```

3. **Verify Service**:
   Visit http://127.0.0.1:8000/docs for API documentation

## Content Generation

### Supported Content Types

1. **Educational Content Cards**
   - Topic introductions
   - Concept explanations
   - Examples and practice problems
   - Summaries and key takeaways

2. **Quiz Questions**
   - **Mid-Quiz**: 5 multiple choice questions
   - **Final Quiz**: Mixed format (4 MC + 2 fill-blank + 2 true/false)

### Fallback Behavior

When the AI service is unavailable, the system automatically:
- Shows informative loading messages
- Provides educational fallback content
- Maintains full functionality with static content
- Displays clear status messages to users

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and model loading state.

### Generate Content
```
POST /generate-content
{
  "topic_id": "math-numbers",
  "subtopic_id": "counting",
  "subject_id": "mathematics", 
  "grade_id": "grade-1",
  "num_cards": 5
}
```

### Generate Quiz
```
POST /generate-quiz
{
  "topic_id": "math-numbers",
  "subtopic_id": "counting",
  "subject_id": "mathematics",
  "grade_id": "grade-1", 
  "quiz_type": "mid",
  "difficulty": 1
}
```

## Usage Examples

### Basic Content Generation
```typescript
import { generateContentForSubtopic } from '@/lib/api-client'

const content = await generateContentForSubtopic(
  'counting',      // topicId
  'math-numbers',  // subtopicId  
  'mathematics',   // subjectId
  'grade-1',       // gradeId
  5               // numCards
)
```

### Quiz Generation
```typescript
import { generateQuizForTopic } from '@/lib/api-client'

const quiz = await generateQuizForTopic(
  'math-numbers',  // topicId
  'counting',      // subtopicId
  'mathematics',   // subjectId
  'grade-1',       // gradeId
  'mid'           // quizType
)
```

### Service Status Check
```typescript
import { checkAiServiceStatus } from '@/lib/api-client'

const status = await checkAiServiceStatus()
console.log(status.message) // User-friendly status message
```

## Development

### Testing AI Integration

1. **With AI Service Running**:
   - Start the FastAPI service
   - Navigate to any content page
   - Verify AI-generated content loads

2. **Without AI Service**:
   - Stop the FastAPI service
   - Navigate to content pages  
   - Verify fallback content shows with status messages

3. **API Testing**:
   ```bash
   python test_api.py
   ```

### Debugging

Set `NEXT_PUBLIC_AI_DEBUG=true` to enable additional console logging for:
- API requests and responses
- Fallback content usage
- Service availability checks

## Integration Status

✅ **Completed Features**:
- FastAPI model service with health checks
- TypeScript API client with error handling
- AI content generation with fallbacks
- Content page integration
- Loading states and status messages
- Graceful degradation

⏳ **Pending Features**:
- ChromaDB content validation
- Enhanced progress tracking
- Performance optimization
- Content caching

## Troubleshooting

### Common Issues

1. **"Model directory not found"**
   - Ensure `./llama3.2-1b-syllabus-finetuned/` exists
   - Check model file permissions

2. **"Connection refused"**
   - Verify FastAPI service is running
   - Check API URL in environment variables

3. **"Fallback content showing"**
   - Check AI service health: http://127.0.0.1:8000/health
   - Verify model loading completed

4. **Import errors**
   - Install requirements: `pip install -r requirements.txt`
   - Check Python version compatibility

### Performance Notes

- Model loading takes 30-60 seconds on first startup
- Content generation: ~2-5 seconds per request
- Quiz generation: ~3-7 seconds per request  
- Concurrent requests supported

For additional support, check the API documentation at http://127.0.0.1:8000/docs when the service is running. 