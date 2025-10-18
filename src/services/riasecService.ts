import type { RIASECScore, UserProfile } from "../types";

/**
 * RIASEC Model:
 * - Realistic: Prefers physical activities, tools, machines, working with hands
 * - Investigative: Prefers thinking, analyzing, researching, solving problems
 * - Artistic: Prefers creative, expressive, innovative activities
 * - Social: Prefers helping, teaching, caring for others
 * - Enterprising: Prefers leading, persuading, managing, selling
 * - Conventional: Prefers organizing, following procedures, working with data/details
 */

// Keywords associated with each RIASEC dimension
const RIASEC_KEYWORDS = {
  realistic: [
    "build",
    "machine",
    "tool",
    "hands-on",
    "physical",
    "mechanical",
    "technical",
    "fix",
    "construct",
    "engineer",
    "outdoor",
    "athletic",
    "practical",
    "craft",
    "equipment",
    "repair",
    "operate",
    "assemble",
    "vehicle",
    "carpentry",
  ],
  investigative: [
    "research",
    "analyze",
    "science",
    "study",
    "investigate",
    "experiment",
    "problem-solving",
    "data",
    "theory",
    "intellectual",
    "math",
    "biology",
    "chemistry",
    "physics",
    "discover",
    "question",
    "observe",
    "logic",
    "systematic",
    "hypothesis",
    "laboratory",
    "medical",
    "technology",
  ],
  artistic: [
    "creative",
    "art",
    "design",
    "music",
    "write",
    "express",
    "imagine",
    "aesthetic",
    "original",
    "innovative",
    "paint",
    "draw",
    "perform",
    "drama",
    "fashion",
    "photography",
    "literature",
    "poetry",
    "visual",
    "film",
    "media",
    "graphics",
    "interior",
    "architecture",
  ],
  social: [
    "help",
    "teach",
    "counsel",
    "care",
    "support",
    "people",
    "communicate",
    "nurture",
    "guide",
    "mentor",
    "therapy",
    "social",
    "community",
    "empathy",
    "collaborate",
    "teamwork",
    "educate",
    "train",
    "advise",
    "healthcare",
    "nursing",
    "psychology",
    "human",
    "interact",
  ],
  enterprising: [
    "lead",
    "manage",
    "persuade",
    "sell",
    "business",
    "entrepreneur",
    "influence",
    "negotiate",
    "organize",
    "direct",
    "promote",
    "market",
    "convince",
    "competition",
    "strategy",
    "profit",
    "executive",
    "sales",
    "leadership",
    "venture",
    "startup",
    "management",
    "project",
  ],
  conventional: [
    "organize",
    "detail",
    "procedure",
    "systematic",
    "record",
    "file",
    "schedule",
    "coordinate",
    "accurate",
    "efficient",
    "office",
    "clerical",
    "administration",
    "database",
    "accounting",
    "finance",
    "budget",
    "spreadsheet",
    "structured",
    "routine",
    "planning",
    "documentation",
  ],
};

/**
 * Calculate RIASEC score based on user profile responses
 */
export function calculateRIASECScore(userProfile: UserProfile): RIASECScore {
  const score: RIASECScore = {
    realistic: 0,
    investigative: 0,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 0,
  };

  // Combine all responses into one text for analysis
  const allResponses = Object.values(userProfile.responses)
    .join(" ")
    .toLowerCase();

  // Also include interests, strengths, values, and workStyle
  const allProfileData = [
    ...userProfile.interests,
    ...userProfile.strengths,
    ...userProfile.values,
    ...userProfile.workStyle,
  ]
    .join(" ")
    .toLowerCase();

  const combinedText = allResponses + " " + allProfileData;

  // Score each RIASEC dimension based on keyword matches
  for (const [dimension, keywords] of Object.entries(RIASEC_KEYWORDS)) {
    keywords.forEach((keyword) => {
      // Count occurrences of each keyword
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, "gi");
      const matches = combinedText.match(regex);
      if (matches) {
        score[dimension as keyof RIASECScore] += matches.length;
      }
    });
  }

  // Normalize scores to 0-7 scale (to match SOC database)
  // First, get the max score to normalize
  const maxScore = Math.max(...Object.values(score));
  if (maxScore > 0) {
    for (const key of Object.keys(score) as Array<keyof RIASECScore>) {
      // Normalize to 0-7 scale
      score[key] = parseFloat(((score[key] / maxScore) * 7).toFixed(2));
    }
  }

  return score;
}

/**
 * Get top RIASEC codes (e.g., "SAI" for Social-Artistic-Investigative)
 */
export function getTopRIASECCodes(
  score: RIASECScore,
  count: number = 3
): string {
  const entries = Object.entries(score) as Array<[keyof RIASECScore, number]>;
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  return sorted
    .slice(0, count)
    .map(([key]) => key.charAt(0).toUpperCase())
    .join("");
}

/**
 * Get human-readable description of RIASEC profile
 */
export function getRIASECDescription(score: RIASECScore): string {
  const topCode = getTopRIASECCodes(score, 3);
  const descriptions: Record<string, string> = {
    R: "Realistic (hands-on, practical)",
    I: "Investigative (analytical, problem-solver)",
    A: "Artistic (creative, expressive)",
    S: "Social (helping, teaching)",
    E: "Enterprising (leading, persuading)",
    C: "Conventional (organized, detail-oriented)",
  };

  const topDimensions = topCode.split("").map((code) => descriptions[code]);
  return `Your top interests are: ${topDimensions.join(", ")}`;
}

/**
 * Generate random RIASEC scores for demo purposes
 * Scores are on 0-7 scale to match SOC database
 */
export function generateDemoRIASECScore(): RIASECScore {
  // Create a few predefined interesting profiles
  const profiles: RIASECScore[] = [
    // Creative Investigator (Artist/Scientist)
    { realistic: 2.5, investigative: 6.8, artistic: 6.5, social: 4.2, enterprising: 3.1, conventional: 2.8 },
    // Social Leader (Teacher/Manager)
    { realistic: 1.8, investigative: 4.5, artistic: 3.9, social: 6.9, enterprising: 6.2, conventional: 4.1 },
    // Tech Builder (Engineer)
    { realistic: 6.7, investigative: 6.4, artistic: 2.9, social: 3.2, enterprising: 4.5, conventional: 5.1 },
    // Creative Entrepreneur
    { realistic: 3.1, investigative: 4.2, artistic: 6.8, social: 5.3, enterprising: 6.5, conventional: 3.7 },
    // Healthcare Professional
    { realistic: 4.3, investigative: 5.9, artistic: 2.8, social: 6.7, enterprising: 3.9, conventional: 4.8 },
  ];

  // Pick a random profile
  const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];

  return randomProfile;
}
