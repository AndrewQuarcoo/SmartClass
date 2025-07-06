/**
 * AI-powered content generation for SmartClass
 * This module provides AI-generated educational content while maintaining fallbacks
 */

import { 
  generateContentForSubtopic, 
  generateQuizForTopic, 
  generateTopicsForSubject,
  checkAiServiceStatus,
  ContentCard,
  QuizQuestion,
  TopicDescription
} from '@/lib/api-client'
import { 
  chromaClient, 
  generateRAGEnhancedContent, 
  checkChromaDBStatus,
  RetrievalContext 
} from '@/lib/chromadb-client'
import { contentCache } from '@/lib/content-cache'

// Enhanced content interfaces
export interface AIContentCard extends ContentCard {
  image?: string;
  validation?: {
    isValid: boolean;
    confidence: number;
    suggestions: string[];
    curriculumAlignment: number;
  };
  ragContext?: RetrievalContext;
}

export interface AIQuizQuestion extends QuizQuestion {
  options?: string[];
  validation?: {
    isValid: boolean;
    confidence: number;
    suggestions: string[];
    curriculumAlignment: number;
  };
}

/**
 * Generate fallback topics when AI service is unavailable
 */
function getFallbackTopics(subjectId: string, gradeId: string, numTopics: number): TopicDescription[] {
  const fallbackData = {
    mathematics: [
      { topic_id: "numbers", title: "Numbers & Operations", description: "Learn counting, addition, subtraction and number relationships", level: 1 },
      { topic_id: "geometry", title: "Shapes & Space", description: "Explore shapes, patterns and spatial relationships", level: 2 },
      { topic_id: "measurement", title: "Measurement", description: "Understand length, time, weight and capacity", level: 3 },
      { topic_id: "fractions", title: "Fractions & Decimals", description: "Work with parts of a whole and decimal numbers", level: 4 },
      { topic_id: "data", title: "Data & Statistics", description: "Collect, organize and interpret data", level: 5 }
    ],
    english: [
      { topic_id: "reading", title: "Reading Skills", description: "Build phonics, fluency and comprehension abilities", level: 1 },
      { topic_id: "writing", title: "Writing Skills", description: "Express ideas clearly through written communication", level: 2 },
      { topic_id: "speaking", title: "Speaking & Listening", description: "Develop oral communication and listening skills", level: 3 },
      { topic_id: "grammar", title: "Grammar & Language", description: "Master language rules and conventions", level: 4 },
      { topic_id: "literature", title: "Literature & Poetry", description: "Explore stories, poems and literary works", level: 5 }
    ],
    science: [
      { topic_id: "living-things", title: "Living Things", description: "Study plants, animals and their environments", level: 1 },
      { topic_id: "materials", title: "Materials & Matter", description: "Explore properties and changes in materials", level: 2 },
      { topic_id: "forces", title: "Forces & Motion", description: "Understand how things move and forces around us", level: 3 },
      { topic_id: "earth", title: "Earth & Space", description: "Learn about our planet and the universe", level: 4 },
      { topic_id: "energy", title: "Energy & Environment", description: "Discover energy sources and environmental science", level: 5 }
    ]
  };

  const topics = fallbackData[subjectId.toLowerCase() as keyof typeof fallbackData] || [
    { topic_id: "general", title: `${subjectId} Fundamentals`, description: `Core concepts in ${subjectId}`, level: 1 }
  ];

  return topics.slice(0, numTopics);
}

/**
 * Generate AI-powered topics for a subject with fallbacks
 */
