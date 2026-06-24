import { runClassifierAgent } from '../agents/issue-classifier';
import { runAdvisorAgent } from '../agents/legal-advisor';
import { runDocumentAnalyzerAgent } from '../agents/document-analyzer';
import { runActionGeneratorAgent } from '../agents/action-generator';
import { OrchestratorResult, LegalAdvisorResponse } from '../types/agents';

/**
 * Checks if the user query is explicitly requesting a legal document draft or template generation.
 */
function isDocumentGenerationRequest(query: string): boolean {
  const normalized = query.toLowerCase();
  
  const genKeywords = ['generate', 'create', 'draft', 'write', 'prepare'];
  const docKeywords = ['complaint letter', 'legal notice', 'notice', 'email draft', 'complaint', 'fir draft'];
  
  const hasGen = genKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(normalized));
  const hasDoc = docKeywords.some(kw => normalized.includes(kw));
  
  return hasGen && hasDoc;
}

/**
 * Main agent orchestration controller.
 * Executes classification, conditional document analysis, advice generation,
 * and document/action item compilation in a unified pipeline.
 */
export async function runOrchestrationPipeline(
  userQuery: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<OrchestratorResult> {
  console.log(`[Orchestrator] Starting pipeline for query: "${userQuery.substring(0, 50)}..." | Lang: ${language}`);

  // 1. Run Issue Classifier Agent
  const classification = await runClassifierAgent(userQuery);
  console.log(`[Orchestrator] Classification: ${classification.category} (Confidence: ${classification.confidence}%)`);
  
  const isDocAnalysisRun = classification.isDocumentAnalysisRequired || classification.category === 'Contract Issue';
  
  // 2. Conditionally Run Document Analyzer Agent
  let analysisResult;
  if (isDocAnalysisRun) {
    console.log(`[Orchestrator] Document analysis triggered...`);
    analysisResult = await runDocumentAnalyzerAgent(userQuery, language);
  }

  // Compile context text for the next stages
  const analysisContext = analysisResult 
    ? `Document Summary: ${analysisResult.summary}\nKey Risks: ${analysisResult.risks.join(', ')}`
    : undefined;

  let advice: LegalAdvisorResponse;
  let actions;

  // Check if it's a document generation request
  const isDocGen = isDocumentGenerationRequest(userQuery);

  if (isDocGen) {
    console.log(`[Orchestrator] Document generation request detected. Bypassing normal Legal Advisor Agent...`);
    
    // Bypass Advisor and run Action & Document Generator Agent directly.
    // We pass instructions directly.
    actions = await runActionGeneratorAgent(
      userQuery,
      classification.category,
      `Draft the requested document matching the user's specific query: "${userQuery}". Ensure it contains: Date, Subject, Facts, Request, and Signature sections.`,
      analysisContext,
      analysisResult?.detectedDocType,
      language
    );

    // Set the main text response to be the drafted document itself so it displays directly in the chat bubble
    advice = {
      rights: [],
      actions: [],
      notes: ["Document generated successfully as requested."],
      text: actions.documents[0]?.previewText || "Failed to generate document draft."
    };
  } else {
    // 3. Run Legal Advisor Agent (Normal Flow)
    console.log(`[Orchestrator] Generating legal advice...`);
    advice = await runAdvisorAgent(userQuery, classification.category, analysisContext, language);

    // 4. Run Action & Document Generator Agent (Normal Flow)
    console.log(`[Orchestrator] Generating action plans and drafts...`);
    actions = await runActionGeneratorAgent(
      userQuery,
      classification.category,
      advice.text,
      analysisContext,
      analysisResult?.detectedDocType,
      language
    );
  }

  console.log(`[Orchestrator] Pipeline executed successfully.`);

  return {
    category: classification.category,
    isDocumentAnalysisRun: isDocAnalysisRun,
    classification,
    analysis: analysisResult,
    advice,
    actions
  };
}
