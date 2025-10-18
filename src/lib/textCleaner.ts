/**
 * Cleans AI-generated text for TTS by removing markdown, asterisks, and other non-human-readable formatting.
 */
export function cleanTextForTTS(text: string): string {
  // Remove markdown bold/italic/underline
  let cleaned = text.replace(/[*_~`]+/g, "");
  // Remove inline code
  cleaned = cleaned.replace(/`([^`]*)`/g, "$1");
  // Remove numbered/bulleted lists
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "");
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  // Remove stray brackets
  cleaned = cleaned.replace(/[\[\]]/g, "");
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  // Remove remaining markdown links
  cleaned = cleaned.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
  // Remove emojis and non-ASCII
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F6FF}]/gu, "");
  return cleaned.trim();
}
