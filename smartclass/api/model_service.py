"""
SmartClass AI Model Service
FastAPI service for serving the fine-tuned Llama model locally
"""

import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Union

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
BASE_MODEL = "meta-llama/Llama-3.2-1B"
FINETUNED_MODEL_PATH = "../../llama3.2-1b-syllabus-finetuned"
MAX_LENGTH = 1024
TEMPERATURE = 0.7
TOP_P = 0.9

# Global model and tokenizer variables
model = None
tokenizer = None

# Request/Response Models
class ContentRequest(BaseModel):
    topic_id: str
    subtopic_id: str
    subject_id: str
    grade_id: str
    user_level: int = 1
    num_cards: int = 5

class QuizRequest(BaseModel):
    topic_id: str
    subtopic_id: str
    subject_id: str
    grade_id: str
    quiz_type: str  # "mid" or "final"
    difficulty: int = 1

class ContentCard(BaseModel):
    title: str
    body: str
    card_type: str = "content"

class QuizQuestion(BaseModel):
    question: str
    question_type: str  # "multiple_choice", "fill_blank", "true_false"
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str

class ContentResponse(BaseModel):
    success: bool
    content: List[ContentCard]
    metadata: Dict[str, Union[str, int]]

class QuizResponse(BaseModel):
    success: bool
    questions: List[QuizQuestion]
    quiz_type: str
    metadata: Dict[str, Union[str, int]]

def load_model_and_tokenizer():
    """Load the base model, fine-tuned adapter, and tokenizer."""
    global model, tokenizer
    
    try:
        logger.info("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
        
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        logger.info("Loading base model...")
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else "cpu"
        )
        
        logger.info("Loading fine-tuned adapter...")
        model = PeftModel.from_pretrained(base_model, FINETUNED_MODEL_PATH)
        model = model.merge_and_unload()  # Merge adapter with base model
        
        logger.info("Model loaded successfully!")
        return model, tokenizer
        
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise e

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting SmartClass AI Model Service...")
    try:
        load_model_and_tokenizer()
        logger.info("Model service ready!")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e
    
    yield
    
    # Shutdown
    logger.info("Shutting down model service...")

# Create FastAPI app
app = FastAPI(
    title="SmartClass AI Model Service",
    description="Local AI service for educational content generation",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_text(prompt: str, max_length: int = MAX_LENGTH) -> str:
    """Generate text using the fine-tuned model"""
    try:
        # Encode the prompt
        inputs = tokenizer.encode(prompt, return_tensors="pt")
        
        # Move to same device as model
        if torch.cuda.is_available():
            inputs = inputs.cuda()
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_length=max_length,
                temperature=TEMPERATURE,
                top_p=TOP_P,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                num_return_sequences=1
            )
        
        # Decode the response
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Remove the original prompt from the response
        response = generated_text[len(tokenizer.decode(inputs[0], skip_special_tokens=True)):].strip()
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating text: {e}")
        raise HTTPException(status_code=500, detail=f"Text generation failed: {str(e)}")

def create_content_prompt(request: ContentRequest) -> str:
    """Create a prompt for content generation"""
    prompt = f"""Generate educational content for {request.subject_id} subject, Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}
Number of content cards: {request.num_cards}
User level: {request.user_level}

Create {request.num_cards} educational content cards. Each card should be engaging, age-appropriate, and build upon previous knowledge.

Format your response as a JSON array with this structure:
[
  {{
    "title": "Card Title",
    "body": "Detailed educational content in HTML format with examples, explanations, and interactive elements. Use <p>, <ul>, <li>, <strong>, <em> tags for formatting.",
    "card_type": "content"
  }}
]

Ensure the content is:
- Educational and engaging for the specified grade level
- Progressive in difficulty
- Includes practical examples
- Uses clear, simple language
- Incorporates relevant real-world applications

Generate content now:"""

    return prompt

