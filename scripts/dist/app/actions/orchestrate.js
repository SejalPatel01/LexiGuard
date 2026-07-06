'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLegalAssessment = runLegalAssessment;
exports.analyzeUploadedFileAction = analyzeUploadedFileAction;
exports.generateCustomDocumentAction = generateCustomDocumentAction;
exports.translateLegalOutputAction = translateLegalOutputAction;
exports.translateDocumentAnalysisAction = translateDocumentAnalysisAction;
const orchestrator_1 = require("@/services/orchestrator");
const pdf_parser_1 = require("@/services/pdf-parser");
const document_analysis_1 = require("@/services/document-analysis");
const document_generator_1 = require("@/services/document-generator");
const gemini_1 = require("@/lib/gemini");
const language_detector_1 = require("@/lib/language-detector");
const security_gateway_1 = require("../security/security_gateway");
/**
 * Helper to strip out undefined values from an object and replace them with null.
 * This is crucial for Next.js Server Actions, which fail to serialize undefined properties
 * when sending data to Client Components (throwing generic Flight/unexpected response errors).
 */
const sanitizeResult = (val) => {
    return JSON.parse(JSON.stringify(val, (key, value) => {
        return value === undefined ? null : value;
    }));
};
async function runLegalAssessment(userQuery, chatHistory = [], language = 'en') {
    const startTime = Date.now();
    console.log(`\n--- [SERVER ACTION] runLegalAssessment Start ---`);
    console.log(`[SERVER ACTION] Query length: ${userQuery.length} chars`);
    console.log(`[SERVER ACTION] History length: ${chatHistory.length} messages`);
    console.log('[app/actions/orchestrate] runLegalAssessment Server Action invoked. Preferred language preference:', language);
    const detectedLanguage = (0, language_detector_1.detectLanguageLocal)(userQuery);
    console.log('[app/actions/orchestrate] runLegalAssessment detected prompt language:', detectedLanguage);
    // 1. Centralized Security Gateway Check
    const securityCheck = (0, security_gateway_1.checkPromptSecurity)(userQuery);
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
        const rawResult = await (0, orchestrator_1.runOrchestrationPipeline)(userQuery, chatHistory, detectedLanguage);
        console.log(`[SERVER ACTION] Agent pipeline finished successfully. Sanitizing output...`);
        // Clean undefined fields (Flight serializing preparation)
        const sanitized = sanitizeResult({
            ...rawResult,
            detectedLanguage
        });
        const duration = Date.now() - startTime;
        console.log(`[SERVER ACTION] Assessment completed successfully in ${duration}ms.`);
        console.log(`--- [SERVER ACTION] runLegalAssessment End ---\n`);
        return sanitized;
    }
    catch (error) {
        const err = error;
        console.error(`\n[SERVER ACTION ERROR] runLegalAssessment failed:`, err.stack || err.message || err);
        console.log(`--- [SERVER ACTION] runLegalAssessment End (With Errors) ---\n`);
        return {
            error: err.message || 'An unexpected error occurred during legal assessment.'
        };
    }
}
/**
 * Server Action for parsing, analyzing, and detecting evidence in an uploaded document (PDF or image).
 */
async function analyzeUploadedFileAction(base64Data, fileName, mimeType, language = 'en') {
    const startTime = Date.now();
    console.log(`\n--- [SERVER ACTION] analyzeUploadedFileAction Start ---`);
    console.log('[app/actions/orchestrate] analyzeUploadedFileAction Server Action invoked. Language parameter:', language);
    try {
        let extractedText = '';
        if (mimeType === 'application/pdf') {
            extractedText = await (0, pdf_parser_1.extractTextFromPdf)(base64Data);
        }
        else if (mimeType.startsWith('image/')) {
            extractedText = await (0, pdf_parser_1.extractTextFromImage)(base64Data, mimeType);
        }
        else {
            throw new Error(`Unsupported document format: ${mimeType}`);
        }
        console.log(`[SERVER ACTION] Extracted text size: ${extractedText.length} characters.`);
        // 1. Analyze text using Document Analyzer Agent
        const analysis = await (0, document_analysis_1.analyzeDocument)(extractedText, language);
        console.log(`[SERVER ACTION] Document analysis successful.`);
        const result = {
            text: extractedText,
            analysis,
            detectedEvidence: []
        };
        const sanitized = sanitizeResult(result);
        console.log(`[SERVER ACTION] Completed in ${Date.now() - startTime}ms.`);
        console.log(`--- [SERVER ACTION] analyzeUploadedFileAction End ---\n`);
        return sanitized;
    }
    catch (error) {
        const err = error;
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
async function generateCustomDocumentAction(docType, factsContext) {
    const startTime = Date.now();
    console.log(`\n--- [SERVER ACTION] generateCustomDocumentAction Start ---`);
    console.log(`[SERVER ACTION] Requesting template: "${docType}"`);
    try {
        const draft = await (0, document_generator_1.generateDocument)(docType, factsContext);
        const sanitized = sanitizeResult(draft);
        console.log(`[SERVER ACTION] Custom document generation completed in ${Date.now() - startTime}ms.`);
        console.log(`--- [SERVER ACTION] generateCustomDocumentAction End ---\n`);
        return sanitized;
    }
    catch (error) {
        const err = error;
        console.error(`[SERVER ACTION ERROR] generateCustomDocumentAction failed:`, err.stack || err.message || err);
        console.log(`--- [SERVER ACTION] generateCustomDocumentAction End (With Errors) ---\n`);
        return {
            error: err.message || 'Failed to draft the requested document template.'
        };
    }
}
async function translateLegalOutputAction(textToTranslate, toolkitData, toLanguage) {
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
        const rawResponse = await (0, gemini_1.generateWithGemini)(prompt, {
            systemInstruction,
            jsonMode: true
        });
        const parsed = JSON.parse(rawResponse);
        parsed.version = 1; // Cache version
        const sanitized = sanitizeResult(parsed);
        console.log(`[SERVER ACTION] translateLegalOutputAction completed in ${Date.now() - startTime}ms.`);
        console.log(`--- [SERVER ACTION] translateLegalOutputAction End ---\n`);
        return sanitized;
    }
    catch (error) {
        console.error('[SERVER ACTION ERROR] translateLegalOutputAction failed:', error);
        console.log(`--- [SERVER ACTION] translateLegalOutputAction End (With Errors) ---\n`);
        const fallback = {
            translatedText: textToTranslate,
            ...toolkitData,
            version: 1
        };
        return sanitizeResult(fallback);
    }
}
async function translateDocumentAnalysisAction(analysis, toLanguage) {
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
        const rawResponse = await (0, gemini_1.generateWithGemini)(prompt, {
            systemInstruction,
            jsonMode: true
        });
        const parsed = JSON.parse(rawResponse);
        parsed.version = 1; // Cache version
        const sanitized = sanitizeResult(parsed);
        console.log(`[SERVER ACTION] translateDocumentAnalysisAction completed in ${Date.now() - startTime}ms.`);
        console.log(`--- [SERVER ACTION] translateDocumentAnalysisAction End ---\n`);
        return sanitized;
    }
    catch (error) {
        console.error('[SERVER ACTION ERROR] translateDocumentAnalysisAction failed:', error);
        console.log(`--- [SERVER ACTION] translateDocumentAnalysisAction End (With Errors) ---\n`);
        const fallback = {
            ...analysis,
            version: 1
        };
        return sanitizeResult(fallback);
    }
}
