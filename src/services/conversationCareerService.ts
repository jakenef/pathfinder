import { supabase } from '../lib/supabase';
import { sendMessage } from './openaiService';
import type { RIASECScore } from '../types';
import type { SOCCareer } from './careerMatchingService';

interface ConversationCareer {
  careerTitle: string;
  confidence: number;
  reason: string;
}

interface CareerComparisonResult {
  careers: SOCCareer[];
  source: 'conversation' | 'riasec' | 'both';
}

interface ExtractedKeywords {
  domains: string[];
  interests: string[];
  activities: string[];
}

function extractInterestKeywords(conversationHistory: Array<{ role: string; content: string }>): ExtractedKeywords {
  const conversationText = conversationHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.toLowerCase())
    .join(' ');

  const domainKeywords: { [key: string]: string[] } = {
    'Marine Biology / Aquatic Sciences': ['fish', 'aquarium', 'marine', 'ocean', 'sea', 'aquatic', 'underwater', 'coral', 'reef', 'whale', 'dolphin', 'shark'],
    'Veterinary / Animal Care': ['animals', 'pets', 'vet', 'veterinary', 'dog', 'cat', 'wildlife', 'zoo', 'animal care'],
    'Healthcare / Medicine': ['doctor', 'nurse', 'medicine', 'hospital', 'patient', 'health', 'medical', 'surgery', 'clinic'],
    'Technology / Computer Science': ['coding', 'programming', 'software', 'computer', 'app', 'website', 'tech', 'data', 'ai', 'machine learning'],
    'Education / Teaching': ['teaching', 'teacher', 'education', 'school', 'students', 'learning', 'curriculum', 'classroom'],
    'Arts / Creative': ['art', 'design', 'creative', 'drawing', 'painting', 'music', 'film', 'photography', 'graphic'],
    'Business / Entrepreneurship': ['business', 'startup', 'entrepreneur', 'company', 'sales', 'marketing', 'management'],
    'Environmental Science': ['environment', 'sustainability', 'conservation', 'ecology', 'climate', 'nature', 'forest', 'wildlife'],
    'Psychology / Counseling': ['psychology', 'counseling', 'therapy', 'mental health', 'behavior', 'helping people'],
    'Engineering': ['engineering', 'build', 'design', 'mechanical', 'electrical', 'civil', 'construction'],
    'Agriculture / Horticulture': ['farming', 'agriculture', 'plants', 'gardening', 'crops', 'horticulture']
  };

  const detectedDomains: string[] = [];
  const detectedInterests: string[] = [];

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    for (const keyword of keywords) {
      if (conversationText.includes(keyword)) {
        if (!detectedDomains.includes(domain)) {
          detectedDomains.push(domain);
        }
        detectedInterests.push(keyword);
      }
    }
  }

  const activities = conversationText.match(/\b(work with|working with|study|studying|learn about|interested in|love|enjoy|passionate about)\s+([\w\s]+)/g) || [];

  console.log('\n=== KEYWORD EXTRACTION ===');
  console.log('Detected domains:', detectedDomains);
  console.log('Interest keywords:', [...new Set(detectedInterests)]);
  console.log('Activity phrases:', activities.slice(0, 5));
  console.log('========================');

  return {
    domains: detectedDomains,
    interests: [...new Set(detectedInterests)],
    activities: activities.slice(0, 10)
  };
}

