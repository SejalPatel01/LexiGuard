'use server';

import { runOrchestrationPipeline } from '@/services/orchestrator';
import { OrchestratorResult, DocumentAnalyzerResponse } from '@/types/agents';
import { extractTextFromPdf, extractTextFromImage } from '@/services/pdf-parser';
import { analyzeDocument } from '@/services/document-analysis';
import { generateDocument } from '@/services/document-generator';
import { generateWithGemini } from '@/lib/gemini';
import { detectLanguageLocal } from '@/lib/language-detector';
import { checkPromptSecurity } from '../security/security_gateway';
import { validateAndSaveTempFile, cleanupTempFile, SecureFileResult } from '../security/file_handler';
import { checkAbuseLimits } from '../security/abuse_protection';
import { maskOrchestratorResult, maskFileAnalysisResponse } from '../security/output_validator';
import { headers } from 'next/headers';

interface AssessmentError {
  error: string;
}

/**
 * Helper to strip out undefined values from an object and replace them with null.
 * This is crucial for Next.js Server Actions, which fail to serialize undefined properties
 * when sending data to Client Components (throwing generic Flight/unexpected response errors).
 */
const sanitizeResult = (val: unknown): unknown => {
  return JSON.parse(
    JSON.stringify(val, (key, value) => {
      return value === undefined ? null : value;
    })
  );
};

/**
 * Maps raw system errors or API errors to friendly user-facing messages.
 */
function getFriendlyErrorMessage(error: Error): string {
  const msg = (error.message || '').toLowerCase();
  
  // Preserve expected user validation messages
  const preservedMessages = [
    'this file type is not supported',
    'maximum upload size is 20 mb',
    'upload failed: dangerous filename detected',
    'too many rapid requests',
    'spam behavior detected'
  ];
  for (const preserved of preservedMessages) {
    if (msg.includes(preserved)) {
      return error.message;
    }
  }

  if (msg.includes('quota') || msg.includes('exhausted') || msg.includes('429') || msg.includes('limit')) {
    return 'AI service is temporarily busy. Please try again shortly.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect') || msg.includes('eai_again') || msg.includes('enotfound') || msg.includes('timeout')) {
    return 'Unable to reach the AI service. Check your internet connection.';
  }
  if (msg.includes('parse') || msg.includes('pdf') || msg.includes('ocr') || msg.includes('image') || msg.includes('understand') || msg.includes('corrupt')) {
    return "We couldn't understand this document. Please upload a clearer file.";
  }
  
  return 'Something went wrong. Please try again.';
}

/**
 * Next.js Server Action wrapper for executing the multi-agent legal pipeline.
 * Keeps API credentials secure on the server.
 */
export interface SecurityBlockResult {
  isBlocked: true;
  threatType: 'Prompt Injection' | 'Jailbreak' | 'Unknown Suspicious Input';
  severity: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  detectedLanguage: 'en' | 'hi' | 'gu';
}

