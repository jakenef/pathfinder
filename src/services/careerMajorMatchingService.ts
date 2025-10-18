import { supabase } from '../lib/supabase';
import type { Major, UserProfile } from '../types';
import { sendMessage } from './openaiService';

interface CareerMajorMatch {
  major: Major;
  matchScore: number;
  matchReason: string;
}

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
  );
}

function calculateKeywordMatchScore(
  careerKeywords: Set<string>,
  majorText: string
): number {
  const majorKeywords = extractKeywords(majorText);
  let matches = 0;

  for (const keyword of careerKeywords) {
    if (majorKeywords.has(keyword)) {
      matches++;
    }
  }

  return matches;
}

async function scoreMajorsForCareer(
  careerTitle: string,
  careerDescription: string,
  majors: Major[],
  userProfile: UserProfile
): Promise<CareerMajorMatch[]> {
  const careerKeywords = extractKeywords(`${careerTitle} ${careerDescription}`);

  const scoredMajors = majors.map(major => {
    const majorText = `${major.name} ${major.description}`;
    const titleScore = calculateKeywordMatchScore(careerKeywords, major.name) * 3;
    const descriptionScore = calculateKeywordMatchScore(careerKeywords, major.description);

    const userInterests = userProfile.interests.join(' ');
    const userStrengths = userProfile.strengths.join(' ');
    const userKeywords = extractKeywords(`${userInterests} ${userStrengths}`);
    const userAlignmentScore = calculateKeywordMatchScore(userKeywords, majorText) * 2;

    const totalScore = titleScore + descriptionScore + userAlignmentScore;

    return {
      major,
      matchScore: totalScore,
      matchReason: '',
    };
  });

  scoredMajors.sort((a, b) => b.matchScore - a.matchScore);

  return scoredMajors.filter(m => m.matchScore > 0).slice(0, 6);
}

async function generateAIMatchReasons(
  careerTitle: string,
  careerDescription: string,
  matches: CareerMajorMatch[]
): Promise<CareerMajorMatch[]> {
  if (matches.length === 0) return matches;

  try {
    const majorsList = matches.map((m, i) =>
      `${i + 1}. ${m.major.name}: ${m.major.description.substring(0, 150)}...`
    ).join('\n');

    const prompt = `You are a career counselor. A student is interested in becoming a "${careerTitle}".

Career Description: ${careerDescription.substring(0, 300)}

Here are potential college majors that could lead to this career:

${majorsList}

For each major, provide a brief (1-2 sentences) explanation of why this major specifically prepares someone for the "${careerTitle}" career. Focus on direct skills, knowledge, or credentials gained.

Format your response as a JSON array with this structure:
[
  {
    "majorName": "Major Name",
    "reason": "Brief explanation here"
  }
]

Keep each reason under 100 characters if possible. Be specific and actionable.`;

    const response = await sendMessage(
      [],
      prompt
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('Could not parse AI response for match reasons');
      return matches.map(m => ({
        ...m,
        matchReason: `This major provides relevant knowledge and skills for ${careerTitle}.`
      }));
    }

    const aiReasons = JSON.parse(jsonMatch[0]);

    return matches.map(match => {
      const aiReason = aiReasons.find(
        (r: any) => r.majorName.toLowerCase().includes(match.major.name.toLowerCase().split(' ')[0])
      );

      return {
        ...match,
        matchReason: aiReason?.reason || `Provides foundational skills for ${careerTitle}.`
      };
    });
  } catch (error) {
    console.error('Error generating AI match reasons:', error);
    return matches.map(m => ({
      ...m,
      matchReason: `This major provides relevant preparation for a career as a ${careerTitle}.`
    }));
  }
}

export async function getMajorsForCareer(
  _socCode: string,
  careerTitle: string,
  careerDescription: string,
  userProfile: UserProfile
): Promise<Major[]> {
  try {
    const { data: allMajors, error } = await supabase
      .from('general_majors')
      .select('*')
      .limit(100);

    if (error) {
      console.error('Error fetching majors:', error);
      return [];
    }

    if (!allMajors || allMajors.length === 0) {
      console.error('No majors found in database');
      return [];
    }

    const mappedMajors: Major[] = allMajors.map((gm: any) => ({
      id: gm.cip_code,
      name: gm.major_title,
      description: gm.major_summary || '',
      key_skills: [],
      personality_traits: [],
      values_alignment: [],
      typical_coursework: '',
      created_at: new Date().toISOString(),
    }));

    const scoredMatches = await scoreMajorsForCareer(
      careerTitle,
      careerDescription,
      mappedMajors,
      userProfile
    );

    if (scoredMatches.length === 0) {
      console.log('No keyword matches found, returning top majors from user profile');
      return mappedMajors.slice(0, 4).map(m => ({
        ...m,
        matchReason: `Consider this major for a career in ${careerTitle}.`
      }));
    }

    const matchesWithReasons = await generateAIMatchReasons(
      careerTitle,
      careerDescription,
      scoredMatches
    );

    return matchesWithReasons.map(m => ({
      ...m.major,
      matchScore: m.matchScore,
      matchReason: m.matchReason
    }));
  } catch (error) {
    console.error('Error in getMajorsForCareer:', error);
    return [];
  }
}
