# SmartClass AI Model Service

A FastAPI-based service for serving your fine-tuned Llama 3.2-1B model locally to generate educational content and quizzes.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Service

```bash
python start_api.py
```

The service will be available at:
- **API Server**: http://127.0.0.1:8000
- **Interactive Docs**: http://127.0.0.1:8000/docs
- **Alternative Docs**: http://127.0.0.1:8000/redoc

### 3. Test the Service

```bash
python test_api.py
```

## 📋 API Endpoints

### Health Check
- **GET** `/` - Basic status
- **GET** `/health` - Detailed health information

### Content Generation
- **POST** `/generate-content` - Generate educational content cards

**Request Body:**
```json
{
  "topic_id": "math-numbers",
  "subtopic_id": "counting",
  "subject_id": "mathematics",
  "grade_id": "b1",
  "user_level": 1,
  "num_cards": 5
}
```

**Response:**
```json
{
  "success": true,
  "content": [
    {
      "title": "Introduction to Counting",
      "body": "<p>Learn how to count from 1 to 10...</p>",
      "card_type": "content"
    }
  ],
  "metadata": {
    "topic_id": "math-numbers",
    "subtopic_id": "counting",
    "grade_id": "b1",
    "num_cards": 5
  }
}
```

### Quiz Generation
- **POST** `/generate-quiz` - Generate quiz questions

**Request Body:**
```json
{
  "topic_id": "math-numbers",
  "subtopic_id": "counting",
  "subject_id": "mathematics",
  "grade_id": "b1",
  "quiz_type": "mid",
  "difficulty": 1
}
```

**Quiz Types:**
- `"mid"` - Multiple choice questions only (5 questions)
- `"final"` - Mixed format: 4 multiple choice + 2 fill-in-blank + 2 true/false

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "question": "What comes after the number 5?",
      "question_type": "multiple_choice",
      "options": ["4", "6", "7", "8"],
      "correct_answer": "6",
      "explanation": "The number 6 comes after 5 in the counting sequence."
    }
  ],
  "quiz_type": "mid",
  "metadata": {
    "topic_id": "math-numbers",
    "subtopic_id": "counting",
    "grade_id": "b1",
    "num_questions": 5
  }
}
```

## 🔧 Configuration

The service configuration is at the top of `api_model_service.py`:

```python
# Configuration
BASE_MODEL = "meta-llama/Llama-3.2-1B"
FINETUNED_MODEL_PATH = "./llama3.2-1b-syllabus-finetuned"
MAX_LENGTH = 1024
TEMPERATURE = 0.7
TOP_P = 0.9
```

## 💡 Usage Tips

1. **Model Loading**: The model loads on startup - this may take a few minutes
2. **Memory Usage**: The service loads the entire model into memory
3. **GPU Support**: Automatically uses GPU if available, falls back to CPU
4. **Error Handling**: Robust fallback mechanisms for malformed AI responses
5. **CORS**: Configured for Next.js development server (localhost:3000)

## 🛠️ Troubleshooting

### Model Not Found
```bash
ERROR: Fine-tuned model directory not found!
Expected: ./llama3.2-1b-syllabus-finetuned
```
**Solution**: Ensure your fine-tuned model directory is in the project root.

### Out of Memory
**Solution**: 
- Close other applications
- Use CPU inference by setting `device_map="cpu"`
- Reduce `MAX_LENGTH` in configuration

### Slow Response
**Solution**:
- Enable GPU if available
- Reduce `MAX_LENGTH` for faster generation
- Adjust `TEMPERATURE` and `TOP_P` parameters

## 🔗 Integration with Next.js

The service is configured with CORS for your Next.js app. From your frontend:

```typescript
const response = await fetch('http://127.0.0.1:8000/generate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic_id: 'math-numbers',
    subtopic_id: 'counting',
    subject_id: 'mathematics',
    grade_id: 'b1',
    user_level: 1,
    num_cards: 5
  })
});

const data = await response.json();
```

## 📊 Performance

Based on [production deployment research](https://www.roots.ai/blog/what-we-learned-from-deploying-fine-tuned-llms-in-production):

- **GPU (recommended)**: ~130 tokens/sec on A100, handles 32 concurrent requests
- **CPU**: Slower but functional for development and low-volume usage
- **Memory**: ~2-4GB for model, additional for inference

## 🔒 Security Notes

- Service runs on localhost only (127.0.0.1)
- No authentication implemented (add if needed for production)
- Model and data stay local - no external API calls 