export async function runLegalAssessment(
  userQuery: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: 'en' | 'hi' | 'gu' = 'en',
  uploadedDocs?: Array<{ name: string; type: string; text: string; analysis?: DocumentAnalyzerResponse }>
): Promise<(OrchestratorResult & { detectedLanguage: 'en' | 'hi' | 'gu' }) | SecurityBlockResult | AssessmentError> {
  const startTime = Date.now();
  console.log(`\n--- [SERVER ACTION] runLegalAssessment Start ---`);
  console.log(`[SERVER ACTION] Query length: ${userQuery.length} chars`);
  console.log(`[SERVER ACTION] History length: ${chatHistory.length} messages`);
  console.log('[app/actions/orchestrate] runLegalAssessment Server Action invoked. Preferred language preference:', language);
  console.log(`[runLegalAssessment] uploadedDocs received: length=${uploadedDocs?.length || 0}, contents=${JSON.stringify(uploadedDocs?.map(d => ({ name: d.name, hasAnalysis: !!d.analysis }))) || 'undefined'}`);
  
  const detectedLanguage = detectLanguageLocal(userQuery);
  console.log('[app/actions/orchestrate] runLegalAssessment detected prompt language:', detectedLanguage);

  // A. Abuse Protection Check
  let clientId = 'local-client';
  try {
    const headersList = await headers();
    clientId = headersList.get('x-forwarded-for') || headersList.get('user-agent') || 'local-client';
  } catch {
    // safe fallback
  }

  const abuseCheck = checkAbuseLimits(clientId, userQuery);
  if (abuseCheck.isRateLimited) {
    console.warn(`[SERVER ACTION] Request blocked by Abuse Protection: ${abuseCheck.reason}`);
    return {
      isBlocked: true,
      threatType: 'Unknown Suspicious Input',
      severity: 'MEDIUM',
      reason: abuseCheck.reason || 'Rate limit exceeded.',
      detectedLanguage
    };
  }

  // 1. Centralized Security Gateway Check
  const securityCheck = await checkPromptSecurity(userQuery);
  if (securityCheck.isBlocked) {
    console.warn(`[SERVER ACTION] Prompt blocked by Security Gateway!`);
    const duration = Date.now() - startTime;
    console.log(`[SERVER ACTION] Blocked assessment completed in ${duration}ms.`);
    console.log(`--- [SERVER ACTION] runLegalAssessment End (BLOCKED) ---\n`);
    return {
      isBlocked: true,
      threatType: securityCheck.threatType || 'Unknown Suspicious Input',
      severity: securityCheck.severity,
      reason: securityCheck.reason || 'Blocked due to policy violation.',
      detectedLanguage
    };
  }
  
  const apiKeyExists = !!process.env.GEMINI_API_KEY;
  console.log(`[SERVER ACTION] GEMINI_API_KEY environment variable detected: ${apiKeyExists}`);

  try {
    if (!userQuery || !userQuery.trim()) {
      console.log(`[SERVER ACTION] Validation failed: Empty query.`);
      return { error: 'Query content is empty' };
    }

    // Run the agent pipeline with the detected language
    const rawResult = await runOrchestrationPipeline(userQuery, chatHistory, detectedLanguage, uploadedDocs);
    console.log(`[SERVER ACTION] Agent pipeline finished successfully. Sanitizing output...`);

    // Validate output & mask PII in AI response
    const masked = maskOrchestratorResult(rawResult);

    // Clean undefined fields (Flight serializing preparation)
    const sanitized = sanitizeResult({
      ...masked,
      detectedLanguage
    }) as (OrchestratorResult & { detectedLanguage: 'en' | 'hi' | 'gu' });
    
    const duration = Date.now() - startTime;
    console.log(`[SERVER ACTION] Assessment completed successfully in ${duration}ms.`);
    console.log(`--- [SERVER ACTION] runLegalAssessment End ---\n`);
    
    return sanitized;
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`\n[SERVER ACTION ERROR] runLegalAssessment failed:`, err.stack || err.message || err);
    console.log(`--- [SERVER ACTION] runLegalAssessment End (With Errors) ---\n`);
    
    return {
      error: getFriendlyErrorMessage(err)
    };
  }
}

export interface FileAnalysisResponse {
  text: string;
  analysis: DocumentAnalyzerResponse;
  detectedEvidence: string[];
}

export interface GeneratedDocumentResponse {
  title: string;
  type: string;
  previewText: string;
}

/**
 * Server Action for parsing, analyzing, and detecting evidence in an uploaded document (PDF or image).
 */