export async function getAITopicsForSubject(
  subjectId: string,
  gradeId: string,
  numTopics: number = 5
): Promise<TopicDescription[]> {
  try {
    // Check cache first for topics (using generic cache methods)
    const cacheParams = {
      type: 'content' as const,
      topicId: 'topics',
      subtopicId: 'all',
      subjectId,
      gradeId,
      numCards: numTopics
    };
    
    const cachedTopics = contentCache.get<TopicDescription[]>(cacheParams);

    if (cachedTopics) {
      console.log('Using cached topics for:', { subjectId, gradeId });
      return cachedTopics;
    }

    // Check if AI service is available
    const serviceStatus = await checkAiServiceStatus();
    
    if (!serviceStatus.available || !serviceStatus.modelLoaded) {
      console.log('AI service not available, using fallback topics');
      const fallbackTopics = getFallbackTopics(subjectId, gradeId, numTopics);
      // Cache fallback topics with shorter TTL
      contentCache.set(cacheParams, fallbackTopics, 5 * 60 * 1000); // 5 minutes
      return fallbackTopics;
    }

    // Generate AI topics
    const aiTopics = await generateTopicsForSubject(subjectId, gradeId, numTopics);

    // Cache the generated topics
    contentCache.set(cacheParams, aiTopics, 30 * 60 * 1000); // 30 minutes

    return aiTopics;

  } catch (error) {
    console.error('Error generating AI topics:', error);
    const fallbackTopics = getFallbackTopics(subjectId, gradeId, numTopics);
    return fallbackTopics;
  }
}

/**
 * Generate AI-powered content for a subtopic with fallbacks
 */
export async function getAIContentForSubtopic(
  subtopicId: string,
  topicId: string,
  subjectId: string,
  gradeId: string,
  numCards: number = 5
): Promise<AIContentCard[]> {
  try {
    // Check cache first
    const cachedContent = contentCache.getCachedContent(
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      numCards
    );

    if (cachedContent) {
      console.log('Using cached content for:', { topicId, subtopicId });
      return cachedContent;
    }

    // Check if AI service is available
    const serviceStatus = await checkAiServiceStatus();
    
    if (!serviceStatus.available || !serviceStatus.modelLoaded) {
      console.log('AI service not available, using fallback content');
      const fallbackContent = getFallbackContent(subtopicId, topicId, subjectId);
      // Cache fallback content with shorter TTL
      contentCache.cacheContent(topicId, subtopicId, subjectId, gradeId, fallbackContent, numCards);
      return fallbackContent;
    }

    // Check ChromaDB status for RAG enhancement
    const chromaStatus = await checkChromaDBStatus();
    console.log('ChromaDB status:', chromaStatus.message);

    // Generate RAG-enhanced content if ChromaDB is available
    let enhancedContent: AIContentCard[] = [];
    
    if (chromaStatus.available && chromaStatus.collectionExists) {
      // Use RAG-enhanced generation
      enhancedContent = await generateRAGEnhancedContentCards(
        subtopicId,
        topicId,
        subjectId,
        gradeId,
        numCards
      );
    } else {
      // Fallback to standard AI generation
      const aiContent = await generateContentForSubtopic(
        topicId,
        subtopicId,
        subjectId,
        gradeId,
        numCards
      );

      enhancedContent = aiContent.map(card => ({
        ...card,
        image: shouldHaveImage(card.title, card.body) ? "/placeholder.svg?height=200&width=400" : undefined
      }));
    }

    // Cache the generated content
    contentCache.cacheContent(topicId, subtopicId, subjectId, gradeId, enhancedContent, numCards);

    return enhancedContent;

  } catch (error) {
    console.error('Error generating AI content:', error);
    const fallbackContent = getFallbackContent(subtopicId, topicId, subjectId);
    // Cache fallback content with shorter TTL (5 minutes)
    contentCache.cacheContent(topicId, subtopicId, subjectId, gradeId, fallbackContent, numCards);
    return fallbackContent;
  }
}

/**
 * Generate AI-powered quiz questions with fallbacks
 */
