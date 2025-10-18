import type { UserProfile, Major } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Pathfinder, a warm and encouraging AI career counselor helping college students discover majors and careers that fit their interests, strengths, and values.

Your personality:
- Friendly, supportive, and genuinely interested in the student
- Ask thoughtful follow-up questions when appropriate
- Keep responses conversational and natural (2-4 sentences)
- Avoid being overly formal or robotic
- Celebrate their interests and strengths

Guidelines:
- Listen carefully to their responses and reference what they've shared
- When explaining major or career matches, be specific about WHY it fits them
- Keep the conversation flowing naturally
- Be encouraging but honest about different paths
- Help them feel excited about their possibilities`;

export async function sendMessage(
  messages: ChatMessage[],
  systemContext?: string
): Promise<string> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured. Please add your API key to the .env file.');
  }

  try {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: systemContext ? `${SYSTEM_PROMPT}\n\n${systemContext}` : SYSTEM_PROMPT
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I need a moment to think. Could you try again?';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

export function buildIntakeContext(
  questionIndex: number,
  totalQuestions: number,
  userProfile: UserProfile
): string {
  return `Current phase: INTAKE QUESTIONS (Question ${questionIndex + 1} of ${totalQuestions})

The student has shared:
${Object.entries(userProfile.responses).length > 0
  ? Object.entries(userProfile.responses).map(([q, a]) => `- ${q}: ${a}`).join('\n')
  : '(No responses yet)'}

Your task: Have a natural conversation about the current question. Listen to their answer, acknowledge it warmly, and when appropriate, gently transition to the next question or ask a relevant follow-up.`;
}

export function buildMajorSuggestionContext(
  userProfile: UserProfile,
  majors: Major[]
): string {
  return `Current phase: PRESENTING MAJOR MATCHES

Based on our conversation, here are the student's key traits:
- Interests: ${userProfile.interests.join(', ') || 'Not yet identified'}
- Strengths: ${userProfile.strengths.join(', ') || 'Not yet identified'}
- Values: ${userProfile.values.join(', ') || 'Not yet identified'}
- Work Style: ${userProfile.workStyle.join(', ') || 'Not yet identified'}

Their responses during our conversation:
${Object.entries(userProfile.responses).map(([q, a]) => `- ${q}: "${a}"`).join('\n')}

Top matching majors identified:
${majors.map(m => `- ${m.name}: ${m.matchReason || m.description}`).join('\n')}

Your task: You've finished asking questions. Now warmly transition into presenting these major matches. Explain how these majors connect to what they specifically told you about their interests, strengths, and values. Reference their actual responses. Make them feel excited about exploring these paths. Be conversational and personal - this is the reveal moment where you show them you've been listening. DO NOT ask any more questions.`;
}

export function buildCareerSuggestionContext(
  userProfile: UserProfile,
  selectedMajor: Major,
  careers: any[]
): string {
  return `Current phase: EXPLORING CAREER PATHS

The student has selected: ${selectedMajor.name}

Their key traits:
- Interests: ${userProfile.interests.join(', ')}
- Strengths: ${userProfile.strengths.join(', ')}
- Values: ${userProfile.values.join(', ')}

Related careers to present:
${careers.map(c => `- ${c.name}: ${c.description} (${c.salary_range})`).join('\n')}

Your task: Present these career options with enthusiasm. Explain how each career connects to their chosen major and their personal interests. Help them visualize what each career path could look like. Be encouraging and specific.`;
}

export function buildSummaryContext(
  userProfile: UserProfile,
  selectedMajor: Major,
  selectedCareers: any[]
): string {
  return `Current phase: SUMMARY & NEXT STEPS

Journey recap:
- Student's interests: ${userProfile.interests.join(', ')}
- Student's strengths: ${userProfile.strengths.join(', ')}
- Selected major: ${selectedMajor.name}
- Career paths explored: ${selectedCareers.map(c => c.name).join(', ')}

Your task: Provide an encouraging summary of their journey. Remind them why their chosen major fits them well. Give them 2-3 concrete next steps they can take right away (like talking to a professor, taking a specific course, joining a club, etc.). End on an inspiring note about their potential.`;
}

export function extractKeywords(text: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'my', 'your', 'his', 'her', 'its', 'our', 'this', 'that', 'these', 'those', 'very', 'really', 'just', 'like', 'also']);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  return [...new Set(words)];
}
