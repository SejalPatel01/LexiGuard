import { DetectorResult } from './security_types';
import { PROMPT_INJECTION_KEYWORDS, PROMPT_INJECTION_PATTERNS } from './constants';
import { normalizePrompt, reconstructSpacedText } from './utils';

/**
 * Detects prompt injection attempts by analyzing keyword lists, regex patterns, and risk scoring.
 */
export function detectPromptInjection(prompt: string): DetectorResult {
  const matchedRules: string[] = [];
  let score = 0;
  let reason: string | null = null;

  const normalized = normalizePrompt(prompt);
  const reconstructed = normalizePrompt(reconstructSpacedText(prompt));

  // --- Layer 1: Keyword Matching ---
  for (const keyword of PROMPT_INJECTION_KEYWORDS) {
    if (normalized.includes(keyword) || reconstructed.includes(keyword)) {
      const ruleName = `Keyword Match: "${keyword}"`;
      if (!matchedRules.includes(ruleName)) {
        matchedRules.push(ruleName);
        score += 0.4; // Base score per keyword
      }
    }
  }

  // --- Layer 2: Pattern Matching ---
  for (const regex of PROMPT_INJECTION_PATTERNS) {
    if (regex.test(prompt) || regex.test(reconstructed)) {
      const ruleName = `Pattern Match: ${regex.toString()}`;
      if (!matchedRules.includes(ruleName)) {
        matchedRules.push(ruleName);
        score += 0.5; // Base score per pattern match
      }
    }
  }

  // --- Layer 3: Semantic Heuristics (Combination matching for indirect injection attempts) ---
  const lowerPrompt = prompt.toLowerCase();
  
  // Extraction verbs
  const hasExtractionVerb = /(?:print|reveal|show|output|write|give|leak|dump|display|tell|describe|explain|list)\b/.test(lowerPrompt);
  
  // System instructions nouns
  const hasSystemSubject = /(?:system prompt|instructions|directives|rules|guidelines|parameters|confidential|internal reasoning|configuration|prompt setup)\b/.test(lowerPrompt);
  
  // Prior context references
  const hasPriorContext = /(?:before|prior|started|began|conversation|preceding|initial|originally)\b/.test(lowerPrompt);

  if (hasExtractionVerb && hasSystemSubject) {
    const ruleName = 'Semantic Heuristic: Extraction Verb + System Instruction Subject';
    if (!matchedRules.includes(ruleName)) {
      matchedRules.push(ruleName);
      score += 0.45;
    }
  }

  if (hasSystemSubject && hasPriorContext) {
    const ruleName = 'Semantic Heuristic: System Instruction Subject + Prior Context';
    if (!matchedRules.includes(ruleName)) {
      matchedRules.push(ruleName);
      score += 0.45;
    }
  }

  if (hasExtractionVerb && hasPriorContext) {
    const ruleName = 'Semantic Heuristic: Extraction Verb + Prior Context';
    if (!matchedRules.includes(ruleName)) {
      matchedRules.push(ruleName);
      score += 0.35;
    }
  }

  // Cap initial score
  let confidence = Math.min(score, 1.0);

  // If we matched multiple rules, increase threat level
  if (matchedRules.length > 1) {
    confidence = Math.min(confidence + 0.25, 1.0);
  }

  const detected = confidence >= 0.5;

  if (detected) {
    reason = `Prompt contained ${matchedRules.length} prompt injection indicators, matching instructions like "ignore previous instructions" or "reveal system prompt".`;
  }

  return {
    detected,
    confidence,
    matchedRules,
    reason
  };
}
