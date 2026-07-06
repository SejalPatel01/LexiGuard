"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPromptInjection = detectPromptInjection;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
/**
 * Detects prompt injection attempts by analyzing keyword lists, regex patterns, and risk scoring.
 */
function detectPromptInjection(prompt) {
    const matchedRules = [];
    let score = 0;
    let reason = null;
    const normalized = (0, utils_1.normalizePrompt)(prompt);
    const reconstructed = (0, utils_1.normalizePrompt)((0, utils_1.reconstructSpacedText)(prompt));
    // --- Layer 1: Keyword Matching ---
    for (const keyword of constants_1.PROMPT_INJECTION_KEYWORDS) {
        if (normalized.includes(keyword) || reconstructed.includes(keyword)) {
            const ruleName = `Keyword Match: "${keyword}"`;
            if (!matchedRules.includes(ruleName)) {
                matchedRules.push(ruleName);
                score += 0.4; // Base score per keyword
            }
        }
    }
    // --- Layer 2: Pattern Matching ---
    for (const regex of constants_1.PROMPT_INJECTION_PATTERNS) {
        if (regex.test(prompt) || regex.test(reconstructed)) {
            const ruleName = `Pattern Match: ${regex.toString()}`;
            if (!matchedRules.includes(ruleName)) {
                matchedRules.push(ruleName);
                score += 0.5; // Base score per pattern match
            }
        }
    }
    // Cap initial score
    let confidence = Math.min(score, 1.0);
    // If we matched multiple rules, increase threat level
    if (matchedRules.length > 1) {
        confidence = Math.min(confidence + 0.2, 1.0);
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