export async function getAIQuizForTopic(
  topicId: string,
  subtopicId: string,
  subjectId: string,
  gradeId: string,
  quizType: "mid" | "main" | "exam"
): Promise<AIQuizQuestion[]> {
  try {
    // Map quiz types to API format for caching
    const apiQuizType = quizType === "main" ? "mid" : (quizType === "exam" ? "final" : quizType) as "mid" | "final";

    // Check cache first
    const cachedQuiz = contentCache.getCachedQuiz(
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      apiQuizType
    );

    if (cachedQuiz) {
      console.log('Using cached quiz for:', { topicId, subtopicId, quizType });
      return cachedQuiz;
    }

    // Check if AI service is available
    const serviceStatus = await checkAiServiceStatus();
    
    if (!serviceStatus.available || !serviceStatus.modelLoaded) {
      console.log('AI service not available, using fallback quiz');
      const fallbackQuiz = getFallbackQuiz(topicId, subtopicId, subjectId, quizType);
      // Cache fallback quiz with shorter TTL
      contentCache.cacheQuiz(topicId, subtopicId, subjectId, gradeId, apiQuizType, fallbackQuiz);
      return fallbackQuiz;
    }

    // Generate AI quiz
    const aiQuiz = await generateQuizForTopic(
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      apiQuizType
    );

    // Cache the generated quiz
    contentCache.cacheQuiz(topicId, subtopicId, subjectId, gradeId, apiQuizType, aiQuiz);

    return aiQuiz;

  } catch (error) {
    console.error('Error generating AI quiz:', error);
    const fallbackQuiz = getFallbackQuiz(topicId, subtopicId, subjectId, quizType);
    const apiQuizType = quizType === "main" ? "mid" : (quizType === "exam" ? "final" : quizType) as "mid" | "final";
    // Cache fallback quiz with shorter TTL
    contentCache.cacheQuiz(topicId, subtopicId, subjectId, gradeId, apiQuizType, fallbackQuiz);
    return fallbackQuiz;
  }
}

/**
 * Determine if content should have an image based on title and body
 */
function shouldHaveImage(title: string, body: string): boolean {
  const imageKeywords = [
    'diagram', 'picture', 'image', 'chart', 'graph', 'illustration',
    'visual', 'map', 'timeline', 'shape', 'geometry', 'animal', 'plant'
  ];
  
  const text = (title + ' ' + body).toLowerCase();
  return imageKeywords.some(keyword => text.includes(keyword));
}

/**
 * Fallback content generation based on subtopic
 */
function getFallbackContent(subtopicId: string, topicId: string, subjectId: string): AIContentCard[] {
  const baseContent = [
    {
      title: `Introduction to ${formatTitle(subtopicId)}`,
      body: `<p>Welcome to this lesson on ${formatTitle(subtopicId)}!</p>
             <p>This topic is an important part of ${formatTitle(subjectId)} education.</p>
             <p>Key learning objectives for this lesson:</p>
             <ul class="list-disc pl-6 my-4 space-y-2">
               <li>Understand the basic concepts</li>
               <li>Learn practical applications</li>
               <li>Practice with examples</li>
               <li>Apply knowledge to solve problems</li>
             </ul>
             <div class="bg-blue-50 p-4 rounded-md my-4 border-l-4 border-blue-400">
               <p class="font-semibold">Note: Enhanced AI content will be available when the AI service is running.</p>
             </div>`,
      card_type: 'introduction'
    },
    {
      title: `Key Concepts in ${formatTitle(subtopicId)}`,
      body: `<p>Let's explore the fundamental concepts you'll learn in this lesson:</p>
             <div class="space-y-4 my-4">
               <div class="bg-gray-50 p-3 rounded-md">
                 <h4 class="font-semibold mb-2">Core Principles</h4>
                 <p>Understanding the underlying principles helps build a solid foundation.</p>
               </div>
               <div class="bg-gray-50 p-3 rounded-md">
                 <h4 class="font-semibold mb-2">Real-World Applications</h4>
                 <p>See how these concepts apply to everyday situations and future learning.</p>
               </div>
               <div class="bg-gray-50 p-3 rounded-md">
                 <h4 class="font-semibold mb-2">Practice Opportunities</h4>
                 <p>Apply what you learn through guided exercises and examples.</p>
               </div>
             </div>`,
      card_type: 'concepts'
    },
    {
      title: `Summary and Next Steps`,
      body: `<p>Great job working through this lesson on ${formatTitle(subtopicId)}!</p>
             <p>Remember these key points:</p>
             <ul class="list-disc pl-6 my-4 space-y-2">
               <li>Practice regularly to reinforce your learning</li>
               <li>Ask questions when you need clarification</li>
               <li>Connect new concepts to what you already know</li>
               <li>Look for patterns and relationships</li>
             </ul>
             <div class="bg-green-50 p-4 rounded-md my-4 border-l-4 border-green-400">
               <p class="font-semibold">Ready for the quiz? Test your understanding of ${formatTitle(subtopicId)}!</p>
             </div>`,
      card_type: 'summary'
    }
  ];

  return baseContent;
}

