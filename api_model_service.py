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

# ChromaDB imports
import chromadb
from chromadb.utils import embedding_functions

# ChromaDB imports
import chromadb
from chromadb.utils import embedding_functions

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
BASE_MODEL = "meta-llama/Llama-3.2-1B"
FINETUNED_MODEL_PATH = "./llama3.2-1b-syllabus-finetuned"
MAX_LENGTH = 1024
TEMPERATURE = 0.7
TOP_P = 0.9

# ChromaDB Configuration
CHROMADB_PATH = os.getenv("CHROMADB_PATH", "./syllabusvectordb")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "syllabus_collection")
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'

# Global variables
model = None
tokenizer = None
chroma_client = None
chroma_collection = None

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

class TopicDescriptionRequest(BaseModel):
    subject_id: str
    grade_id: str
    num_topics: int = 5

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

class TopicDescription(BaseModel):
    topic_id: str
    title: str
    description: str
    level: int

class TopicDescriptionResponse(BaseModel):
    success: bool
    topics: List[TopicDescription]
    metadata: Dict[str, Union[str, int]]

# ChromaDB Models
class SearchRequest(BaseModel):
    query: str
    subject: Optional[str] = None
    grade: Optional[str] = None
    n_results: int = 5

class ChromaDocument(BaseModel):
    id: str
    text: str
    metadata: Dict
    distance: Optional[float] = None

class SearchResponse(BaseModel):
    success: bool
    documents: List[ChromaDocument]
    total_results: int

class SystemStatusResponse(BaseModel):
    ai_service: Dict[str, Union[str, bool]]
    chromadb: Dict[str, Union[str, bool, int]]
    cache: Dict[str, Union[str, int]]

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

def load_chromadb():
    """Initialize ChromaDB client and collection."""
    global chroma_client, chroma_collection
    
    try:
        logger.info("Initializing ChromaDB...")
        
        # Initialize embedding function
        sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        )
        
        # Initialize ChromaDB client
        chroma_client = chromadb.PersistentClient(path=CHROMADB_PATH)
        
        # Get the collection
        chroma_collection = chroma_client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=sentence_transformer_ef
        )
        
        doc_count = chroma_collection.count()
        logger.info(f"ChromaDB initialized successfully! Collection '{COLLECTION_NAME}' has {doc_count} documents.")
        
        return chroma_client, chroma_collection
        
    except Exception as e:
        logger.error(f"Error loading ChromaDB: {e}")
        logger.warning("ChromaDB unavailable - AI service will work without RAG enhancement")
        return None, None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting SmartClass AI Model Service...")
    try:
        # Load AI model
        load_model_and_tokenizer()
        logger.info("AI model ready!")
        
        # Load ChromaDB
        load_chromadb()
        
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
        # Encode the prompt with attention mask
        inputs = tokenizer(prompt, return_tensors="pt", padding=True, truncation=True, max_length=512)
        
        # Move to same device as model
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        # Generate response with more constrained settings for better JSON
        with torch.no_grad():
            outputs = model.generate(
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
                max_new_tokens=300,  # Increased for complete JSON
                temperature=0.3,     # Much lower for more deterministic output
                top_p=0.8,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                num_return_sequences=1,
                repetition_penalty=1.1  # Prevent repetition
            )
        
        # Decode the response
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Remove the original prompt from the response
        original_prompt = tokenizer.decode(inputs["input_ids"][0], skip_special_tokens=True)
        response = generated_text[len(original_prompt):].strip()
        
        # Log the raw response for debugging
        logger.info(f"Raw model response: {response[:200]}...")
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating text: {e}")
        raise HTTPException(status_code=500, detail=f"Text generation failed: {str(e)}")

def create_content_prompt(request: ContentRequest) -> str:
    """Create a prompt for content generation"""
    prompt = f"""Generate {request.num_cards} educational content cards for {request.subject_id} Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}

Return ONLY valid JSON array:
[{{"title":"Lesson Title","body":"<p>Detailed educational content about {request.subtopic_id}</p>","card_type":"content"}}]

JSON:"""

    return prompt

