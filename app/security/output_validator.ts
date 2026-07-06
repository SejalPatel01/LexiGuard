import { logSecurityEvent } from './audit_logger';

// Standard fallback message when output validation fails
export const SAFE_FALLBACK_MESSAGE = 
  "An output safety check has blocked a potential security policy violation. The response has been redacted for your privacy and safety.";

export interface OutputValidatorResult {
  text: string;
  isValid: boolean;
  flaggedIssues: string[];
}

export interface MaskedOrchestratorResult {
  category: string;
  isDocumentAnalysisRun: boolean;
  classification: {
    category: string;
    confidence: number;
    reasoning: string;
    isDocumentAnalysisRequired: boolean;
  };
  analysis?: {
    summary: string;
    clauses: Array<{ title: string; explanation: string; riskLevel: string }>;
    obligations: string[];
    deadlines: Array<{ date: string; action: string }>;
    risks: string[];
  };
  advice: {
    rights: string[];
    actions: string[];
    notes: string[];
    text: string;
  };
  actions: {
    checklist: string[];
    timeline: Array<{ day: string; action: string; description: string }>;
    summary: string;
    legalProvisions: string[];
    nextAction: string;
    documents: Array<{ title: string; type: string; previewText: string }>;
    score: number;
    riskLevel: string;
    riskFactors: string[];
  };
}

export interface MaskedFileAnalysisResponse {
  text: string;
  analysis: {
    summary: string;
    clauses: Array<{ title: string; explanation: string; riskLevel: string }>;
    obligations: string[];
    deadlines: Array<{ date: string; action: string }>;
    risks: string[];
    detectedDocType?: string;
  };
  detectedEvidence: string[];
}

/**
 * Validates AI responses for security leaks (prompt leaks, env vars, paths, script injections, raw JSON)
 * and masks PII data (Aadhaar, PAN, Passport, Bank Account, IFSC, Cards, Phone, Email).
 */
export function validateAndMaskOutput(text: string): OutputValidatorResult {
  const flaggedIssues: string[] = [];
  let isValid = true;
  let processedText = text;

  if (!text) {
    return { text: '', isValid: true, flaggedIssues: [] };
  }

  // --- 1. Output Validation (Safety Leaks) ---
  const lowerText = text.toLowerCase();

  // 1.1 Developer/System Prompt Leakage Heuristics
  const promptLeakKeywords = [
    'you are an ai',
    'your system prompt',
    'ignore previous instructions',
    'internal instructions',
    'strictly follow',
    'your core instructions',
    'dan mode',
    'developer instructions',
    'system guidelines'
  ];
  for (const kw of promptLeakKeywords) {
    if (lowerText.includes(kw)) {
      flaggedIssues.push(`Prompt Leakage Keyword Match: "${kw}"`);
      isValid = false;
    }
  }

  // 1.2 Environment Variables & API Keys
  if (text.includes('GEMINI_API_KEY') || text.includes('process.env.')) {
    flaggedIssues.push('Environment Variable Leakage (GEMINI_API_KEY)');
    isValid = false;
  }
  // Gemini API Key pattern: AIzaSy... (40 chars usually)
  const geminiKeyRegex = /AIzaSy[a-zA-Z0-9-_]{33}/;
  if (geminiKeyRegex.test(text)) {
    flaggedIssues.push('API Key Leakage (AIzaSy...)');
    isValid = false;
  }

  // 1.3 Local File Paths Leakage
  const pathRegex = /(?:[c-zC-Z]:\\Users\\[a-zA-Z0-9_-]+|\/Users\/[a-zA-Z0-9_-]+|\/home\/[a-zA-Z0-9_-]+|temp_uploads\\[a-zA-Z0-9-]+)/i;
  if (pathRegex.test(text)) {
    flaggedIssues.push('Local File Path Leakage');
    isValid = false;
  }

  // 1.4 Stack Traces / Internal Errors
  if (
    text.includes('at Object.') ||
    text.includes('at Module.') ||
    text.includes('at wrapModuleLoad') ||
    text.includes('at processTicksAndRejections')
  ) {
    flaggedIssues.push('Stack Trace Disclosure');
    isValid = false;
  }

  // 1.5 Raw JSON Accidentally Returned
  // If the entire response parses as a JSON object, it's likely an agent raw output leak
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      flaggedIssues.push('Raw JSON Object Leaked');
      isValid = false;
    } catch {
      // Not valid JSON, ignore
    }
  }

  // 1.6 Script / HTML / JS Injection Attacks
  const htmlInjectionRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|onload=|onerror=/i;
  if (htmlInjectionRegex.test(text)) {
    flaggedIssues.push('HTML/JavaScript Injection Attempt');
    isValid = false;
  }

  // If output validation failed, override with fallback and log security event
  if (!isValid) {
    logSecurityEvent('AI Output safety breach', {
      isBlocked: true,
      threatType: 'Unknown Suspicious Input', // maps to generic category
      severity: 'HIGH',
      reason: `Output validation failed due to: ${flaggedIssues.join(', ')}`,
      confidence: 1.0,
      matchedRules: flaggedIssues,
      stage1: {
        isBlocked: true,
        threatType: 'Output Validation Failed',
        severity: 'HIGH',
        confidence: 1.0,
        matchedRules: flaggedIssues,
        reason: `Output validation failed due to: ${flaggedIssues.join(', ')}`
      }
    });
    return {
      text: SAFE_FALLBACK_MESSAGE,
      isValid: false,
      flaggedIssues
    };
  }

  // --- 2. PII Detection & Masking ---
  // 2.1 Email Addresses: u***@domain.com
  processedText = processedText.replace(
    /\b([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    '$1***@$2'
  );

  // 2.2 Phone Numbers (Indian standard 10 digit or +91 prefixes)
  // Mask to ******3210
  processedText = processedText.replace(
    /\b(?:\+91[-\s]?)?([6-9]\d{5})(\d{4})\b/g,
    '******$2'
  );

  // 2.3 Credit/Debit Card: 16 digits
  // Mask to ************3456
  processedText = processedText.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?(\d{4})\b/g,
    '************$1'
  );

  // 2.4 Aadhaar Number: 12 digits (e.g. 1234 5678 9012 or 123456789012)
  // Mask to ********9012
  processedText = processedText.replace(
    /\b\d{4}\s?\d{4}\s?(\d{4})\b/g,
    '********$1'
  );

  // 2.5 PAN Number: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
  // Mask to ******34F
  processedText = processedText.replace(
    /\b[A-Z]{5}\d{2}(\d{2}[A-Z])\b/g,
    '******$1'
  );

  // 2.6 Passport Number: 1 letter, 7 digits (e.g. Z1234567)
  // Mask to ****4567
  processedText = processedText.replace(
    /\b[A-Z]\d{3}(\d{4})\b/g,
    '****$1'
  );

  // 2.7 Bank Account Number (standard 9 to 18 digits)
  // Mask to ******5678
  processedText = processedText.replace(
    /\b\d{5,14}(\d{4})\b/g,
    '******$1'
  );

  // 2.8 IFSC Code (e.g. SBIN0001234)
  // Mask to SBIN******
  processedText = processedText.replace(
    /\b([A-Z]{4}0)[A-Z0-9]{6}\b/g,
    '$1******'
  );

  return {
    text: processedText,
    isValid: true,
    flaggedIssues: []
  };
}

