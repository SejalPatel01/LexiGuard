import { generateWithGemini } from '../lib/gemini';
import { safeJsonParse } from '../lib/safe-json';
import { runDocumentAnalyzerAgent } from '../agents/document-analyzer';
import { DocumentAnalyzerResponse } from '../types/agents';

/**
 * Invokes the Document Analyzer Agent on extracted document text.
 */
export async function analyzeDocument(text: string, language: 'en' | 'hi' | 'gu' = 'en'): Promise<DocumentAnalyzerResponse> {
  return runDocumentAnalyzerAgent(text, language);
}

/**
 * Analyzes the document text and compares it against active checklist labels
 * to automatically identify which items should be marked as "verified".
 */
export async function detectEvidenceInText(text: string, checklistLabels: string[]): Promise<string[]> {
  console.log('[document-analysis] Detecting evidence matching checklist items...');
  
  const prompt = `Given the following document text:
"""
${text.substring(0, 5000)}
"""

And these evidence checklist labels:
${checklistLabels.map((label) => `- "${label}"`).join('\n')}

Analyze the document content and determine which of the checklist items are clearly satisfied, proven, or provided by this document.
For example:
- If the document is a Lease or Rent Agreement, it satisfies "Written Lease/Purchase/Employment Agreement" or similar.
- If the document is a bank receipt, transaction proof, or payment statement, it satisfies "Proof of Transactions (Receipts/Statements)" or similar.
- If it contains chat logs or email printouts, it satisfies "Correspondence Logs (Emails/Chats)" or similar.

You must output a JSON array of strings containing ONLY the exact matching labels from the list provided above. Do not output any markdown backticks or explanations outside of JSON.
Example output:
["Written Lease/Purchase/Employment Agreement", "Proof of Transactions (Receipts/Statements)"]`;

  try {
    const raw = await generateWithGemini(prompt, { jsonMode: true });
    const parsed = safeJsonParse<string[]>(raw, []);
    
    if (Array.isArray(parsed)) {
      // Normalize and return only valid checklist labels that exist in input checklistLabels
      return parsed.filter((item: string) => 
        checklistLabels.some(label => label.toLowerCase().trim() === item.toLowerCase().trim())
      );
    }
  } catch (e) {
    console.error('[document-analysis] Evidence detection JSON parsing error:', e);
  }
  
  return [];
}
