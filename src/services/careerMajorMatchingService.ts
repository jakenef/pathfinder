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
  console.log('\n=== SCORING MAJORS FOR CAREER ===');
  console.log('Career Title:', careerTitle);
  console.log('Career Description:', careerDescription.substring(0, 200));
  console.log('Total majors to evaluate:', majors.length);

  const careerKeywords = extractKeywords(`${careerTitle} ${careerDescription}`);
  console.log('Career keywords extracted:', Array.from(careerKeywords).slice(0, 10));

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

  console.log('\nTop 10 scored majors BEFORE filtering:');
  scoredMajors.slice(0, 10).forEach((m, i) => {
    console.log(`${i + 1}. ${m.major.name} - Score: ${m.matchScore}`);
  });

  const filteredMatches = scoredMajors.filter(m => m.matchScore > 0).slice(0, 6);
  console.log(`\nFiltered to ${filteredMatches.length} majors with score > 0`);

  return filteredMatches;
}

async function generateAIMatchReasons(
  careerTitle: string,
  careerDescription: string,
  matches: CareerMajorMatch[]
): Promise<CareerMajorMatch[]> {
  console.log('\n=== GENERATING AI MATCH REASONS ===');
  console.log('Number of matches to generate reasons for:', matches.length);
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

    console.log('Sending prompt to OpenAI...');
    const response = await sendMessage(
      [],
      prompt
    );

    console.log('\nAI Response received (first 500 chars):', response.substring(0, 500));

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('Could not parse AI response for match reasons');
      console.warn('Full AI response:', response);
      return matches.map(m => ({
        ...m,
        matchReason: `This major provides relevant knowledge and skills for ${careerTitle}.`
      }));
    }

    const aiReasons = JSON.parse(jsonMatch[0]);
    console.log('\nParsed AI reasons:', aiReasons);

    return matches.map(match => {
      const firstWord = match.major.name.toLowerCase().split(' ')[0];
      console.log(`\nMatching major "${match.major.name}" (first word: "${firstWord}")`);

      const aiReason = aiReasons.find(
        (r: any) => {
          const found = r.majorName.toLowerCase().includes(firstWord);
          console.log(`  - Checking AI reason "${r.majorName}" - Match: ${found}`);
          return found;
        }
      );

      const finalReason = aiReason?.reason || `Provides foundational skills for ${careerTitle}.`;
      console.log(`  - Final reason: ${finalReason}`);

      return {
        ...match,
        matchReason: finalReason
      };
    });
  } catch (error) {
    console.error('Error generating AI match reasons:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
  console.log('\n\n========================================');
  console.log('GET MAJORS FOR CAREER - START');
  console.log('========================================');
  console.log('Career Title:', careerTitle);
  console.log('User Profile Interests:', userProfile.interests);
  console.log('User Profile Strengths:', userProfile.strengths);

  try {
    console.log('\nFetching majors from database...');
    const { data: allMajors, error } = await supabase
      .from('general_majors')
      .select('*')
      .limit(100);

    if (error) {
      console.error('❌ Error fetching majors from database:', error);
      return [];
    }

    if (!allMajors || allMajors.length === 0) {
      console.error('❌ No majors found in database');
      return [];
    }

    console.log('✅ Fetched', allMajors.length, 'majors from database');
    console.log('Sample major:', allMajors[0]);

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
      console.log('⚠️ No keyword matches found, returning top majors from database as fallback');
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

    console.log('\n=== FINAL RESULTS ===');
    console.log('Returning', matchesWithReasons.length, 'majors with reasons');
    matchesWithReasons.forEach((m, i) => {
      console.log(`${i + 1}. ${m.major.name} (Score: ${m.matchScore})`);
      console.log(`   Reason: ${m.matchReason}`);
    });
    console.log('========================================\n\n');

    return matchesWithReasons.map(m => ({
      ...m.major,
      matchScore: m.matchScore,
      matchReason: m.matchReason
    }));
  } catch (error) {
    console.error('❌ Critical Error in getMajorsForCareer:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return [];
  }
}
