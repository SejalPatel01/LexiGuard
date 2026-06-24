'use server';

import { runOrchestrationPipeline } from '@/services/orchestrator';
import { OrchestratorResult, DocumentAnalyzerResponse } from '@/types/agents';
import { extractTextFromPdf, extractTextFromImage } from '@/services/pdf-parser';
import { analyzeDocument } from '@/services/document-analysis';
import { generateDocument } from '@/services/document-generator';

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
 * Next.js Server Action wrapper for executing the multi-agent legal pipeline.
 * Keeps API credentials secure on the server.
 */
export async function runLegalAssessment(
  userQuery: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<OrchestratorResult | AssessmentError> {
  const startTime = Date.now();
  console.log(`\n--- [SERVER ACTION] runLegalAssessment Start ---`);
  console.log(`[SERVER ACTION] Query length: ${userQuery.length} chars`);
  console.log(`[SERVER ACTION] History length: ${chatHistory.length} messages`);
  console.log(`[SERVER ACTION] Language: ${language}`);
  
  const apiKeyExists = !!process.env.GEMINI_API_KEY;
  console.log(`[SERVER ACTION] GEMINI_API_KEY environment variable detected: ${apiKeyExists}`);

  try {
    if (!userQuery || !userQuery.trim()) {
      console.log(`[SERVER ACTION] Validation failed: Empty query.`);
      return { error: 'Query content is empty' };
    }

    // Run the agent pipeline
    const rawResult = await runOrchestrationPipeline(userQuery, chatHistory, language);
    console.log(`[SERVER ACTION] Agent pipeline finished successfully. Sanitizing output...`);

    // Clean undefined fields (Flight serializing preparation)
    const sanitized = sanitizeResult(rawResult) as OrchestratorResult;
    
    const duration = Date.now() - startTime;
    console.log(`[SERVER ACTION] Assessment completed successfully in ${duration}ms.`);
    console.log(`--- [SERVER ACTION] runLegalAssessment End ---\n`);
    
    return sanitized;
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`\n[SERVER ACTION ERROR] runLegalAssessment failed:`, err.stack || err.message || err);
    console.log(`--- [SERVER ACTION] runLegalAssessment End (With Errors) ---\n`);
    
    return {
      error: err.message || 'An unexpected error occurred during legal assessment.'
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
  console.log(`[SERVER ACTION] File name: ${fileName} | Mime: ${mimeType} | Lang: ${language}`);

  try {
    let extractedText = '';

    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPdf(base64Data);
    } else if (mimeType.startsWith('image/')) {
      extractedText = await extractTextFromImage(base64Data, mimeType);
    } else {
      throw new Error(`Unsupported document format: ${mimeType}`);
    }

    console.log(`[SERVER ACTION] Extracted text size: ${extractedText.length} characters.`);

    // 1. Analyze text using Document Analyzer Agent
    const analysis = await analyzeDocument(extractedText, language);
    console.log(`[SERVER ACTION] Document analysis successful.`);

    const result = {
      text: extractedText,
      analysis,
      detectedEvidence: []
    };

    const sanitized = sanitizeResult(result) as FileAnalysisResponse;
    console.log(`[SERVER ACTION] Completed in ${Date.now() - startTime}ms.`);
    console.log(`--- [SERVER ACTION] analyzeUploadedFileAction End ---\n`);

    return sanitized;
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[SERVER ACTION ERROR] analyzeUploadedFileAction failed:`, err.stack || err.message || err);
    console.log(`--- [SERVER ACTION] analyzeUploadedFileAction End (With Errors) ---\n`);
    return {
      error: err.message || 'An error occurred while parsing and analyzing your document.'
    };
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
      error: err.message || 'Failed to draft the requested document template.'
    };
  }
}
