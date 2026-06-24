import { generateWithGemini } from '../lib/gemini';
import { safeJsonParse } from '../lib/safe-json';

const SYSTEM_INSTRUCTION = `Draft professional legal documents based on dispute context. Keep documents clean and concise.
Document Types:
1. Notices (Demand, Refund, Deposit Recovery): Subject line, brief facts, specific demand, response deadline (e.g. 15 days), signature block.
2. Complaints (Consumer, Landlord, Employment, Cybercrime): Court/cell complaint headers, facts list, specific relief sought.

Do not display generic placeholder values such as "N/A", "Unknown", "Missing Data", "null", "undefined", or generic placeholders like "[Insert Name]".
Instead, if any details or facts are missing from the dispute context, use clear, explicit, human-readable template placeholders wrapped in square brackets.
Examples of human-readable placeholders:
- [Your Full Name]
- [Your Full Address]
- [Your City]
- [Seller / Company Name]
- [Invoice Number]
- [Product Name]
- [Father/Mother Name]
- [Agreement Date]
- [Landlord Name]
- [Tenant Name]
- [Disputed Amount]

The drafted document and preview should act like a ready-to-fill legal template. A user with no legal knowledge should immediately understand what needs to be filled manually.
Output JSON only:
{
  title: string;       // document title
  type: string;        // "Notice" | "Complaint" | "Email"
  previewText: string; // complete drafted text
}`;

/**
 * Generates a custom legal draft (Notice or Complaint) based on case facts and chat history.
 */
export async function generateDocument(
  docType: string,
  factsContext: string
): Promise<{ title: string; type: string; previewText: string }> {
  console.log(`[document-generator] Generating document of type "${docType}"...`);

  const prompt = `Document Type Requested: "${docType}"
Dispute Context and Chat History:
"""
${factsContext}
"""

Draft this document using the provided details. Use professional legal language and formatting. Format the response as JSON.`;

  const defaultVal = {
    title: `${docType} Draft`,
    type: docType.toLowerCase().includes('notice') ? 'Notice' : 'Complaint',
    previewText: 'Failed to compile draft.'
  };

  try {
    const raw = await generateWithGemini(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
      jsonMode: true
    });
    
    const result = safeJsonParse(raw, defaultVal);
    
    return {
      title: result.title || defaultVal.title,
      type: result.type || defaultVal.type,
      previewText: result.previewText || defaultVal.previewText
    };
  } catch (e) {
    console.error('[document-generator] Failed to draft document:', e);
    return defaultVal;
  }
}
