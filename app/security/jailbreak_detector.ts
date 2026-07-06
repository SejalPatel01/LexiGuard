import { DetectorResult } from './security_types';
import { JAILBREAK_KEYWORDS, JAILBREAK_PATTERNS, OBFUSCATION_PATTERNS } from './constants';
import { normalizePrompt, detectExcessiveSpacing, reconstructSpacedText } from './utils';

/**
 * Detects jailbreak attempts by analyzing keyword lists, regex patterns, casing, and unicode spacing obfuscations.
 */
export function detectJailbreak(prompt: string): DetectorResult {
  const matchedRules: string[] = [];
  let score = 0;
  let reason: string | null = null;

  const normalized = normalizePrompt(prompt);
  const reconstructed = normalizePrompt(reconstructSpacedText(prompt));

  // --- Layer 1: Keyword Matching ---
  for (const keyword of JAILBREAK_KEYWORDS) {
    if (normalized.includes(keyword) || reconstructed.includes(keyword)) {
      const ruleName = `Jailbreak Keyword Match: "${keyword}"`;
      if (!matchedRules.includes(ruleName)) {
        matchedRules.push(ruleName);
        score += 0.45;
      }
    }
  }

  // --- Layer 2: Pattern Matching ---
  for (const regex of JAILBREAK_PATTERNS) {
    if (regex.test(prompt) || regex.test(reconstructed)) {
      const ruleName = `Jailbreak Pattern Match: ${regex.toString()}`;
      if (!matchedRules.includes(ruleName)) {
        matchedRules.push(ruleName);
        score += 0.55;
      }
    }
  }

  // --- Layer 3: Obfuscation Checks ---
  if (detectExcessiveSpacing(prompt)) {
    matchedRules.push('Obfuscation: Excessive spacing detected');
    score += 0.3;
  }

  for (const regex of OBFUSCATION_PATTERNS) {
    if (regex.test(prompt)) {
      const ruleName = `Obfuscation Pattern Match: ${regex.toString()}`;
      if (!matchedRules.includes(ruleName)) {
        matchedRules.push(ruleName);
        score += 0.35;
      }
    }
  }

  // Mixed-casing bypass heuristic (e.g. "aCt WiThOuT rEsTrIcTiOnS")
  const words = prompt.split(/\s+/);
  let mixedCaseCount = 0;
  for (const word of words) {
    if (word.length >= 6) {
      const upperCount = (word.match(/[A-Z]/g) || []).length;
      const lowerCount = (word.match(/[a-z]/g) || []).length;
      // If a word has roughly equal uppercase and lowercase letters, flag it
      if (upperCount > 1 && lowerCount > 1 && Math.abs(upperCount - lowerCount) <= 2) {
        mixedCaseCount++;
      }
    }
  }

  if (mixedCaseCount >= 2) {
    matchedRules.push('Obfuscation: Anomalous mixed casing detected');
    score += 0.25;
  }

  // Cap confidence score
  let confidence = Math.min(score, 1.0);
  if (matchedRules.length > 1) {
    confidence = Math.min(confidence + 0.15, 1.0);
  }

  const detected = confidence >= 0.5;

  if (detected) {
    reason = `Prompt contained jailbreak indicators such as pretending to be an unrestricted persona (e.g., "DAN") or attempting bypass obfuscation.`;
  }

  return {
    detected,
    confidence,
    matchedRules,
    reason
  };
}