def create_quiz_prompt(request: QuizRequest) -> str:
    """Create a prompt for quiz generation"""
    if request.quiz_type == "mid":
        prompt = f"""Generate a mid-topic quiz for {request.subject_id} subject, Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}
Quiz Type: Multiple Choice (Mid-topic assessment)
Difficulty: {request.difficulty}

Create 5 multiple-choice questions that test understanding of the key concepts from this subtopic.

Format your response as a JSON array with this structure:
[
  {{
    "question": "Clear, concise question text",
    "question_type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Clear explanation of why this is the correct answer"
  }}
]

Ensure questions are:
- Age-appropriate for Grade {request.grade_id}
- Test key concepts, not just memorization
- Have one clearly correct answer
- Include plausible distractors
- Cover different aspects of the subtopic

Generate quiz now:"""
    
    else:  # final quiz
        prompt = f"""Generate a final topic quiz for {request.subject_id} subject, Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}
Quiz Type: Mixed Format (Final assessment)
Difficulty: {request.difficulty}

Create 8 mixed-format questions:
- 4 multiple choice questions
- 2 fill-in-the-blank questions  
- 2 true/false questions

Format your response as a JSON array with this structure:
[
  {{
    "question": "Question text",
    "question_type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Explanation text"
  }},
  {{
    "question": "Fill in the blank: The _____ is responsible for _____.",
    "question_type": "fill_blank",
    "options": null,
    "correct_answer": "correct word or phrase",
    "explanation": "Explanation text"
  }},
  {{
    "question": "True or False: Statement to evaluate",
    "question_type": "true_false",
    "options": ["True", "False"],
    "correct_answer": "True",
    "explanation": "Explanation text"
  }}
]

Ensure questions comprehensively test the entire topic and are appropriate for Grade {request.grade_id}.

Generate quiz now:"""
    
    return prompt

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SmartClass AI Model Service",
        "status": "running",
        "model": "Llama-3.2-1B (Fine-tuned)",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "tokenizer_loaded": tokenizer is not None,
        "cuda_available": torch.cuda.is_available(),
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.post("/generate-content", response_model=ContentResponse)
async def generate_content(request: ContentRequest):
    """Generate educational content cards"""
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        logger.info(f"Generating content for {request.topic_id}/{request.subtopic_id}")
        
        # Create prompt
        prompt = create_content_prompt(request)
        
        # Generate content
        response_text = generate_text(prompt, max_length=2048)
        
        # Parse JSON response
        try:
            # Extract JSON from response (in case there's extra text)
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON array found in response")
            
            json_str = response_text[start_idx:end_idx]
            content_data = json.loads(json_str)
            
            # Validate and create ContentCard objects
            content_cards = [ContentCard(**card) for card in content_data]
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSON parsing error: {e}")
            # Fallback: create a single content card with the raw response
            content_cards = [ContentCard(
                title=f"{request.subtopic_id.replace('-', ' ').title()} Content",
                body=f"<p>{response_text}</p>",
                card_type="content"
            )]
        
        return ContentResponse(
            success=True,
            content=content_cards,
            metadata={
                "topic_id": request.topic_id,
                "subtopic_id": request.subtopic_id,
                "grade_id": request.grade_id,
                "num_cards": len(content_cards)
            }
        )
        
    except Exception as e:
        logger.error(f"Content generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """Generate quiz questions"""
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        logger.info(f"Generating {request.quiz_type} quiz for {request.topic_id}/{request.subtopic_id}")
        
        # Create prompt
        prompt = create_quiz_prompt(request)
        
        # Generate quiz
        response_text = generate_text(prompt, max_length=2048)
        
        # Parse JSON response
        try:
            # Extract JSON from response
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON array found in response")
            
            json_str = response_text[start_idx:end_idx]
            quiz_data = json.loads(json_str)
            
            # Validate and create QuizQuestion objects
            quiz_questions = [QuizQuestion(**question) for question in quiz_data]
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSON parsing error: {e}")
            # Fallback: create a simple quiz question
            quiz_questions = [QuizQuestion(
                question=f"What did you learn about {request.subtopic_id.replace('-', ' ')}?",
                question_type="multiple_choice",
                options=["A lot", "Some things", "Basic concepts", "Advanced topics"],
                correct_answer="A lot",
                explanation="This is a fallback question due to parsing issues."
            )]
        
        return QuizResponse(
            success=True,
            questions=quiz_questions,
            quiz_type=request.quiz_type,
            metadata={
                "topic_id": request.topic_id,
                "subtopic_id": request.subtopic_id,
                "grade_id": request.grade_id,
                "num_questions": len(quiz_questions)
            }
        )
        
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "model_service:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    ) 