import type { Major, UserProfile } from '../types';
import { extractKeywords } from './openaiService';

export function scoreMajors(majors: Major[], userProfile: UserProfile): Major[] {
  const userKeywords = new Set([
    ...userProfile.interests,
    ...userProfile.strengths,
    ...userProfile.values,
    ...userProfile.workStyle
  ].map(word => word.toLowerCase()));

  const allResponses = Object.values(userProfile.responses).join(' ');
  const responseKeywords = extractKeywords(allResponses);
  responseKeywords.forEach(kw => userKeywords.add(kw));

  const scoredMajors = majors.map(major => {
    let score = 0;
    const matches: string[] = [];

    const majorKeywords = [
      ...major.key_skills,
      ...major.personality_traits,
      ...major.values_alignment,
      ...extractKeywords(major.description),
      ...extractKeywords(major.typical_coursework)
    ].map(word => word.toLowerCase());

    majorKeywords.forEach(majorKw => {
      userKeywords.forEach(userKw => {
        if (majorKw.includes(userKw) || userKw.includes(majorKw)) {
          score += 1;
          matches.push(majorKw);
        }
      });
    });

    const skillMatches = major.key_skills.filter(skill =>
      Array.from(userKeywords).some(uk =>
        skill.toLowerCase().includes(uk) || uk.includes(skill.toLowerCase())
      )
    );

    const valueMatches = major.values_alignment.filter(value =>
      Array.from(userKeywords).some(uk =>
        value.toLowerCase().includes(uk) || uk.includes(value.toLowerCase())
      )
    );

    const personalityMatches = major.personality_traits.filter(trait =>
      Array.from(userKeywords).some(uk =>
        trait.toLowerCase().includes(uk) || uk.includes(trait.toLowerCase())
      )
    );

    score += skillMatches.length * 2;
    score += valueMatches.length * 1.5;
    score += personalityMatches.length * 1.5;

    let matchReason = '';
    if (skillMatches.length > 0) {
      matchReason += `Your strengths in ${skillMatches.slice(0, 2).join(' and ')} align well with this major. `;
    }
    if (valueMatches.length > 0) {
      matchReason += `This major emphasizes ${valueMatches.slice(0, 2).join(' and ')}, which matches your values. `;
    }
    if (personalityMatches.length > 0) {
      matchReason += `People who are ${personalityMatches.slice(0, 2).join(' and ')} often thrive here.`;
    }

    if (!matchReason) {
      matchReason = `Based on your interests and the skills you'll develop, this could be a great fit for you.`;
    }

    return {
      ...major,
      matchScore: score,
      matchReason: matchReason.trim()
    };
  });

  return scoredMajors
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 5);
}

export function updateUserProfile(
  profile: UserProfile,
  questionId: string,
  response: string
): UserProfile {
  const updated = { ...profile };
  updated.responses[questionId] = response;

  const keywords = extractKeywords(response.toLowerCase());

  const interestIndicators = ['enjoy', 'love', 'passion', 'interest', 'like', 'favorite', 'excited'];
  const strengthIndicators = ['good', 'excel', 'skilled', 'strong', 'talented', 'capable'];
  const valueIndicators = ['important', 'value', 'care', 'matter', 'believe', 'want'];

  keywords.forEach(keyword => {
    if (questionId.includes('1') || interestIndicators.some(ind => response.toLowerCase().includes(ind))) {
      if (!updated.interests.includes(keyword)) {
        updated.interests.push(keyword);
      }
    }

    if (questionId.includes('2') || strengthIndicators.some(ind => response.toLowerCase().includes(ind))) {
      if (!updated.strengths.includes(keyword)) {
        updated.strengths.push(keyword);
      }
    }

    if (questionId.includes('4') || valueIndicators.some(ind => response.toLowerCase().includes(ind))) {
      if (!updated.values.includes(keyword)) {
        updated.values.push(keyword);
      }
    }
  });

  if (questionId.includes('3')) {
    const workStyleKeywords = extractKeywords(response);
    workStyleKeywords.forEach(kw => {
      if (!updated.workStyle.includes(kw)) {
        updated.workStyle.push(kw);
      }
    });
  }

  return updated;
}