/**
 * Fallback quiz generation based on topic and type
 */
function getFallbackQuiz(topicId: string, subtopicId: string, subjectId: string, quizType: string): AIQuizQuestion[] {
  const baseQuestions: AIQuizQuestion[] = [
    {
      question: `What is the main focus of this lesson on ${formatTitle(subtopicId)}?`,
      question_type: 'multiple_choice',
      options: [
        'Understanding basic concepts',
        'Memorizing facts only',
        'Skipping practice exercises',
        'Avoiding difficult topics'
      ],
      correct_answer: 'Understanding basic concepts',
      explanation: `This lesson focuses on helping you understand the core concepts of ${formatTitle(subtopicId)} through clear explanations and practice.`
    },
    {
      question: `Why is it important to learn about ${formatTitle(subtopicId)}?`,
      question_type: 'multiple_choice',
      options: [
        'It connects to other subjects and real life',
        'It\'s only useful for tests',
        'It has no practical applications',
        'It\'s required but not important'
      ],
      correct_answer: 'It connects to other subjects and real life',
      explanation: `Learning ${formatTitle(subtopicId)} helps you understand the world around you and connects to many other areas of knowledge.`
    }
  ];

  if (quizType === 'main' || quizType === 'mid') {
    return baseQuestions.slice(0, 2);
  } else if (quizType === 'exam') {
    // Add more questions for exam/final quiz
    const examQuestions: AIQuizQuestion[] = [
      {
        question: `Complete this statement: "${formatTitle(subtopicId)} is important because it ____"`,
        question_type: 'fill_blank',
        correct_answer: 'helps us understand key concepts and apply them',
        explanation: 'This topic provides foundational knowledge that can be applied in various contexts.'
      },
      {
        question: `True or False: Regular practice is essential for mastering ${formatTitle(subtopicId)}.`,
        question_type: 'true_false',
        correct_answer: 'True',
        explanation: 'Regular practice helps reinforce learning and build long-term understanding.'
      }
    ];
    
    return [...baseQuestions, ...examQuestions];
  }

  return baseQuestions;
}

/**
 * Generate RAG-enhanced content cards using ChromaDB
 */
async function generateRAGEnhancedContentCards(
  subtopicId: string,
  topicId: string,
  subjectId: string,
  gradeId: string,
  numCards: number
): Promise<AIContentCard[]> {
  try {
    // Get RAG enhancement for the content prompt
    const contentPrompt = `Generate ${numCards} educational content cards for ${formatTitle(subtopicId)} in ${formatTitle(subjectId)} for ${gradeId}`;
    
    const ragResult = await generateRAGEnhancedContent(
      contentPrompt,
      subjectId,
      gradeId,
      topicId,
      subtopicId
    );

    // Generate content with enhanced prompt
    const aiContent = await generateContentForSubtopic(
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      numCards
    );

    // Validate each content card against curriculum
    const validatedContent: AIContentCard[] = await Promise.all(
      aiContent.map(async (card) => {
        const validation = await chromaClient.validateContent(
          card.body,
          subjectId,
          gradeId,
          topicId
        );

        return {
          ...card,
          image: shouldHaveImage(card.title, card.body) ? "/placeholder.svg?height=200&width=400" : undefined,
          validation,
          ragContext: ragResult.context
        };
      })
    );

    return validatedContent;

  } catch (error) {
    console.error('Error in RAG-enhanced content generation:', error);
    // Fallback to standard generation
    const aiContent = await generateContentForSubtopic(
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      numCards
    );

    return aiContent.map(card => ({
      ...card,
      image: shouldHaveImage(card.title, card.body) ? "/placeholder.svg?height=200&width=400" : undefined
    }));
  }
}

