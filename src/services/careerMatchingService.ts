import { supabase } from '../lib/supabase';
import type { RIASECScore } from '../types';

export interface SOCCareer {
  soc_code: string;
  title: string;
  description: string;
  matchScore?: number;
  isRelated?: boolean;
}

/**
 * Calculate Euclidean distance between two RIASEC scores
 */
function calculateRIASECDistance(
  userScore: RIASECScore,
  careerScore: RIASECScore
): number {
  const sum =
    Math.pow(userScore.realistic - careerScore.realistic, 2) +
    Math.pow(userScore.investigative - careerScore.investigative, 2) +
    Math.pow(userScore.artistic - careerScore.artistic, 2) +
    Math.pow(userScore.social - careerScore.social, 2) +
    Math.pow(userScore.enterprising - careerScore.enterprising, 2) +
    Math.pow(userScore.conventional - careerScore.conventional, 2);

  return Math.sqrt(sum);
}

/**
 * Find careers that match the user's RIASEC profile
 * Returns the top matching career plus 3 related careers
 */
export async function findMatchingCareers(
  userRIASECScore: RIASECScore
): Promise<SOCCareer[]> {
  try {
    // Step 1: Get all SOC codes with their RIASEC scores from soc_ri table
    const { data: socRIData, error: riError } = await supabase
      .from('soc_ri')
      .select('soc_code, realistic, investigative, artistic, social, enterprising, conventional');

    if (riError) {
      console.error('Error fetching SOC RIASEC data:', riError);
      return [];
    }

    if (!socRIData || socRIData.length === 0) {
      console.error('No SOC RIASEC data found');
      return [];
    }

    // Step 2: Calculate distances and find the best match
    const scoredCareers = socRIData.map((career) => ({
      soc_code: career.soc_code,
      distance: calculateRIASECDistance(userRIASECScore, {
        realistic: career.realistic,
        investigative: career.investigative,
        artistic: career.artistic,
        social: career.social,
        enterprising: career.enterprising,
        conventional: career.conventional,
      }),
    }));

    // Sort by distance (closest match first)
    scoredCareers.sort((a, b) => a.distance - b.distance);

    // Get the top match
    const bestMatch = scoredCareers[0];
    console.log('Best matching SOC code:', bestMatch.soc_code, 'Distance:', bestMatch.distance);

    // Step 3: Get the title and description for the best match from soc_basics
    const { data: bestMatchBasic, error: basicError } = await supabase
      .from('soc_basics')
      .select('soc_code, title, description')
      .eq('soc_code', bestMatch.soc_code)
      .maybeSingle();

    if (basicError) {
      console.error('Error fetching SOC basic data:', basicError);
      return [];
    }

    if (!bestMatchBasic) {
      console.error('No basic data found for SOC code:', bestMatch.soc_code);
      return [];
    }

    // Step 4: Find 3 related careers from soc_related
    const { data: relatedData, error: relatedError } = await supabase
      .from('soc_related')
      .select('related_soc_code, relatedness_tier')
      .eq('soc_code', bestMatch.soc_code)
      .order('relatedness_tier', { ascending: true })
      .limit(3);

    if (relatedError) {
      console.error('Error fetching related careers:', relatedError);
    }

    const relatedSOCCodes = relatedData?.map((r) => r.related_soc_code) || [];
    console.log('Related SOC codes:', relatedSOCCodes);

    // Step 5: Get titles and descriptions for related careers
    let relatedCareers: SOCCareer[] = [];
    if (relatedSOCCodes.length > 0) {
      const { data: relatedBasics, error: relatedBasicsError } = await supabase
        .from('soc_basics')
        .select('soc_code, title, description')
        .in('soc_code', relatedSOCCodes);

      if (relatedBasicsError) {
        console.error('Error fetching related career basics:', relatedBasicsError);
      } else if (relatedBasics) {
        relatedCareers = relatedBasics.map((career) => ({
          ...career,
          isRelated: true,
        }));
      }
    }

    // Step 6: Combine results - best match first, then related careers
    const results: SOCCareer[] = [
      {
        ...bestMatchBasic,
        matchScore: 100 - Math.round(bestMatch.distance),
        isRelated: false,
      },
      ...relatedCareers,
    ];

    console.log('=== CAREER MATCHING RESULTS ===');
    console.log('Top Match:', results[0].title);
    console.log('Related Careers:', relatedCareers.map((c) => c.title).join(', '));

    return results;
  } catch (error) {
    console.error('Error in findMatchingCareers:', error);
    return [];
  }
}
