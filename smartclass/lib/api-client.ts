/**
 * API Client for SmartClass AI Model Service
 * Handles communication with the local FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Types matching the FastAPI service
export interface ContentRequest {
  topic_id: string;
  subtopic_id: string;
  subject_id: string;
  grade_id: string;
  user_level?: number;
  num_cards?: number;
}

export interface QuizRequest {
  topic_id: string;
  subtopic_id: string;
  subject_id: string;
  grade_id: string;
  quiz_type: 'mid' | 'final';
  difficulty?: number;
}

export interface TopicDescriptionRequest {
  subject_id: string;
  grade_id: string;
  num_topics?: number;
}

export interface ContentCard {
  title: string;
  body: string;
  card_type: string;
}

export interface QuizQuestion {
  question: string;
  question_type: 'multiple_choice' | 'fill_blank' | 'true_false';
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface ContentResponse {
  success: boolean;
  content: ContentCard[];
  metadata: {
    topic_id: string;
    subtopic_id: string;
    grade_id: string;
    num_cards: number;
  };
}

export interface QuizResponse {
  success: boolean;
  questions: QuizQuestion[];
  quiz_type: string;
  metadata: {
    topic_id: string;
    subtopic_id: string;
    grade_id: string;
    num_questions: number;
  };
}

export interface TopicDescription {
  topic_id: string;
  title: string;
  description: string;
  level: number;
}

export interface TopicDescriptionResponse {
  success: boolean;
  topics: TopicDescription[];
  metadata: {
    subject_id: string;
    grade_id: string;
    num_topics: number;
  };
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  tokenizer_loaded: boolean;
  cuda_available: boolean;
  device: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Check if the API service is healthy and model is loaded
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/health');
  }

  /**
   * Generate educational content cards
   */
  async generateContent(request: ContentRequest): Promise<ContentResponse> {
    return this.makeRequest<ContentResponse>('/generate-content', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate quiz questions
   */
  async generateQuiz(request: QuizRequest): Promise<QuizResponse> {
    return this.makeRequest<QuizResponse>('/generate-quiz', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate topic descriptions
   */
  async generateTopics(request: TopicDescriptionRequest): Promise<TopicDescriptionResponse> {
    return this.makeRequest<TopicDescriptionResponse>('/generate-topics', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Check if the API service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      await this.makeRequest('/');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Helper functions for common operations
export async function generateContentForSubtopic(
  topicId: string,
  subtopicId: string,
  subjectId: string,
  gradeId: string,
  numCards: number = 5
): Promise<ContentCard[]> {
  try {
    const response = await apiClient.generateContent({
      topic_id: topicId,
      subtopic_id: subtopicId,
      subject_id: subjectId,
      grade_id: gradeId,
      num_cards: numCards,
    });

    return response.content;
  } catch (error) {
    console.error('Error generating content:', error);
    // Return fallback content
    return [
      {
        title: `${subtopicId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Overview`,
        body: `<p>Welcome to this lesson on ${subtopicId.replace('-', ' ')}.</p><p>This content will be available when the AI service is running.</p>`,
        card_type: 'content'
      }
    ];
  }
}

export async function generateQuizForTopic(
  topicId: string,
  subtopicId: string,
  subjectId: string,
  gradeId: string,
  quizType: 'mid' | 'final'
): Promise<QuizQuestion[]> {
  try {
    const response = await apiClient.generateQuiz({
      topic_id: topicId,
      subtopic_id: subtopicId,
      subject_id: subjectId,
      grade_id: gradeId,
      quiz_type: quizType,
    });

    return response.questions;
  } catch (error) {
    console.error('Error generating quiz:', error);
    // Return fallback quiz
    return [
      {
        question: `What did you learn about ${subtopicId.replace('-', ' ')}?`,
        question_type: 'multiple_choice',
        options: ['Very helpful concepts', 'Some new ideas', 'Basic information', 'Advanced topics'],
        correct_answer: 'Very helpful concepts',
        explanation: 'This is a fallback question. The AI-generated quiz will be available when the service is running.'
      }
    ];
  }
}

/**
 * Check if AI service is available and show appropriate UI state
 */
export async function generateTopicsForSubject(
  subjectId: string,
  gradeId: string,
  numTopics: number = 10
): Promise<TopicDescription[]> {
  try {
    const response = await apiClient.generateTopics({
      subject_id: subjectId,
      grade_id: gradeId,
      num_topics: numTopics,
    });

    return response.topics;
  } catch (error) {
    console.error('Error generating topics:', error);
    // Return comprehensive fallback topics based on typical curriculum
    const fallbackTopics = {
      mathematics: [
        { topic_id: "numbers", title: "Numbers & Operations", description: "Learn counting, addition, subtraction and number relationships", level: 1 },
        { topic_id: "fractions", title: "Fractions & Decimals", description: "Work with parts of a whole and decimal numbers", level: 2 },
        { topic_id: "geometry", title: "Shapes & Space", description: "Explore shapes, patterns and spatial relationships", level: 3 },
        { topic_id: "measurement", title: "Measurement", description: "Understand length, time, weight, capacity and area", level: 4 },
        { topic_id: "data", title: "Data & Statistics", description: "Collect, organize and interpret data and graphs", level: 5 },
        { topic_id: "algebra", title: "Patterns & Algebra", description: "Discover patterns and basic algebraic thinking", level: 6 },
        { topic_id: "money", title: "Money & Finance", description: "Learn about money, prices and basic financial literacy", level: 7 }
      ],
      english: [
        { topic_id: "phonics", title: "Phonics & Sounds", description: "Learn letter sounds and phonetic patterns", level: 1 },
        { topic_id: "reading", title: "Reading Skills", description: "Build fluency, comprehension and reading strategies", level: 2 },
        { topic_id: "writing", title: "Writing Skills", description: "Express ideas through written communication", level: 3 },
        { topic_id: "speaking", title: "Speaking & Listening", description: "Develop oral communication and listening skills", level: 4 },
        { topic_id: "grammar", title: "Grammar & Language", description: "Master language rules, parts of speech and conventions", level: 5 },
        { topic_id: "vocabulary", title: "Vocabulary & Spelling", description: "Expand word knowledge and spelling skills", level: 6 },
        { topic_id: "literature", title: "Literature & Poetry", description: "Explore stories, poems and literary works", level: 7 }
      ],
      science: [
        { topic_id: "living-things", title: "Living Things", description: "Study plants, animals and their life processes", level: 1 },
        { topic_id: "human-body", title: "Human Body", description: "Learn about body systems, health and nutrition", level: 2 },
        { topic_id: "materials", title: "Materials & Matter", description: "Explore properties and changes in materials", level: 3 },
        { topic_id: "forces", title: "Forces & Motion", description: "Understand movement, forces and simple machines", level: 4 },
        { topic_id: "earth", title: "Earth & Environment", description: "Study weather, seasons, rocks and environmental science", level: 5 },
        { topic_id: "energy", title: "Energy & Light", description: "Discover different forms of energy, light and sound", level: 6 },
        { topic_id: "space", title: "Space & Universe", description: "Explore the solar system, planets and stars", level: 7 }
      ],
      "social-studies": [
        { topic_id: "community", title: "Community & Family", description: "Learn about families, communities and social roles", level: 1 },
        { topic_id: "history", title: "History & Heritage", description: "Explore local and national history and culture", level: 2 },
        { topic_id: "geography", title: "Geography & Environment", description: "Study maps, locations and physical features", level: 3 },
        { topic_id: "culture", title: "Culture & Traditions", description: "Understand different cultures and traditions", level: 4 },
        { topic_id: "government", title: "Government & Citizenship", description: "Learn about governance, rights and responsibilities", level: 5 },
        { topic_id: "economics", title: "Economics & Trade", description: "Understand basic economics, trade and resources", level: 6 }
      ],
      "physical-education": [
        { topic_id: "movement", title: "Movement & Coordination", description: "Develop basic movement skills and body coordination", level: 1 },
        { topic_id: "games", title: "Games & Sports", description: "Learn traditional games, sports rules and teamwork", level: 2 },
        { topic_id: "fitness", title: "Health & Fitness", description: "Build physical fitness, strength and endurance", level: 3 },
        { topic_id: "dance", title: "Dance & Rhythm", description: "Explore dance, rhythm and creative movement", level: 4 },
        { topic_id: "safety", title: "Safety & First Aid", description: "Learn safety rules, injury prevention and basic first aid", level: 5 },
        { topic_id: "athletics", title: "Athletics & Track", description: "Practice running, jumping, throwing and athletic skills", level: 6 },
        { topic_id: "swimming", title: "Swimming & Water Safety", description: "Learn swimming techniques and water safety skills", level: 7 }
      ]
    };

    return fallbackTopics[subjectId.toLowerCase() as keyof typeof fallbackTopics] || [
      { topic_id: "general", title: `${subjectId} Fundamentals`, description: `Core concepts in ${subjectId}`, level: 1 }
    ];
  }
}

export async function checkAiServiceStatus(): Promise<{
  available: boolean;
  modelLoaded: boolean;
  message: string;
}> {
  try {
    const health = await apiClient.checkHealth();
    
    if (!health.model_loaded) {
      return {
        available: true,
        modelLoaded: false,
        message: 'AI service is starting up. Model is loading...'
      };
    }

    return {
      available: true,
      modelLoaded: true,
      message: 'AI service is ready!'
    };
  } catch (error) {
    return {
      available: false,
      modelLoaded: false,
      message: 'AI service is not available. Using fallback content.'
    };
  }
} 