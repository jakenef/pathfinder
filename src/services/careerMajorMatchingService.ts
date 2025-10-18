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

async function selectMajorsWithAI(
  careerTitle: string,
  careerDescription: string,
  allMajors: Major[]
): Promise<CareerMajorMatch[]> {
  console.log('\n=== AI-BASED MAJOR SELECTION ===');

  try {
    const majorsList = allMajors.map((m, i) =>
      `${i + 1}. [${m.id}] ${m.name}: ${m.description.substring(0, 100)}...`
    ).join('\n');

    const prompt = `You are a career counselor helping a student who wants to become a "${careerTitle}".

Career Description: ${careerDescription.substring(0, 400)}

Below is a complete list of available college majors. Select the 4-6 most relevant majors that would directly prepare someone for this career. Focus on majors that provide the necessary knowledge, skills, and credentials.

Available Majors:
${majorsList}

For each selected major, provide:
1. The exact major name as it appears in the list
2. A brief (1-2 sentences) explanation of why this major prepares someone for this career

Format your response as a JSON array:
[
  {
    "majorName": "Exact major name from list",
    "cipCode": "The CIP code in brackets",
    "reason": "Brief explanation (under 120 characters)"
  }
]

IMPORTANT:
- Use the EXACT major names from the list above
- Choose majors that DIRECTLY relate to the career
- Prioritize practical relevance over superficial keyword matches
- Return 4-6 majors maximum`;

    console.log('Sending major selection prompt to OpenAI...');
    const response = await sendMessage([], prompt);

    console.log('\nAI Response received (first 800 chars):', response.substring(0, 800));

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('❌ Could not parse AI response');
      console.warn('Full response:', response);
      return [];
    }

    const aiSelections = JSON.parse(jsonMatch[0]);
    console.log('\n✅ Parsed AI selections:', aiSelections);

    const matches: CareerMajorMatch[] = [];

    for (const selection of aiSelections) {
      const cleanCipCode = selection.cipCode?.replace(/[\[\]]/g, '').trim();

      const major = allMajors.find(m =>
        m.id === cleanCipCode ||
        m.id === selection.cipCode ||
        m.name.toLowerCase() === selection.majorName.toLowerCase() ||
        m.name.toLowerCase().includes(selection.majorName.toLowerCase().substring(0, 20))
      );

      if (major) {
        console.log(`✅ Matched: "${selection.majorName}" -> ${major.name} (CIP: ${major.id})`);
        matches.push({
          major,
          matchScore: 10,
          matchReason: selection.reason
        });
      } else {
        console.log(`❌ Could not find major: "${selection.majorName}" (CIP: ${selection.cipCode})`);
      }
    }

    console.log(`\n✅ Successfully matched ${matches.length} majors`);
    return matches;

  } catch (error) {
    console.error('❌ Error in AI major selection:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return [];
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
      .select('*');

    if (error) {
      console.error('❌ Error fetching majors from database:', error);
      return [];
    }

    if (!allMajors || allMajors.length === 0) {
      console.error('❌ No majors found in database');
      return [];
    }

    console.log('✅ Fetched', allMajors.length, 'majors from database');

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

    const aiMatches = await selectMajorsWithAI(
      careerTitle,
      careerDescription,
      mappedMajors
    );

    if (aiMatches.length === 0) {
      console.log('⚠️ AI selection failed, falling back to keyword matching');
      const scoredMatches = await scoreMajorsForCareer(
        careerTitle,
        careerDescription,
        mappedMajors,
        userProfile
      );

      if (scoredMatches.length === 0) {
        return [];
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
    }

    console.log('\n=== FINAL RESULTS ===');
    console.log('Returning', aiMatches.length, 'AI-selected majors');
    aiMatches.forEach((m, i) => {
      console.log(`${i + 1}. ${m.major.name}`);
      console.log(`   Reason: ${m.matchReason}`);
    });
    console.log('========================================\n\n');

    return aiMatches.map(m => ({
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