def create_content_prompt_with_rag(request: ContentRequest, curriculum_content: str) -> str:
    """Create a RAG-enhanced prompt for content generation"""
    
    # Include curriculum content if available
    curriculum_section = ""
    if curriculum_content and curriculum_content.strip():
        curriculum_section = f"""

CURRICULUM CONTENT FROM SYLLABUS:
{curriculum_content[:1500]}...

Based on this curriculum content, create educational content for {request.subtopic_id}."""
    
    prompt = f"""Generate {request.num_cards} educational content cards for {request.subject_id} Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}{curriculum_section}

Create comprehensive educational content that teaches students about {request.subtopic_id}. Include clear explanations, examples, and engaging information.

Return ONLY valid JSON array:
[{{"title":"Lesson Title","body":"<p>Detailed educational content about {request.subtopic_id}</p>","card_type":"content"}}]

JSON:"""

    return prompt

@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """Generate quiz questions using COSEAQ-inspired RAG approach"""
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        logger.info(f"Generating {request.quiz_type} quiz for {request.topic_id}/{request.subtopic_id}")
        
        # Step 1: Query ChromaDB for curriculum content (COSEAQ Foundation)
        curriculum_content = ""
        try:
            if chroma_collection is not None:
                # COSEAQ-inspired search queries
                search_queries = [
                    f"{request.subject_id} {request.topic_id} {request.subtopic_id} quiz questions",
                    f"{request.subject_id} grade {request.grade_id} {request.subtopic_id} assessment",
                    f"{request.subtopic_id} {request.subject_id} learning objectives"
                ]
                
                all_documents = []
                for query in search_queries:
                    results = chroma_collection.query(
                        query_texts=[query],
                        n_results=3,
                        include=["documents", "metadatas"]
                    )
                    
                    if results['documents'] and results['documents'][0]:
                        all_documents.extend(results['documents'][0])
                
                if all_documents:
                    curriculum_content = "\n".join(set(all_documents))
                    logger.info(f"Retrieved {len(all_documents)} curriculum documents for quiz generation")
                else:
                    logger.warning("No curriculum content found for quiz generation")
            else:
                logger.warning("ChromaDB not available for quiz generation")
                
        except Exception as e:
            logger.error(f"ChromaDB query failed during quiz generation: {e}")
            curriculum_content = ""
        
        # Step 2: Create COSEAQ-inspired prompt
        if curriculum_content.strip():
            prompt = create_quiz_prompt_with_rag(request, curriculum_content)
            logger.info("Using RAG-enhanced COSEAQ prompt for quiz generation")
        else:
            prompt = create_quiz_prompt_coseaq_fallback(request)
            logger.info("Using COSEAQ fallback prompt for quiz generation")
        
        # Step 3: Generate quiz with simpler settings
        response_text = generate_text(prompt, max_length=1024)  # Reduced for cleaner output
        
        # Step 4: Enhanced JSON parsing with COSEAQ principles
        try:
            quiz_data = None
            
            # Method 1: Extract JSON array
            if '[' in response_text and ']' in response_text:
                start_idx = response_text.find('[')
                end_idx = response_text.rfind(']') + 1
                json_str = response_text[start_idx:end_idx]
                
                try:
                    quiz_data = json.loads(json_str)
                    logger.info(f"Successfully parsed quiz JSON with {len(quiz_data)} questions")
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parsing failed: {e}")
            
            # Method 2: COSEAQ-inspired fallback questions
            if not quiz_data:
                logger.warning("Creating COSEAQ-inspired fallback questions")
                if request.quiz_type == "mid":
                    quiz_data = [{
                        "question": f"What is the main concept in {request.subtopic_id.replace('-', ' ')}?",
                        "question_type": "multiple_choice",
                        "options": ["Basic understanding", "Advanced concepts", "Practical skills", "All of the above"],
                        "correct_answer": "All of the above",
                        "explanation": f"This subtopic covers multiple important aspects of {request.subtopic_id.replace('-', ' ')}."
                    }]
                else:  # final quiz
                    quiz_data = [
                        {
                            "question": f"What did you learn about {request.subtopic_id.replace('-', ' ')}?",
                            "question_type": "multiple_choice",
                            "options": ["Key concepts", "Important skills", "Practical applications", "All of the above"],
                            "correct_answer": "All of the above",
                            "explanation": f"This topic covers comprehensive learning about {request.subtopic_id.replace('-', ' ')}."
                        },
                        {
                            "question": f"True or False: {request.subtopic_id.replace('-', ' ')} is important for Grade {request.grade_id} students.",
                            "question_type": "true_false",
                            "options": ["True", "False"],
                            "correct_answer": "True",
                            "explanation": f"{request.subtopic_id.replace('-', ' ')} is indeed important for students at this grade level."
                        }
                    ]
            
            # Validate and create QuizQuestion objects
            quiz_questions = []
            for question_data in quiz_data:
                try:
                    # Ensure required fields exist
                    if 'question' not in question_data:
                        question_data['question'] = f"Question about {request.subtopic_id.replace('-', ' ')}"
                    if 'question_type' not in question_data:
                        question_data['question_type'] = "multiple_choice"
                    if 'correct_answer' not in question_data:
                        question_data['correct_answer'] = "Option A"
                    if 'explanation' not in question_data:
                        question_data['explanation'] = "This is the correct answer."
                    
                    # Handle options
                    if question_data['question_type'] == "multiple_choice" and 'options' not in question_data:
                        question_data['options'] = ["Option A", "Option B", "Option C", "Option D"]
                    elif question_data['question_type'] == "true_false" and 'options' not in question_data:
                        question_data['options'] = ["True", "False"]
                    
                    quiz_questions.append(QuizQuestion(**question_data))
                except Exception as question_error:
                    logger.warning(f"Error creating quiz question: {question_error}")
                    continue
            
            # Ensure we have at least one question
            if not quiz_questions:
                quiz_questions = [QuizQuestion(
                    question=f"What is important about {request.subtopic_id.replace('-', ' ')}?",
                    question_type="multiple_choice",
                    options=["It's educational", "It's relevant", "It's useful", "All of the above"],
                    correct_answer="All of the above",
                    explanation=f"All aspects of {request.subtopic_id.replace('-', ' ')} are important for learning."
                )]
            
        except Exception as e:
            logger.error(f"Quiz parsing error: {e}")
            # Ultimate COSEAQ fallback
            quiz_questions = [QuizQuestion(
                question=f"What did you learn about {request.subtopic_id.replace('-', ' ')}?",
                question_type="multiple_choice",
                options=["New concepts", "Important skills", "Practical knowledge", "All of the above"],
                correct_answer="All of the above",
                explanation="This question covers the key learning points of the topic."
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

def create_quiz_prompt_with_rag(request: QuizRequest, curriculum_content: str) -> str:
    """Create COSEAQ-inspired RAG prompt for quiz generation"""
    
    curriculum_section = ""
    if curriculum_content and curriculum_content.strip():
        curriculum_section = f"""

CURRICULUM CONTENT:
{curriculum_content[:800]}...

Based on this curriculum content, create quiz questions for {request.subtopic_id}."""
    
    if request.quiz_type == "mid":
        prompt = f"""Create a mid-topic quiz for {request.subject_id} Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}{curriculum_section}

Generate 3 multiple-choice questions using simple language for Grade {request.grade_id}.

Return ONLY valid JSON:
[{{"question":"What is {request.subtopic_id}?","question_type":"multiple_choice","options":["A","B","C","D"],"correct_answer":"A","explanation":"This is correct"}}]

JSON:"""
    
    else:  # final quiz
        prompt = f"""Create a final quiz for {request.subject_id} Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}{curriculum_section}

Generate 3 questions: 2 multiple-choice, 1 true/false.

Return ONLY valid JSON:
[{{"question":"What is {request.subtopic_id}?","question_type":"multiple_choice","options":["A","B","C","D"],"correct_answer":"A","explanation":"Correct"}},{{"question":"True or False: {request.subtopic_id} is important","question_type":"true_false","options":["True","False"],"correct_answer":"True","explanation":"True because..."}}]

JSON:"""
    
    return prompt

def create_quiz_prompt_coseaq_fallback(request: QuizRequest) -> str:
    """Create COSEAQ-inspired fallback prompt for quiz generation"""
    
    if request.quiz_type == "mid":
        prompt = f"""Create a mid-topic quiz for {request.subject_id} Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}

Generate 3 multiple-choice questions using simple language.

Return ONLY valid JSON:
[{{"question":"What is {request.subtopic_id}?","question_type":"multiple_choice","options":["A","B","C","D"],"correct_answer":"A","explanation":"This is correct"}}]

JSON:"""
    
    else:  # final quiz
        prompt = f"""Create a final quiz for {request.subject_id} Grade {request.grade_id}.

Topic: {request.topic_id}
Subtopic: {request.subtopic_id}

Generate 3 questions: 2 multiple-choice, 1 true/false.

Return ONLY valid JSON:
[{{"question":"What is {request.subtopic_id}?","question_type":"multiple_choice","options":["A","B","C","D"],"correct_answer":"A","explanation":"Correct"}},{{"question":"True or False: {request.subtopic_id} is important","question_type":"true_false","options":["True","False"],"correct_answer":"True","explanation":"True because..."}}]

JSON:"""
    
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
    """Generate educational content cards using RAG"""
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        logger.info(f"Generating content for {request.topic_id}/{request.subtopic_id}")
        
        # Step 1: Query ChromaDB for relevant curriculum content (RAG Retrieval)
        curriculum_content = ""
        try:
            if chroma_collection is not None:
                # Create comprehensive search queries for better retrieval
                search_queries = [
                    f"{request.subject_id} {request.topic_id} {request.subtopic_id}",
                    f"{request.subject_id} grade {request.grade_id} {request.subtopic_id}",
                    f"{request.subtopic_id} {request.subject_id} curriculum",
                    f"{request.topic_id} {request.subtopic_id} learning content"
                ]
                
                all_documents = []
                for query in search_queries:
                    results = chroma_collection.query(
                        query_texts=[query],
                        n_results=3,  # Get 3 results per query
                        include=["documents", "metadatas"]
                    )
                    
                    if results['documents'] and results['documents'][0]:
                        all_documents.extend(results['documents'][0])
                
                # Combine and deduplicate documents
                if all_documents:
                    curriculum_content = "\n".join(set(all_documents))  # Remove duplicates
                    logger.info(f"Retrieved {len(all_documents)} curriculum documents for content generation")
                else:
                    logger.warning("No curriculum content found in ChromaDB for content generation")
            else:
                logger.warning("ChromaDB not available for content generation")
                
        except Exception as e:
            logger.error(f"ChromaDB query failed during content generation: {e}")
            curriculum_content = ""
        
        # Step 2: Create RAG-enhanced prompt with retrieved content
        if curriculum_content.strip():
            prompt = create_content_prompt_with_rag(request, curriculum_content)
            logger.info("Using RAG-enhanced prompt for content generation")
        else:
            prompt = create_content_prompt(request)
            logger.info("Using fallback prompt for content generation")
        
        # Step 3: Generate content with the model
        response_text = generate_text(prompt, max_length=2048)
        
        # Parse JSON response with enhanced extraction
        try:
            # Multiple attempts to extract JSON
            content_data = None
            
            # Method 1: Look for JSON array
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                try:
                    content_data = json.loads(json_str)
                    logger.info(f"Successfully parsed JSON array with {len(content_data)} items")
                except json.JSONDecodeError:
                    logger.warning("Failed to parse extracted JSON array")
            
            # Method 2: If no array, try to extract JSON objects and wrap in array
            if content_data is None:
                import re
                # Look for individual JSON objects
                json_objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
                if json_objects:
                    content_data = []
                    for obj_str in json_objects:
                        try:
                            obj = json.loads(obj_str)
                            if 'title' in obj and 'body' in obj:
                                content_data.append(obj)
                        except json.JSONDecodeError:
                            continue
                    
                    if content_data:
                        logger.info(f"Extracted {len(content_data)} JSON objects")
            
            # Method 3: If still no valid JSON, create structured content from text
            if not content_data:
                logger.warning("No valid JSON found, creating structured content from response")
                lines = [line.strip() for line in response_text.split('\n') if line.strip()]
                
                if len(lines) >= 2:
                    # Try to extract title and body from text
                    title = lines[0].replace('"', '').replace('Title:', '').strip()
                    body_lines = lines[1:]
                    body = '<p>' + '</p><p>'.join(body_lines) + '</p>'
                    
                    content_data = [{
                        "title": title or f"{request.subtopic_id.replace('-', ' ').title()} Content",
                        "body": body,
                        "card_type": "content"
                    }]
                else:
                    # Last resort fallback
                    content_data = [{
                        "title": f"{request.subtopic_id.replace('-', ' ').title()} Content",
                        "body": f"<p>{response_text}</p>",
                        "card_type": "content"
                    }]
            
            # Validate and create ContentCard objects
            content_cards = []
            for card_data in content_data:
                try:
                    # Ensure required fields exist
                    if 'title' not in card_data:
                        card_data['title'] = f"Content Card {len(content_cards) + 1}"
                    if 'body' not in card_data:
                        card_data['body'] = "<p>Content will be available soon.</p>"
                    if 'card_type' not in card_data:
                        card_data['card_type'] = "content"
                    
                    content_cards.append(ContentCard(**card_data))
                except Exception as card_error:
                    logger.warning(f"Error creating content card: {card_error}")
                    continue
            
            # Ensure we have at least one card
            if not content_cards:
                content_cards = [ContentCard(
                    title=f"{request.subtopic_id.replace('-', ' ').title()} Content",
                    body=f"<p>Learning content for {request.subtopic_id.replace('-', ' ')}.</p>",
                    card_type="content"
                )]
            
        except Exception as e:
            logger.error(f"Content parsing error: {e}")
            # Ultimate fallback
            content_cards = [ContentCard(
                title=f"{request.subtopic_id.replace('-', ' ').title()} Content",
                body=f"<p>Welcome to the lesson on {request.subtopic_id.replace('-', ' ')}.</p>",
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

@app.post("/generate-topics", response_model=TopicDescriptionResponse)
async def generate_topics(request: TopicDescriptionRequest):
    """Generate topic descriptions for a subject and grade using RAG"""
    try:
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        logger.info(f"Generating topics for {request.subject_id}, Grade {request.grade_id}")
        
        # Step 1: Query ChromaDB for relevant curriculum content (RAG Retrieval)
        curriculum_content = ""
        try:
            if chroma_collection is not None:
                # Create comprehensive search queries for better retrieval
                search_queries = [
                    f"{request.subject_id} grade {request.grade_id} topics curriculum",
                    f"{request.subject_id} {request.grade_id} syllabus content",
                    f"{request.subject_id} learning objectives {request.grade_id}",
                    f"physical education {request.grade_id}" if request.subject_id == "physical-education" else f"{request.subject_id} {request.grade_id}"
                ]
                
                all_documents = []
                for query in search_queries:
                    results = chroma_collection.query(
                        query_texts=[query],
                        n_results=5,  # Get 5 results per query
                        include=["documents", "metadatas"]
                    )
                    
                    if results['documents'] and results['documents'][0]:
                        all_documents.extend(results['documents'][0])
                
                # Combine and deduplicate documents
                if all_documents:
                    curriculum_content = "\n".join(set(all_documents))  # Remove duplicates
                    logger.info(f"Retrieved {len(all_documents)} curriculum documents from ChromaDB")
                else:
                    logger.warning("No curriculum content found in ChromaDB")
            else:
                logger.warning("ChromaDB not available, proceeding without RAG")
                
        except Exception as e:
            logger.error(f"ChromaDB query failed: {e}")
            curriculum_content = ""
        
        # Step 2: Create RAG-enhanced prompt with retrieved content
        if curriculum_content.strip():
            prompt = create_topic_descriptions_prompt_with_rag(request, curriculum_content)
            logger.info("Using RAG-enhanced prompt with curriculum content")
        else:
            prompt = create_topic_descriptions_prompt(request)
            logger.info("Using fallback prompt without RAG")
        
        # Step 3: Generate topics with the model
        response_text = generate_text(prompt, max_length=2048)
        
        # Parse JSON response with enhanced extraction
        try:
            # Multiple attempts to extract JSON
            topics_data = None
            
            # Method 1: Look for JSON array
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                try:
                    topics_data = json.loads(json_str)
                    logger.info(f"Successfully parsed topics JSON array with {len(topics_data)} topics")
                except json.JSONDecodeError:
                    logger.warning("Failed to parse extracted topics JSON array")
            
            # Method 2: If no array, try to extract JSON objects
            if topics_data is None:
                import re
                json_objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
                if json_objects:
                    topics_data = []
                    for obj_str in json_objects:
                        try:
                            obj = json.loads(obj_str)
                            if 'title' in obj and 'description' in obj:
                                topics_data.append(obj)
                        except json.JSONDecodeError:
                            continue
                    
                    if topics_data:
                        logger.info(f"Extracted {len(topics_data)} topics JSON objects")
            
            # Method 3: Create fallback topics if no valid JSON
            if not topics_data:
                logger.warning("No valid topics JSON found, creating fallback topics")
                subject_examples = {
                    "mathematics": [
                        {"topic_id": "numbers", "title": "Numbers and Operations", "description": "Learn counting, addition, subtraction and number relationships", "level": 1},
                        {"topic_id": "geometry", "title": "Shapes and Space", "description": "Explore shapes, patterns and spatial relationships", "level": 2},
                        {"topic_id": "measurement", "title": "Measurement", "description": "Understand length, time, weight and capacity", "level": 3}
                    ],
                    "english": [
                        {"topic_id": "reading", "title": "Reading Skills", "description": "Build phonics, fluency and comprehension abilities", "level": 1},
                        {"topic_id": "writing", "title": "Writing Skills", "description": "Express ideas clearly through written communication", "level": 2},
                        {"topic_id": "speaking", "title": "Speaking and Listening", "description": "Develop oral communication and listening skills", "level": 3}
                    ],
                    "science": [
                        {"topic_id": "living-things", "title": "Living Things", "description": "Study plants, animals and their environments", "level": 1},
                        {"topic_id": "materials", "title": "Materials and Matter", "description": "Explore properties and changes in materials", "level": 2},
                        {"topic_id": "forces", "title": "Forces and Motion", "description": "Understand how things move and forces around us", "level": 3}
                    ]
                }
                
                topics_data = subject_examples.get(request.subject_id.lower(), [
                    {"topic_id": "topic-1", "title": f"{request.subject_id.title()} Basics", "description": f"Fundamental concepts in {request.subject_id}", "level": 1},
                    {"topic_id": "topic-2", "title": f"{request.subject_id.title()} Skills", "description": f"Building skills in {request.subject_id}", "level": 2}
                ])[:request.num_topics]
            
            # Validate and create TopicDescription objects
            topic_descriptions = []
            for i, topic_data in enumerate(topics_data[:request.num_topics]):
                try:
                    # Ensure required fields exist
                    if 'topic_id' not in topic_data:
                        topic_data['topic_id'] = f"topic-{i+1}"
                    if 'title' not in topic_data:
                        topic_data['title'] = f"Topic {i+1}"
                    if 'description' not in topic_data:
                        topic_data['description'] = f"Learning content for topic {i+1}"
                    if 'level' not in topic_data:
                        topic_data['level'] = i + 1
                    
                    topic_descriptions.append(TopicDescription(**topic_data))
                except Exception as topic_error:
                    logger.warning(f"Error creating topic description: {topic_error}")
                    continue
            
            # Ensure we have at least one topic
            if not topic_descriptions:
                topic_descriptions = [TopicDescription(
                    topic_id="general-topic",
                    title=f"{request.subject_id.title()} Fundamentals",
                    description=f"Core concepts and skills in {request.subject_id}",
                    level=1
                )]
            
        except Exception as e:
            logger.error(f"Topics parsing error: {e}")
            # Ultimate fallback
            topic_descriptions = [TopicDescription(
                topic_id="fallback-topic",
                title=f"{request.subject_id.title()} Overview",
                description=f"Introduction to {request.subject_id} concepts",
                level=1
            )]
        
        return TopicDescriptionResponse(
            success=True,
            topics=topic_descriptions,
            metadata={
                "subject_id": request.subject_id,
                "grade_id": request.grade_id,
                "num_topics": len(topic_descriptions)
            }
        )
        
    except Exception as e:
        logger.error(f"Topic generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Topic generation failed: {str(e)}")

# ChromaDB Endpoints
@app.post("/search-curriculum", response_model=SearchResponse)
async def search_curriculum(request: SearchRequest):
    """Search ChromaDB for curriculum content"""
    try:
        if chroma_collection is None:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        logger.info(f"Searching curriculum for: {request.query}")
        
        # Query ChromaDB (simplified - no where clause to avoid operator errors)
        results = chroma_collection.query(
            query_texts=[request.query],
            n_results=request.n_results
        )
        
        # Convert to response format
        documents = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                doc_data = ChromaDocument(
                    id=results["ids"][0][i] if results["ids"] else f"doc_{i}",
                    text=doc,
                    metadata=results["metadatas"][0][i] if results["metadatas"] and results["metadatas"][0] else {},
                    distance=results["distances"][0][i] if results["distances"] and results["distances"][0] else None
                )
                documents.append(doc_data)
        
        return SearchResponse(
            success=True,
            documents=documents,
            total_results=len(documents)
        )
        
    except Exception as e:
        logger.error(f"Curriculum search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/chromadb-status")
async def get_chromadb_status():
    """Get ChromaDB collection statistics"""
    try:
        if chroma_client is None or chroma_collection is None:
            return {
                "available": False,
                "message": "ChromaDB not initialized",
                "collection_name": COLLECTION_NAME,
                "document_count": 0
            }
        
        # Get collection stats
        doc_count = chroma_collection.count()
        collections = chroma_client.list_collections()
        
        return {
            "available": True,
            "message": f"ChromaDB ready with {doc_count} documents",
            "collection_name": COLLECTION_NAME,
            "document_count": doc_count,
            "total_collections": len(collections),
            "collection_exists": True
        }
        
    except Exception as e:
        logger.error(f"ChromaDB status error: {e}")
        return {
            "available": False,
            "message": f"ChromaDB error: {str(e)}",
            "collection_name": COLLECTION_NAME,
            "document_count": 0
        }

@app.get("/system-status", response_model=SystemStatusResponse)
async def get_system_status():
    """Get comprehensive system status"""
    try:
        # AI Service Status
        ai_status = {
            "status": "healthy" if model is not None else "unavailable",
            "model_loaded": model is not None,
            "tokenizer_loaded": tokenizer is not None,
            "cuda_available": torch.cuda.is_available(),
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }
        
        # ChromaDB Status
        if chroma_client is not None and chroma_collection is not None:
            doc_count = chroma_collection.count()
            chromadb_status = {
                "available": True,
                "collection_exists": True,
                "document_count": doc_count,
                "message": f"Ready with {doc_count} documents"
            }
        else:
            chromadb_status = {
                "available": False,
                "collection_exists": False,
                "document_count": 0,
                "message": "ChromaDB not available"
            }
        
        # Cache Status (placeholder for now)
        cache_status = {
            "enabled": True,
            "hit_rate": 0,
            "total_requests": 0
        }
        
        return SystemStatusResponse(
            ai_service=ai_status,
            chromadb=chromadb_status,
            cache=cache_status
        )
        
    except Exception as e:
        logger.error(f"System status error: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@app.get("/collections")
async def list_collections():
    """List all ChromaDB collections"""
    try:
        if chroma_client is None:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        collections = chroma_client.list_collections()
        
        collection_info = []
        for collection in collections:
            try:
                count = collection.count()
                collection_info.append({
                    "name": collection.name,
                    "document_count": count,
                    "metadata": collection.metadata or {}
                })
            except Exception as e:
                logger.warning(f"Error getting info for collection {collection.name}: {e}")
                collection_info.append({
                    "name": collection.name,
                    "document_count": 0,
                    "metadata": {},
                    "error": str(e)
                })
        
        return {
            "success": True,
            "collections": collection_info,
            "total_collections": len(collection_info)
        }
        
    except Exception as e:
        logger.error(f"List collections error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list collections: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "api_model_service:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    ) 