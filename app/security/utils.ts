/**
 * Clean and normalize prompt text to simplify matching across casing and spacing variations.
 */
export function normalizePrompt(text: string): string {
  if (!text) return '';
  
  // 1. Lowercase
  let normalized = text.toLowerCase();
  
  // 2. Remove zero-width unicode characters commonly used for bypasses
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // 3. Normalize multiple whitespace characters to single spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // 4. Remove punctuation that might be used to split keyword sequences (e.g. "ignore-previous-instructions")
  normalized = normalized.replace(/[-_.,\/#!$%\^&\*;:{}=\_`~()?]/g, ' ');
  
  // 5. De-duplicate spaces again after punctuation replacement
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized.trim();
}

/**
 * Check if the text contains excessive spaced-out characters (e.g. "i g n o r e  e v e r y t h i n g").
 */
export function detectExcessiveSpacing(text: string): boolean {
  // Matches 4 or more isolated letters separated by spaces
  const spacedPattern = /(?:\b[a-z]\s+){3,}\b[a-z]/i;
  return spacedPattern.test(text);
}

/**
 * Reconstructs a spaced out string (e.g., "i g n o r e" -> "ignore")
 */
export function reconstructSpacedText(text: string): string {
  // If there are large groups of single characters separated by spaces, join them
  return text.replace(/\b([a-z])\s+(?=[a-z]\b)/ig, '$1');
}
