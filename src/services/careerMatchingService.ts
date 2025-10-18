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
    // Step 1: Get SOC codes that exist in BOTH soc_ri AND soc_basics tables using RPC
    // This avoids the issue where ~50% of soc_ri codes don't have basic data
    const { data: socRIData, error: riError } = await supabase.rpc('get_complete_soc_ri_data');

    // If RPC doesn't exist, fall back to filtering client-side
    if (riError && riError.code === '42883') {
      console.log('RPC not found, using client-side filtering');

      // Get all basics codes first
      const { data: basicsData } = await supabase
        .from('soc_basics')
        .select('soc_code');

      const validCodes = new Set((basicsData || []).map(b => b.soc_code));

      // Get all RI data
      const { data: allRIData, error: allRIError } = await supabase
        .from('soc_ri')
        .select('soc_code, realistic, investigative, artistic, social, enterprising, conventional');

      if (allRIError) {
        console.error('Error fetching SOC RIASEC data:', allRIError);
        return [];
      }

      // Filter to only codes that exist in basics
      const filteredData = (allRIData || []).filter(ri => validCodes.has(ri.soc_code));
      console.log(`Filtered to ${filteredData.length} SOC codes with complete data (from ${allRIData?.length || 0} total)`);

      if (filteredData.length === 0) {
        console.error('No SOC codes found with complete data');
        return [];
      }

      return await processMatchingCareers(userRIASECScore, filteredData);
    }

    if (riError) {
      console.error('Error fetching SOC RIASEC data:', riError);
      return [];
    }

    if (!socRIData || socRIData.length === 0) {
      console.error('No SOC RIASEC data found');
      return [];
    }

    console.log(`Found ${socRIData.length} SOC codes with complete data`);

    return await processMatchingCareers(userRIASECScore, socRIData);
  } catch (error) {
    console.error('Error in findMatchingCareers:', error);
    return [];
  }
}

async function processMatchingCareers(
  userRIASECScore: RIASECScore,
  socRIData: any[]
): Promise<SOCCareer[]> {
  try {


    // Calculate distances and find the best match
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

    // Get the title and description for the best match from soc_basics
    // Since we pre-filtered, this should always exist
    const { data: bestMatchBasic, error: basicError } = await supabase
      .from('soc_basics')
      .select('soc_code, title, description')
      .eq('soc_code', bestMatch.soc_code)
      .maybeSingle();

    if (basicError || !bestMatchBasic) {
      console.error('Error fetching SOC basic data (should not happen with pre-filtered data):', basicError);
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