export async function analyzeUploadedFileAction(
  base64Data: string,
  fileName: string,
  mimeType: string,
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<FileAnalysisResponse | AssessmentError> {
  const startTime = Date.now();
  console.log(`\n--- [SERVER ACTION] analyzeUploadedFileAction Start ---`);
  console.log('[app/actions/orchestrate] analyzeUploadedFileAction Server Action invoked. Language parameter:', language);

  let tempFileResult: SecureFileResult | null = null;

  try {
    // 1. Secure File validation and Temp Storage (Stage 1 validation)
    tempFileResult = validateAndSaveTempFile(base64Data, fileName, mimeType);
    console.log(`[SERVER ACTION] File successfully validated & securely saved temporarily: ${tempFileResult.filePath}`);

    let extractedText = '';

    // 2. Safe Parsing
    if (tempFileResult.mimeType === 'application/pdf') {
      extractedText = await extractTextFromPdf(base64Data);
    } else if (tempFileResult.mimeType.startsWith('image/')) {
      extractedText = await extractTextFromImage(base64Data, tempFileResult.mimeType);
    } else {
      throw new Error(`Unsupported document format: ${tempFileResult.mimeType}`);
    }

    console.log(`[SERVER ACTION] Extracted text size: ${extractedText.length} characters.`);

    // 3. Analyze text using Document Analyzer Agent
    const analysis = await analyzeDocument(extractedText, language);
    console.log(`[SERVER ACTION] Document analysis successful.`);

    const result = {
      text: extractedText,
      analysis,
      detectedEvidence: []
    };

    const masked = maskFileAnalysisResponse(result);
    const sanitized = sanitizeResult(masked) as FileAnalysisResponse;
    console.log(`[SERVER ACTION] Completed in ${Date.now() - startTime}ms.`);
    console.log(`--- [SERVER ACTION] analyzeUploadedFileAction End ---\n`);

    return sanitized;
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[SERVER ACTION ERROR] analyzeUploadedFileAction failed:`, err.stack || err.message || err);
    console.log(`--- [SERVER ACTION] analyzeUploadedFileAction End (With Errors) ---\n`);
    return {
      error: getFriendlyErrorMessage(err)
    };
  } finally {
    // 4. Temporary file cleanup (ensuring no orphaned files remain)
    if (tempFileResult?.filePath) {
      cleanupTempFile(tempFileResult.filePath);
    }
  }
}

/**
 * Server Action for custom legal document generation (Complaints and Notices).
 */
export async function generateCustomDocumentAction(
  docType: string,
  factsContext: string
): Promise<GeneratedDocumentResponse | AssessmentError> {
  const startTime = Date.now();
  console.log(`\n--- [SERVER ACTION] generateCustomDocumentAction Start ---`);
  console.log(`[SERVER ACTION] Requesting template: "${docType}"`);

  try {
    const draft = await generateDocument(docType, factsContext);
    const sanitized = sanitizeResult(draft) as GeneratedDocumentResponse;
    
    console.log(`[SERVER ACTION] Custom document generation completed in ${Date.now() - startTime}ms.`);
    console.log(`--- [SERVER ACTION] generateCustomDocumentAction End ---\n`);
    
    return sanitized;
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[SERVER ACTION ERROR] generateCustomDocumentAction failed:`, err.stack || err.message || err);
    console.log(`--- [SERVER ACTION] generateCustomDocumentAction End (With Errors) ---\n`);
    return {
      error: getFriendlyErrorMessage(err)
    };
  }
}

export interface TranslatedLegalOutput {
  translatedText: string;
  rights: string[];
  actions: string[];
  notes: string[];
  checklist: string[];
  timeline: Array<{ day: string; action: string; description: string }>;
  summary: { overview: string; legalProvisions: string[]; nextAction: string };
  riskLevel: string;
  riskFactors: string[];
  version?: number;
}

export interface TranslatedDocumentAnalysis {
  summary: string;
  clauses: Array<{ title: string; explanation: string; riskLevel: string }>;
  obligations: string[];
  deadlines: Array<{ date: string; action: string }>;
  risks: string[];
  text?: string;
  version?: number;
}

export async function translateLegalOutputAction(
  textToTranslate: string,
  toolkitData: {
    rights: string[];
    actions: string[];
    notes: string[];
    checklist: string[];
    timeline: Array<{ day: string; action: string; description: string }>;
    summary: { overview: string; legalProvisions: string[]; nextAction: string };
    riskLevel: string;
    riskFactors: string[];
  },
  toLanguage: 'en' | 'hi' | 'gu'
): Promise<TranslatedLegalOutput> {
  const startTime = Date.now();
  console.log(`\n--- [SERVER ACTION] translateLegalOutputAction Start ---`);
  console.log(`[SERVER ACTION] Target Language: ${toLanguage}`);

  const langName = toLanguage === 'hi' ? 'Hindi' : toLanguage === 'gu' ? 'Gujarati' : 'English';
  
  const systemInstruction = `You are a professional legal translator. Translate the given text and structured toolkit values into ${langName}.
IMPORTANT RULES:
1. Preserve the brand name "LexiGuard" exactly as "LexiGuard" (do not translate it).
2. Maintain all placeholders like [Your Name], [Agreement Number], etc. exactly.
3. Keep the JSON keys and types identical.
4. STRICTLY preserve the original structure: maintain all paragraphs, line breaks (\n), markdown bold/italics, bullet points, and lists exactly as in the source. Do not omit or simplify any formatting. Only translate textual content.
5. Output JSON only. No markdown fences.`;

  const prompt = `Translate to ${langName}:

Text: "${textToTranslate}"

Rights: ${JSON.stringify(toolkitData.rights)}

Actions: ${JSON.stringify(toolkitData.actions)}

Notes: ${JSON.stringify(toolkitData.notes)}

Checklist: ${JSON.stringify(toolkitData.checklist)}

Timeline: ${JSON.stringify(toolkitData.timeline)}

Summary: ${JSON.stringify(toolkitData.summary)}

Risk Level: "${toolkitData.riskLevel}"

Risk Factors: ${JSON.stringify(toolkitData.riskFactors)}

Output JSON:
{
  "translatedText": string,
  "rights": string[],
  "actions": string[],
  "notes": string[],
  "checklist": string[],
  "timeline": Array<{ "day": string, "action": string, "description": string }>,
  "summary": { "overview": string, "legalProvisions": string[], "nextAction": string },
  "riskLevel": string,
  "riskFactors": string[]
}`;

  try {
    const rawResponse = await generateWithGemini(prompt, {
      systemInstruction,
      jsonMode: true
    });
    
    const parsed = JSON.parse(rawResponse);
    parsed.version = 1; // Cache version
    const sanitized = sanitizeResult(parsed);
    console.log(`[SERVER ACTION] translateLegalOutputAction completed in ${Date.now() - startTime}ms.`);
    console.log(`--- [SERVER ACTION] translateLegalOutputAction End ---\n`);
    return sanitized as TranslatedLegalOutput;
  } catch (error) {
    console.error('[SERVER ACTION ERROR] translateLegalOutputAction failed:', error);
    console.log(`--- [SERVER ACTION] translateLegalOutputAction End (With Errors) ---\n`);
    const fallback = {
      translatedText: textToTranslate,
      ...toolkitData,
      version: 1
    };
    return sanitizeResult(fallback) as TranslatedLegalOutput;
  }
}

