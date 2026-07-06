#!/usr/bin/env node
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

// Redirect console.log to console.error to prevent agent stdout pollution from corrupting the MCP stdio channel.
console.log = console.error;


import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { runClassifierAgent } from '../agents/issue-classifier';
import { runDocumentAnalyzerAgent } from '../agents/document-analyzer';
import { runAdvisorAgent } from '../agents/legal-advisor';
import { runActionGeneratorAgent } from '../agents/action-generator';
import { generateDocument } from '../services/document-generator';
import { detectEvidenceInText } from '../services/document-analysis';
import { checkPromptSecurity } from '../app/security/security_gateway';
import { validateAndMaskOutput, SAFE_FALLBACK_MESSAGE } from '../app/security/output_validator';
import { LegalCategory } from '../types/agents';

// Initialize the MCP server
const server = new McpServer({
  name: "LexiGuard MCP Server",
  version: "1.0.0",
});

// Helper for security check on inputs
async function verifySafety(input: string): Promise<void> {
  const securityCheck = await checkPromptSecurity(input);
  if (securityCheck.isBlocked) {
    throw new Error(
      `Security Block: ${securityCheck.reason || 'Blocked due to policy violation.'} (Threat: ${securityCheck.threatType}, Severity: ${securityCheck.severity})`
    );
  }
}

// Helper to recursively mask string properties of an object without triggering raw JSON filters
function maskObjectStrings(val: any): any {
  if (typeof val === 'string') {
    const validated = validateAndMaskOutput(val);
    if (!validated.isValid) {
      return SAFE_FALLBACK_MESSAGE;
    }
    return validated.text;
  }
  if (Array.isArray(val)) {
    return val.map(maskObjectStrings);
  }
  if (val !== null && typeof val === 'object') {
    const res: any = {};
    for (const key of Object.keys(val)) {
      res[key] = maskObjectStrings(val[key]);
    }
    return res;
  }
  return val;
}

// Helper for masking output text/objects
function maskValue<T>(obj: T): T {
  return maskObjectStrings(obj);
}

/**
 * Tool 1: classify_legal_issue
 */
server.tool(
  "classify_legal_issue",
  {
    userQuery: z.string().describe("The user's query explaining their legal issue or query")
  },
  async ({ userQuery }) => {
    console.error(`[MCP] Tool classify_legal_issue invoked.`);
    await verifySafety(userQuery);

    const result = await runClassifierAgent(userQuery);
    const response = {
      category: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning,
      requiresDocumentAnalysis: result.isDocumentAnalysisRequired
    };

    return {
      content: [{ type: "text", text: JSON.stringify(maskValue(response), null, 2) }]
    };
  }
);

/**
 * Tool 2: analyze_document
 */
server.tool(
  "analyze_document",
  {
    documentText: z.string().describe("Extracted text content of the legal document or contract"),
    language: z.enum(["en", "hi", "gu"]).optional().default("en").describe("Preferred response language ('en', 'hi', or 'gu')")
  },
  async ({ documentText, language }) => {
    console.error(`[MCP] Tool analyze_document invoked in language: ${language}.`);
    await verifySafety(documentText);

    const result = await runDocumentAnalyzerAgent(documentText, language);
    const response = {
      summary: result.summary,
      clauses: result.clauses,
      obligations: result.obligations,
      deadlines: result.deadlines,
      risks: result.risks
    };

    return {
      content: [{ type: "text", text: JSON.stringify(maskValue(response), null, 2) }]
    };
  }
);

/**
 * Tool 3: generate_legal_advice
 */
server.tool(
  "generate_legal_advice",
  {
    query: z.string().describe("The user's query explaining their legal issue"),
    category: z.string().describe("The classified category of the legal issue"),
    analysis: z.string().optional().describe("Optional context from a previously analyzed document"),
    language: z.enum(["en", "hi", "gu"]).optional().default("en").describe("Preferred response language ('en', 'hi', or 'gu')")
  },
  async ({ query, category, analysis, language }) => {
    console.error(`[MCP] Tool generate_legal_advice invoked.`);
    await verifySafety(query);
    if (analysis) {
      await verifySafety(analysis);
    }

    const result = await runAdvisorAgent(query, category as LegalCategory, analysis, language);
    const response = {
      rights: result.rights,
      actions: result.actions,
      notes: result.notes,
      advice: result.text
    };

    return {
      content: [{ type: "text", text: JSON.stringify(maskValue(response), null, 2) }]
    };
  }
);

/**
 * Tool 4: generate_action_plan
 */
server.tool(
  "generate_action_plan",
  {
    query: z.string().describe("The user's query explaining their legal issue"),
    category: z.string().describe("The classified category of the legal issue"),
    adviceContext: z.string().describe("The legal advice details generated by Advisor"),
    analysisContext: z.string().optional().describe("Optional contract analysis details"),
    detectedDocType: z.string().optional().describe("Optional detected document type"),
    language: z.enum(["en", "hi", "gu"]).optional().default("en").describe("Preferred response language ('en', 'hi', or 'gu')")
  },
  async ({ query, category, adviceContext, analysisContext, detectedDocType, language }) => {
    console.error(`[MCP] Tool generate_action_plan invoked.`);
    await verifySafety(query);
    await verifySafety(adviceContext);
    if (analysisContext) {
      await verifySafety(analysisContext);
    }

    const result = await runActionGeneratorAgent(
      query,
      category as LegalCategory,
      adviceContext,
      analysisContext,
      detectedDocType,
      language
    );

    const response = {
      timeline: result.timeline,
      checklist: result.checklist,
      laws: result.legalProvisions,
      risks: result.riskFactors,
      drafts: result.documents
    };

    return {
      content: [{ type: "text", text: JSON.stringify(maskValue(response), null, 2) }]
    };
  }
);

/**
 * Tool 5: generate_draft_document
 */
server.tool(
  "generate_draft_document",
  {
    documentType: z.string().describe("Type of draft to generate (e.g. Legal Notice, FIR Draft, Consumer Complaint)"),
    facts: z.string().describe("The factual background and context for the dispute")
  },
  async ({ documentType, facts }) => {
    console.error(`[MCP] Tool generate_draft_document invoked.`);
    await verifySafety(facts);

    const result = await generateDocument(documentType, facts);
    const response = {
      title: result.title,
      type: result.type,
      previewText: result.previewText
    };

    return {
      content: [{ type: "text", text: JSON.stringify(maskValue(response), null, 2) }]
    };
  }
);

/**
 * Tool 6: detect_evidence
 */
server.tool(
  "detect_evidence",
  {
    documentText: z.string().describe("Extracted text of the uploaded document"),
    checklist: z.array(z.string()).describe("Expected list of evidence checklist items to verify")
  },
  async ({ documentText, checklist }) => {
    console.error(`[MCP] Tool detect_evidence invoked.`);
    await verifySafety(documentText);

    const verified = await detectEvidenceInText(documentText, checklist);
    
    // Find items in the input checklist that were not verified
    const verifiedLower = verified.map(item => item.toLowerCase().trim());
    const missing = checklist.filter(item => 
      !verifiedLower.includes(item.toLowerCase().trim())
    );

    const response = {
      verified_evidence: verified,
      missing_evidence: missing
    };

    return {
      content: [{ type: "text", text: JSON.stringify(maskValue(response), null, 2) }]
    };
  }
);

// Connect the transport and start listening
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LexiGuard MCP Server successfully running on stdio transport.");
}

main().catch((err) => {
  console.error("MCP Server runtime failure:", err);
  process.exit(1);
});