export async function extractCareersFromConversation(
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ConversationCareer[]> {
  console.log('\n=== EXTRACTING CAREERS FROM CONVERSATION ===');

  if (conversationHistory.length === 0) {
    console.log('No conversation history, skipping career extraction');
    return [];
  }

  try {
    const conversationText = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const keywords = extractInterestKeywords(conversationHistory);
    const keywordContext = keywords.domains.length > 0
      ? `\n\nDetected interest domains from keywords: ${keywords.domains.join(', ')}\nKey interest terms: ${keywords.interests.slice(0, 10).join(', ')}`
      : '';

    const prompt = `Analyze this conversation between a career counselor and student. Identify careers the student would be interested in based on:
1. Careers they explicitly mentioned by name
2. Careers strongly implied by their interests, passions, and activities

Conversation:
${conversationText}${keywordContext}

Return a JSON array of relevant careers:
[
  {
    "careerTitle": "Specific career title (use official job titles)",
    "confidence": 0.0-1.0,
    "reason": "Brief explanation"
  }
]

EXAMPLES of good inference:
- Student says "I love fish, want to work with fish, work in an aquarium" → Suggest "Marine Biologist" (0.9), "Aquarist" (0.85), "Aquarium Curator" (0.75)
- Student says "I enjoy coding and building apps" → Suggest "Software Developer" (0.85), "Mobile App Developer" (0.8)
- Student says "I want to help people with mental health" → Suggest "Clinical Psychologist" (0.85), "Counselor" (0.8)

GUIDELINES:
- HIGH confidence (0.8-1.0): Student explicitly mentioned the career OR showed very strong, specific interest
- MEDIUM confidence (0.6-0.79): Student described activities/interests that strongly align with the career
- LOW confidence (0.4-0.59): Student mentioned related interests but not as specifically
- Use official career titles from O*NET or Bureau of Labor Statistics
- If student shows passion for a topic ("I love X", "I'm passionate about Y"), infer related careers
- Better to suggest 2-4 relevant careers than return empty array when interests are clear
- Only return [] if the conversation is truly too vague or general

IMPORTANT: When someone describes wanting to work with specific things (animals, fish, computers, people, etc.), suggest careers in that field!`;

    console.log('Sending conversation to OpenAI for career extraction...');
    const response = await sendMessage([], prompt);

    console.log('OpenAI response:', response);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('⚠️ No JSON found in OpenAI response');
      console.log('Attempting fallback career extraction...');
      return await fallbackCareerExtraction(keywords);
    }

    const careers: ConversationCareer[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Found ${careers.length} career(s) from OpenAI:`, careers);

    if (careers.length === 0 && keywords.domains.length > 0) {
      console.log('OpenAI returned 0 careers but keywords detected, using fallback...');
      return await fallbackCareerExtraction(keywords);
    }

    return careers.filter(c => c.confidence >= 0.4);
  } catch (error) {
    console.error('Error extracting careers from conversation:', error);
    const keywords = extractInterestKeywords(conversationHistory);
    if (keywords.domains.length > 0) {
      console.log('Error occurred but keywords detected, trying fallback...');
      return await fallbackCareerExtraction(keywords);
    }
    return [];
  }
}

async function fallbackCareerExtraction(keywords: ExtractedKeywords): Promise<ConversationCareer[]> {
  console.log('\n=== FALLBACK CAREER EXTRACTION ===');

  if (keywords.domains.length === 0) {
    console.log('No domains detected, cannot perform fallback');
    return [];
  }

  try {
    const { data: allSOCs, error } = await supabase
      .from('soc_basics')
      .select('soc_code, title, description');

    if (error || !allSOCs) {
      console.error('Error fetching SOC data:', error);
      return [];
    }

    const matchedCareers: ConversationCareer[] = [];
    const interestTerms = keywords.interests.slice(0, 5);

    console.log(`Searching SOC database for careers matching: ${interestTerms.join(', ')}`);

    for (const soc of allSOCs) {
      const searchText = `${soc.title} ${soc.description}`.toLowerCase();
      let matchScore = 0;
      const matchedTerms: string[] = [];

      for (const term of interestTerms) {
        if (searchText.includes(term)) {
          matchScore++;
          matchedTerms.push(term);
        }
      }

      if (matchScore >= 2 || (matchScore >= 1 && interestTerms.length <= 2)) {
        const confidence = Math.min(0.5 + (matchScore * 0.15), 0.85);
        matchedCareers.push({
          careerTitle: soc.title,
          confidence,
          reason: `Matches your interest in: ${matchedTerms.join(', ')}`
        });
      }
    }

    matchedCareers.sort((a, b) => b.confidence - a.confidence);
    const topCareers = matchedCareers.slice(0, 4);

    console.log(`✅ Fallback found ${topCareers.length} careers:`, topCareers);
    return topCareers;
  } catch (error) {
    console.error('Error in fallback career extraction:', error);
    return [];
  }
}

interface SOCMatch {
  soc: SOCCareer;
  score: number;
  matchType: string;
}

function scoreSOCMatch(soc: { title: string; description: string }, searchTerm: string): SOCMatch | null {
  const lowerTitle = soc.title.toLowerCase();
  const lowerDescription = soc.description?.toLowerCase() || '';
  const lowerSearch = searchTerm.toLowerCase();

  const searchWords = lowerSearch.split(/\s+/).filter(w => w.length > 2);
  const titleWords = lowerTitle.split(/\s+/);

  let score = 0;
  let matchType = '';

  if (lowerTitle === lowerSearch) {
    score = 1000;
    matchType = 'exact title match';
  }
  else if (lowerTitle.includes(lowerSearch)) {
    score = 900;
    matchType = 'title contains full phrase';
  }
  else if (lowerSearch.includes(lowerTitle)) {
    score = 850;
    matchType = 'search contains full title';
  }
  else {
    const titleWordMatches = searchWords.filter(word => titleWords.some(tw =>
      tw === word || tw.startsWith(word) || word.startsWith(tw)
    ));

    if (titleWordMatches.length === searchWords.length) {
      score = 800 + (titleWordMatches.length * 10);
      matchType = `all ${searchWords.length} keywords in title`;
    }
    else if (titleWordMatches.length > 0) {
      score = 500 + (titleWordMatches.length * 50);
      matchType = `${titleWordMatches.length}/${searchWords.length} keywords in title`;
    }
    else if (lowerDescription.includes(lowerSearch)) {
      score = 300;
      matchType = 'description contains full phrase';
    }
    else {
      const descWordMatches = searchWords.filter(word => lowerDescription.includes(word));

      if (descWordMatches.length > 0) {
        score = 100 + (descWordMatches.length * 20);
        matchType = `${descWordMatches.length}/${searchWords.length} keywords in description`;
      } else {
        return null;
      }
    }
  }

  return {
    soc: soc as SOCCareer,
    score,
    matchType
  };
}

async function findSOCCodeForCareer(careerTitle: string): Promise<SOCCareer | null> {
  console.log(`\n🔍 Finding SOC code for: "${careerTitle}"`);

  try {
    const { data: allSOCs, error } = await supabase
      .from('soc_basics')
      .select('soc_code, title, description');

    if (error || !allSOCs) {
      console.error('Error fetching SOC data:', error);
      return null;
    }

    const scoredMatches: SOCMatch[] = [];

    for (const soc of allSOCs) {
      const match = scoreSOCMatch(soc, careerTitle);
      if (match) {
        scoredMatches.push(match);
      }
    }

    if (scoredMatches.length === 0) {
      console.log('❌ No matches found in SOC database');
      return null;
    }

    scoredMatches.sort((a, b) => b.score - a.score);

    console.log(`\n✅ Found ${scoredMatches.length} matches, using top result: ${scoredMatches[0].soc.title}`);
    console.log(`   Match type: ${scoredMatches[0].matchType} (score: ${scoredMatches[0].score})`);

    if (scoredMatches.length > 1) {
      console.log(`\n   Other top matches:`);
      scoredMatches.slice(1, 6).forEach((match, idx) => {
        console.log(`   ${idx + 2}. ${match.soc.title} (${match.matchType}, score: ${match.score})`);
      });
    }

    const bestMatch = scoredMatches[0].soc;

    if (scoredMatches[0].score < 200) {
      console.log(`   ⚠️ Low confidence match (score: ${scoredMatches[0].score}), using AI fallback...`);
    } else {
      return bestMatch;
    }

    const prompt = `Given this career title: "${careerTitle}"

From this list of SOC (Standard Occupational Classification) careers, which ONE is the best match?

${allSOCs.slice(0, 300).map(s => `- ${s.title} [${s.soc_code}]`).join('\n')}

Return ONLY a JSON object:
{
  "socCode": "XX-XXXX.XX",
  "socTitle": "Official SOC title",
  "matchReason": "Brief explanation"
}

If no good match exists, return: {"socCode": null}

NOTE: Consider both exact title matches and careers that would involve similar work/skills.`;

    console.log('Using AI to find best SOC match...');
    const response = await sendMessage([], prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ Could not parse AI response');
      return null;
    }

    const aiMatch = JSON.parse(jsonMatch[0]);

    if (!aiMatch.socCode) {
      console.log('❌ AI found no matching SOC code');
      return null;
    }

    const socCareer = allSOCs.find(s => s.soc_code === aiMatch.socCode);

    if (socCareer) {
      console.log(`✅ AI matched to: ${socCareer.title} (${socCareer.soc_code})`);
      console.log(`   Reason: ${aiMatch.matchReason}`);
      return socCareer;
    }

    console.log('❌ AI returned SOC code not in database');
    return null;
  } catch (error) {
    console.error('Error finding SOC code:', error);
    return null;
  }
}

async function getRelatedCareersForSOC(socCode: string): Promise<SOCCareer[]> {
  console.log(`\n📊 Getting related careers for SOC: ${socCode}`);

  try {
    const { data: relatedData, error: relatedError } = await supabase
      .from('soc_related')
      .select('related_soc_code, relatedness_tier')
      .eq('soc_code', socCode)
      .order('relatedness_tier', { ascending: true })
      .limit(3);

    if (relatedError || !relatedData || relatedData.length === 0) {
      console.log('No related careers found');
      return [];
    }

    const relatedSOCCodes = relatedData.map(r => r.related_soc_code);
    console.log('Related SOC codes:', relatedSOCCodes);

    const { data: relatedBasics, error: basicsError } = await supabase
      .from('soc_basics')
      .select('soc_code, title, description')
      .in('soc_code', relatedSOCCodes);

    if (basicsError || !relatedBasics) {
      console.log('Error fetching related career details');
      return [];
    }

    console.log(`✅ Found ${relatedBasics.length} related careers`);
    return relatedBasics.map(career => ({
      ...career,
      isRelated: true,
    }));
  } catch (error) {
    console.error('Error getting related careers:', error);
    return [];
  }
}

async function compareConversationAndRIASECCareers(
  conversationCareers: ConversationCareer[],
  riasecCareers: SOCCareer[],
  riasecScore: RIASECScore
): Promise<'conversation' | 'riasec' | 'both'> {
  console.log('\n=== COMPARING CONVERSATION vs RIASEC CAREERS ===');

  if (conversationCareers.length === 0) {
    console.log('No conversation careers, using RIASEC only');
    return 'riasec';
  }

  try {
    const conversationList = conversationCareers
      .map(c => `- ${c.careerTitle} (confidence: ${c.confidence}, reason: ${c.reason})`)
      .join('\n');

    const riasecList = riasecCareers
      .slice(0, 4)
      .map(c => `- ${c.title}${c.isRelated ? ' (related)' : ' (top match)'}`)
      .join('\n');

    const avgConfidence = conversationCareers.reduce((sum, c) => sum + c.confidence, 0) / conversationCareers.length;
    const hasHighConfidence = conversationCareers.some(c => c.confidence >= 0.7);

    console.log(`Conversation careers avg confidence: ${avgConfidence.toFixed(2)}, has high confidence: ${hasHighConfidence}`);

    const prompt = `You are a career counselor. Compare two sources of career recommendations for a student:

STUDENT'S INTEREST-BASED CAREERS (from conversation):
${conversationList}

RIASEC ASSESSMENT CAREERS (from personality test):
${riasecList}

RIASEC Score (0-10 scale):
- Realistic (hands-on): ${riasecScore.realistic}
- Investigative (analytical): ${riasecScore.investigative}
- Artistic (creative): ${riasecScore.artistic}
- Social (helping): ${riasecScore.social}
- Enterprising (leading): ${riasecScore.enterprising}
- Conventional (organized): ${riasecScore.conventional}

Average conversation confidence: ${avgConfidence.toFixed(2)}

Determine which careers to show the student. Return a JSON object:
{
  "recommendation": "conversation" | "riasec" | "both",
  "reasoning": "Brief explanation of your decision"
}

Guidelines:
- If conversation careers are interest-based (confidence 0.6+) and align reasonably with RIASEC, prefer "both"
- If student showed STRONG passion (confidence 0.75+), heavily favor "conversation" or "both"
- Interest-based careers from conversation should be weighted MORE than RIASEC when confidence is high
- Only use "riasec" alone if conversation careers are very low confidence (<0.5) or completely misaligned
- Default to "both" when in doubt - combining interests and personality is best
- Consider that students expressing specific interests (like "I love fish") deserve to see those careers`;

    console.log('Asking AI to compare career sources...');
    const response = await sendMessage([], prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('Could not parse AI response, defaulting to both');
      return 'both';
    }

    const decision = JSON.parse(jsonMatch[0]);
    console.log(`\n✅ Decision: ${decision.recommendation}`);
    console.log(`   Reasoning: ${decision.reasoning}`);

    return decision.recommendation;
  } catch (error) {
    console.error('Error comparing careers:', error);
    return 'riasec';
  }
}

export async function enrichCareersWithConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  riasecCareers: SOCCareer[],
  riasecScore: RIASECScore
): Promise<CareerComparisonResult> {
  console.log('\n\n========================================');
  console.log('CAREER ENRICHMENT WITH CONVERSATION');
  console.log('========================================');

  const conversationCareers = await extractCareersFromConversation(conversationHistory);

  console.log(`\n📊 Extracted ${conversationCareers.length} careers from conversation`);
  if (conversationCareers.length > 0) {
    conversationCareers.forEach(c => {
      console.log(`  - ${c.careerTitle} (confidence: ${c.confidence.toFixed(2)}, reason: ${c.reason})`);
    });
  }

  if (conversationCareers.length === 0) {
    console.log('\n✅ No careers mentioned in conversation, using RIASEC results');
    return {
      careers: riasecCareers,
      source: 'riasec'
    };
  }

  const conversationSOCCareers: SOCCareer[] = [];

  console.log('\n🔍 Matching conversation careers to SOC codes...');
  for (const career of conversationCareers) {
    const socCareer = await findSOCCodeForCareer(career.careerTitle);
    if (socCareer) {
      console.log(`  ✅ Matched "${career.careerTitle}" to SOC: ${socCareer.title} (${socCareer.soc_code})`);
      conversationSOCCareers.push({
        ...socCareer,
        matchScore: Math.round(career.confidence * 100),
        isRelated: false,
      });

      const related = await getRelatedCareersForSOC(socCareer.soc_code);
      conversationSOCCareers.push(...related.slice(0, 2));
    } else {
      console.log(`  ❌ Could not find SOC match for "${career.careerTitle}"`);
    }
  }

  console.log(`\n📋 Total conversation-based SOC careers: ${conversationSOCCareers.length}`);

  if (conversationSOCCareers.length === 0) {
    console.log('\n⚠️ Could not match conversation careers to SOC codes, using RIASEC');
    return {
      careers: riasecCareers,
      source: 'riasec'
    };
  }

  const decision = await compareConversationAndRIASECCareers(
    conversationCareers,
    riasecCareers,
    riasecScore
  );

  console.log('\n=== FINAL CAREER RESULTS ===');

  let finalCareers: SOCCareer[];
  let source: 'conversation' | 'riasec' | 'both';

  if (decision === 'conversation') {
    finalCareers = conversationSOCCareers;
    source = 'conversation';
    console.log('Using CONVERSATION careers only');
  } else if (decision === 'riasec') {
    finalCareers = riasecCareers;
    source = 'riasec';
    console.log('Using RIASEC careers only');
  } else {
    const conversationMain = conversationSOCCareers.find(c => !c.isRelated);
    const riasecMain = riasecCareers.find(c => !c.isRelated);

    const uniqueSOCs = new Set<string>();
    finalCareers = [];

    if (conversationMain) {
      uniqueSOCs.add(conversationMain.soc_code);
      finalCareers.push(conversationMain);
    }

    if (riasecMain && !uniqueSOCs.has(riasecMain.soc_code)) {
      uniqueSOCs.add(riasecMain.soc_code);
      finalCareers.push(riasecMain);
    }

    const allRelated = [
      ...conversationSOCCareers.filter(c => c.isRelated),
      ...riasecCareers.filter(c => c.isRelated)
    ];

    for (const career of allRelated) {
      if (!uniqueSOCs.has(career.soc_code)) {
        uniqueSOCs.add(career.soc_code);
        finalCareers.push(career);
        if (finalCareers.length >= 6) break;
      }
    }

    source = 'both';
    console.log('Using BOTH conversation and RIASEC careers (merged)');
  }

  console.log(`\nReturning ${finalCareers.length} careers:`);
  finalCareers.forEach((c, i) => {
    console.log(`${i + 1}. ${c.title} (${c.soc_code})${c.isRelated ? ' [related]' : ' [main]'}`);
  });
  console.log('========================================\n\n');

  return {
    careers: finalCareers,
    source
  };
}