export async function translateDocumentAnalysisAction(
  analysis: {
    summary: string;
    clauses: Array<{ title: string; explanation: string; riskLevel: string }>;
    obligations: string[];
    deadlines: Array<{ date: string; action: string }>;
    risks: string[];
    text?: string;
  },
  toLanguage: 'en' | 'hi' | 'gu'
): Promise<TranslatedDocumentAnalysis> {
  const startTime = Date.now();
  console.log(`\n--- [SERVER ACTION] translateDocumentAnalysisAction Start ---`);
  console.log(`[SERVER ACTION] Target Language: ${toLanguage}`);

  const langName = toLanguage === 'hi' ? 'Hindi' : toLanguage === 'gu' ? 'Gujarati' : 'English';
  
  const systemInstruction = `You are a professional legal translator. Translate the given document simplification fields into ${langName}.
IMPORTANT RULES:
1. Preserve the brand name "LexiGuard" exactly as "LexiGuard".
2. Do NOT translate extracted entities (names, dates, amounts, invoices, agreement numbers).
3. STRICTLY preserve the original structure: maintain all paragraphs, line breaks (\n), markdown bold/italics, bullet points, and lists exactly as in the source. Do not omit or simplify any formatting. Only translate textual content.
4. Output JSON only. No markdown fences.`;

  const prompt = `Translate to ${langName}:

Summary: "${analysis.summary}"

Text: "${analysis.text || ''}"

Clauses: ${JSON.stringify(analysis.clauses)}

Obligations: ${JSON.stringify(analysis.obligations)}

Deadlines: ${JSON.stringify(analysis.deadlines)}

Risks: ${JSON.stringify(analysis.risks)}

Output JSON:
{
  "summary": string,
  "text": string,
  "clauses": Array<{ "title": string, "explanation": string, "riskLevel": string }>,
  "obligations": string[],
  "deadlines": Array<{ "date": string, "action": string }>,
  "risks": string[]
}`;

  try {
    const rawResponse = await generateWithGemini(prompt, {
      systemInstruction,
      jsonMode: true
    });
    
    const parsed = JSON.parse(rawResponse);
    parsed.version = 1; // Cache version
    const sanitized = sanitizeResult(parsed);
    console.log(`[SERVER ACTION] translateDocumentAnalysisAction completed in ${Date.now() - startTime}ms.`);
    console.log(`--- [SERVER ACTION] translateDocumentAnalysisAction End ---\n`);
    return sanitized as TranslatedDocumentAnalysis;
  } catch (error) {
    console.error('[SERVER ACTION ERROR] translateDocumentAnalysisAction failed:', error);
    console.log(`--- [SERVER ACTION] translateDocumentAnalysisAction End (With Errors) ---\n`);
    const fallback = {
      ...analysis,
      version: 1
    };
    return sanitizeResult(fallback) as TranslatedDocumentAnalysis;
  }
}