/**
 * Iterates through all displayed fields of OrchestratorResult and applies output validation and masking.
 */
export function maskOrchestratorResult(result: MaskedOrchestratorResult): MaskedOrchestratorResult {
  if (!result) return result;
  
  // Clone to avoid side effects
  const cloned = JSON.parse(JSON.stringify(result)) as MaskedOrchestratorResult;
  
  if (cloned.advice) {
    if (cloned.advice.text) {
      const v = validateAndMaskOutput(cloned.advice.text);
      cloned.advice.text = v.text;
    }
    if (cloned.advice.rights) {
      cloned.advice.rights = cloned.advice.rights.map((r: string) => validateAndMaskOutput(r).text);
    }
    if (cloned.advice.actions) {
      cloned.advice.actions = cloned.advice.actions.map((a: string) => validateAndMaskOutput(a).text);
    }
    if (cloned.advice.notes) {
      cloned.advice.notes = cloned.advice.notes.map((n: string) => validateAndMaskOutput(n).text);
    }
  }
  
  if (cloned.actions) {
    if (cloned.actions.summary) {
      cloned.actions.summary = validateAndMaskOutput(cloned.actions.summary).text;
    }
    if (cloned.actions.nextAction) {
      cloned.actions.nextAction = validateAndMaskOutput(cloned.actions.nextAction).text;
    }
    if (cloned.actions.checklist) {
      cloned.actions.checklist = cloned.actions.checklist.map((c: string) => validateAndMaskOutput(c).text);
    }
    if (cloned.actions.riskFactors) {
      cloned.actions.riskFactors = cloned.actions.riskFactors.map((r: string) => validateAndMaskOutput(r).text);
    }
    if (cloned.actions.timeline) {
      cloned.actions.timeline = cloned.actions.timeline.map((item: { day: string; action: string; description: string }) => ({
        ...item,
        title: item.action ? validateAndMaskOutput(item.action).text : item.action,
        description: item.description ? validateAndMaskOutput(item.description).text : item.description
      }));
    }
    if (cloned.actions.documents) {
      cloned.actions.documents = cloned.actions.documents.map((doc: { title: string; type: string; previewText: string }) => ({
        ...doc,
        title: doc.title ? validateAndMaskOutput(doc.title).text : doc.title,
        previewText: doc.previewText ? validateAndMaskOutput(doc.previewText).text : doc.previewText
      }));
    }
  }

  return cloned;
}

/**
 * Iterates through all displayed fields of FileAnalysisResponse and applies output validation and masking.
 */
export function maskFileAnalysisResponse(result: MaskedFileAnalysisResponse): MaskedFileAnalysisResponse {
  if (!result) return result;
  
  // Clone to avoid side effects
  const cloned = JSON.parse(JSON.stringify(result)) as MaskedFileAnalysisResponse;
  
  if (cloned.text) {
    cloned.text = validateAndMaskOutput(cloned.text).text;
  }
  
  if (cloned.analysis) {
    if (cloned.analysis.summary) {
      cloned.analysis.summary = validateAndMaskOutput(cloned.analysis.summary).text;
    }
    if (cloned.analysis.obligations) {
      cloned.analysis.obligations = cloned.analysis.obligations.map((o: string) => validateAndMaskOutput(o).text);
    }
    if (cloned.analysis.risks) {
      cloned.analysis.risks = cloned.analysis.risks.map((r: string) => validateAndMaskOutput(r).text);
    }
    if (cloned.analysis.clauses) {
      cloned.analysis.clauses = cloned.analysis.clauses.map((clause: { title: string; explanation: string; riskLevel: string }) => ({
        ...clause,
        title: clause.title ? validateAndMaskOutput(clause.title).text : clause.title,
        explanation: clause.explanation ? validateAndMaskOutput(clause.explanation).text : clause.explanation
      }));
    }
    if (cloned.analysis.deadlines) {
      cloned.analysis.deadlines = cloned.analysis.deadlines.map((d: { date: string; action: string }) => ({
        ...d,
        action: d.action ? validateAndMaskOutput(d.action).text : d.action
      }));
    }
  }
  
  return cloned;
}