/**
 * Format subtopic/topic IDs into readable titles
 */
function formatTitle(id: string): string {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if AI-generated content is available for a specific subtopic
 */
export async function isAIContentAvailable(): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    const status = await checkAiServiceStatus();
    
    if (!status.available) {
      return {
        available: false,
        message: 'AI service is not running. Using fallback content.'
      };
    }
    
    if (!status.modelLoaded) {
      return {
        available: false,
        message: 'AI model is loading. Using fallback content.'
      };
    }
    
    return {
      available: true,
      message: 'AI-powered content is available!'
    };
  } catch (error) {
    return {
      available: false,
      message: 'Unable to connect to AI service. Using fallback content.'
    };
  }
}

/**
 * Get comprehensive system status including AI, ChromaDB, and cache
 */
export async function getSystemStatus(): Promise<{
  ai: { available: boolean; message: string };
  chromadb: { available: boolean; collectionExists: boolean; documentCount: number; message: string };
  cache: { totalEntries: number; memoryUsage: number; hitRate: number; hits: number; misses: number };
}> {
  const [aiStatus, chromaStatus] = await Promise.all([
    isAIContentAvailable(),
    checkChromaDBStatus()
  ]);

  const cacheStats = contentCache.getStats();

  return {
    ai: aiStatus,
    chromadb: chromaStatus,
    cache: cacheStats
  };
}

/**
 * Preload content for better user experience
 */
export async function preloadNextTopics(
  currentTopicId: string,
  currentSubtopicId: string,
  subjectId: string,
  gradeId: string,
  allTopics: Array<{ id: string; subtopics: Array<{ id: string }> }>
): Promise<void> {
  try {
    // Find the current topic index
    const currentTopicIndex = allTopics.findIndex(topic => topic.id === currentTopicId);
    
    if (currentTopicIndex === -1) return;

    const currentTopic = allTopics[currentTopicIndex];
    const currentSubtopicIndex = currentTopic.subtopics.findIndex(st => st.id === currentSubtopicId);

    const topicsToPreload: Array<{ topicId: string; subtopicId: string; subjectId: string; gradeId: string }> = [];

    // Add next subtopic in current topic
    if (currentSubtopicIndex < currentTopic.subtopics.length - 1) {
      topicsToPreload.push({
        topicId: currentTopicId,
        subtopicId: currentTopic.subtopics[currentSubtopicIndex + 1].id,
        subjectId,
        gradeId
      });
    }

    // Add first subtopic of next topic
    if (currentTopicIndex < allTopics.length - 1) {
      const nextTopic = allTopics[currentTopicIndex + 1];
      if (nextTopic.subtopics.length > 0) {
        topicsToPreload.push({
          topicId: nextTopic.id,
          subtopicId: nextTopic.subtopics[0].id,
          subjectId,
          gradeId
        });
      }
    }

    // Preload content in background
    await contentCache.preloadContent(
      async (topicId, subtopicId, subjectId, gradeId) => {
        return await getAIContentForSubtopic(subtopicId, topicId, subjectId, gradeId);
      },
      topicsToPreload
    );

    console.log('Preloaded content for', topicsToPreload.length, 'topics');
  } catch (error) {
    console.warn('Error preloading content:', error);
  }
}

/**
 * Clear cache for content updates
 */
export function clearContentCache(topicId?: string, subtopicId?: string): void {
  if (topicId) {
    contentCache.invalidateTopic(topicId, subtopicId);
  } else {
    contentCache.clear();
  }
} 