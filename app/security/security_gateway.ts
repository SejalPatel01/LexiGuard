import { detectPromptInjection } from './prompt_injection_detector';
import { detectJailbreak } from './jailbreak_detector';
import { classifyThreat } from './threat_classifier';
import { logSecurityEvent } from './audit_logger';
import { SecurityResult } from './security_types';
import { classifyPromptAI } from './ai_classifier';

/**
 * Enterprise Hybrid AI Security Gateway (Stage 1 Rules + Stage 2 AI Classifier)
 * Coordinates rule detectors and lightweight LLM classification, logs audits, and makes block decisions.
 */
export async function checkPromptSecurity(prompt: string): Promise<SecurityResult> {
  console.log(`[SECURITY GATEWAY] Evaluating prompt of length ${prompt?.length || 0} characters...`);
  
  // --- STAGE 1: Fast Rule & Pattern Scanner ---
  const injectionResult = detectPromptInjection(prompt);
  const jailbreakResult = detectJailbreak(prompt);
  const s1Classification = classifyThreat(injectionResult, jailbreakResult);

  const stage1Details = {
    isBlocked: s1Classification.isBlocked,
    threatType: s1Classification.threatType,
    severity: s1Classification.severity,
    confidence: s1Classification.confidence,
    matchedRules: s1Classification.matchedRules,
    reason: s1Classification.reason
  };

  // If Stage 1 blocks, immediately return and log without calling Stage 2 AI Classifier (saving API latency & cost)
  if (s1Classification.isBlocked) {
    const result: SecurityResult = {
      ...s1Classification,
      stage1: stage1Details
    };
    logSecurityEvent(prompt, result);
    return result;
  }

  // --- STAGE 2: Lightweight AI Security Classifier ---
  const s2Result = await classifyPromptAI(prompt);

  const stage2Details = {
    isBlocked: !s2Result.safe,
    threatType: s2Result.category !== 'None' ? (s2Result.category as SecurityResult['threatType']) : null,
    severity: !s2Result.safe ? ('HIGH' as const) : ('SAFE' as const),
    confidence: s2Result.confidence / 100, // normalize 0-100 to 0-1
    reason: s2Result.reason
  };

  if (!s2Result.safe) {
    const combinedRules = [...s1Classification.matchedRules, `Stage 2 AI Classifier: ${s2Result.category}`];
    const result: SecurityResult = {
      isBlocked: true,
      threatType: stage2Details.threatType || 'Prompt Injection',
      severity: 'HIGH', // Stage 2 blocks are high severity
      reason: s2Result.reason,
      confidence: stage2Details.confidence,
      matchedRules: combinedRules,
      stage1: stage1Details,
      stage2: stage2Details
    };
    logSecurityEvent(prompt, result);
    return result;
  }

  // Both Stage 1 and Stage 2 marked SAFE
  const result: SecurityResult = {
    isBlocked: false,
    threatType: null,
    severity: 'SAFE',
    reason: null,
    confidence: 0,
    matchedRules: s1Classification.matchedRules,
    stage1: stage1Details,
    stage2: stage2Details
  };
  
  logSecurityEvent(prompt, result);
  return result;
}
