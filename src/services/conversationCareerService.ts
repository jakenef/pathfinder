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

    const prompt = `Analyze this conversation between a career counselor and student. Identify any specific careers the student has expressed interest in or mentioned.

Conversation:
${conversationText}

If the student mentioned or expressed interest in specific careers, list them. Otherwise, return an empty array.

Return a JSON array:
[
  {
    "careerTitle": "Specific career title mentioned",
    "confidence": 0.0-1.0 (how confident you are this is a serious interest),
    "reason": "Brief explanation of why you identified this career"
  }
]

IMPORTANT:
- Only include careers the student specifically mentioned or clearly expressed interest in
- Do NOT infer careers just from general interests
- If no specific careers were mentioned, return []
- Use proper career titles (e.g., "Software Engineer" not "coding job")`;

    console.log('Sending conversation to OpenAI for career extraction...');
    const response = await sendMessage([], prompt);

    console.log('OpenAI response:', response.substring(0, 500));

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('No JSON found in response, no careers mentioned');
      return [];
    }

    const careers: ConversationCareer[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Found ${careers.length} career(s) mentioned:`, careers);

    return careers.filter(c => c.confidence >= 0.5);
  } catch (error) {
    console.error('Error extracting careers from conversation:', error);
    return [];
  }
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

    const lowerCareerTitle = careerTitle.toLowerCase();

    const exactMatch = allSOCs.find(soc =>
      soc.title.toLowerCase() === lowerCareerTitle
    );

    if (exactMatch) {
      console.log(`✅ Exact match found: ${exactMatch.title} (${exactMatch.soc_code})`);
      return exactMatch;
    }

    const partialMatch = allSOCs.find(soc =>
      soc.title.toLowerCase().includes(lowerCareerTitle) ||
      lowerCareerTitle.includes(soc.title.toLowerCase())
    );

    if (partialMatch) {
      console.log(`✅ Partial match found: ${partialMatch.title} (${partialMatch.soc_code})`);
      return partialMatch;
    }

    const prompt = `Given this career title: "${careerTitle}"

From this list of SOC (Standard Occupational Classification) careers, which ONE is the best match?

${allSOCs.slice(0, 200).map(s => `- ${s.title} [${s.soc_code}]`).join('\n')}

Return ONLY a JSON object:
{
  "socCode": "XX-XXXX.XX",
  "socTitle": "Official SOC title",
  "matchReason": "Brief explanation"
}

If no good match exists, return: {"socCode": null}`;

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

    const prompt = `You are a career counselor. Compare two sources of career recommendations for a student:

STUDENT'S MENTIONED CAREERS (from conversation):
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

Determine which careers to show the student. Return a JSON object:
{
  "recommendation": "conversation" | "riasec" | "both",
  "reasoning": "Brief explanation of your decision"
}

Guidelines:
- If conversation careers align well with RIASEC scores, return "both"
- If conversation careers conflict with RIASEC scores but student showed strong interest, return "conversation"
- If conversation careers are vague or RIASEC is clearly better, return "riasec"
- Consider student's confidence and specificity when they mentioned careers`;

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

  if (conversationCareers.length === 0) {
    console.log('\n✅ No careers mentioned in conversation, using RIASEC results');
    return {
      careers: riasecCareers,
      source: 'riasec'
    };
  }

  const conversationSOCCareers: SOCCareer[] = [];

  for (const career of conversationCareers) {
    const socCareer = await findSOCCodeForCareer(career.careerTitle);
    if (socCareer) {
      conversationSOCCareers.push({
        ...socCareer,
        matchScore: Math.round(career.confidence * 100),
        isRelated: false,
      });

      const related = await getRelatedCareersForSOC(socCareer.soc_code);
      conversationSOCCareers.push(...related.slice(0, 2));
    }
  }

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
