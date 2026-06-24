import { generateWithGemini } from '../lib/gemini';
import { safeJsonParse } from '../lib/safe-json';
import { DocumentAnalyzerResponse } from '../types/agents';

const DEFAULT_ANALYZER_RESPONSE: DocumentAnalyzerResponse = {
  summary: 'Failed to analyze document. The analysis output was malformed.',
  clauses: [],
  obligations: [],
  deadlines: [],
  risks: [],
  text: 'The analysis response could not be parsed correctly.',
  entities: {
    names: [],
    dates: [],
    addresses: [],
    amounts: [],
    depositValues: [],
    agreementNumbers: [],
    phoneNumbers: [],
    emailAddresses: []
  },
  detectedDocType: 'Other'
};

const SYSTEM_INSTRUCTION = `Analyze pasted legal text. Keep summaries, explanations, obligations, and risks short and concise.
Output JSON only:
{
  summary: string;     // brief 1-2 sentence overview
  clauses: Array<{
    title: string;     // clause name
    explanation: string; // very short plain-English explanation
    riskLevel: "Low" | "Medium" | "High";
  }>;
  obligations: string[]; // short bullet points of actions required
  deadlines: Array<{
    date: string;      // deadline or timeframe (e.g. "14 days")
    action: string;    // concise required action
  }>;
  risks: string[];     // short bullet points of key liabilities
  text: string;        // concise narrative summary of the document
  entities: {
    names: string[];            // Names of parties (landlord, tenant, employer, employee, seller, buyer, etc.)
    dates: string[];            // Dates mentioned (agreement date, termination date, execution date, etc.)
    addresses: string[];        // Addresses mentioned (leased premises, corporate offices, etc.)
    amounts: string[];          // General amounts or monetary figures (rent, salary, price, etc.)
    depositValues: string[];    // Security deposit values specifically (if applicable)
    agreementNumbers: string[]; // Agreement/Contract numbers, registration IDs, or reference numbers
    phoneNumbers: string[];     // Phone numbers
    emailAddresses: string[];   // Email addresses
  };
  detectedDocType: "Rent Agreement" | "Lease Agreement" | "Agreement" | "Contract" | "Employment Contract" | "Sale Deed" | "Property Agreement" | "Bank Receipt" | "Bank Statement" | "WhatsApp Screenshot" | "Email" | "SMS" | "Property Handover" | "Witness Statement" | "Photos" | "Video" | "Legal Notice" | "FIR" | "Complaint" | "Government Notice" | "Other";
}`;

export async function runDocumentAnalyzerAgent(
  pastedText: string,
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<DocumentAnalyzerResponse> {
  const langName = language === 'hi' ? 'Hindi' : language === 'gu' ? 'Gujarati' : 'English';
  
  const prompt = `Analyze this pasted legal document text:
"""
${pastedText}
"""

Provide a full clause-by-clause breakdown, active obligations, critical deadlines, and risks. Format the response as JSON.
IMPORTANT: You must write all output text, including the summary, explanation fields inside clauses, obligations list, deadlines action descriptions, risks list, and narrative text summary, in ${langName}. However, the entities (names, dates, addresses, amounts, etc.) and detectedDocType must remain in English.`;

  const rawResponse = await generateWithGemini(prompt, {
    systemInstruction: SYSTEM_INSTRUCTION,
    jsonMode: true
  });

  const parsed = safeJsonParse<DocumentAnalyzerResponse>(rawResponse, DEFAULT_ANALYZER_RESPONSE);

  const ALLOWED_LEGAL_DOC_TYPES = [
    'Rent Agreement',
    'Lease Agreement',
    'Agreement',
    'Contract',
    'Employment Contract',
    'Sale Deed',
    'Property Agreement',
    'Bank Receipt',
    'Bank Statement',
    'WhatsApp Screenshot',
    'Email',
    'SMS',
    'Property Handover',
    'Witness Statement',
    'Photos',
    'Video',
    'Legal Notice',
    'FIR',
    'Complaint',
    'Government Notice'
  ];

  if (!parsed.detectedDocType) {
    parsed.detectedDocType = 'Other';
  }

  if (!parsed.entities) {
    parsed.entities = {
      names: [],
      dates: [],
      addresses: [],
      amounts: [],
      depositValues: [],
      agreementNumbers: [],
      phoneNumbers: [],
      emailAddresses: []
    };
  }

  if (!ALLOWED_LEGAL_DOC_TYPES.includes(parsed.detectedDocType)) {
    parsed.entities.names = [];
    parsed.entities.addresses = [];
    parsed.entities.depositValues = [];
    parsed.entities.amounts = [];
    parsed.entities.agreementNumbers = [];
  }

  return parsed;
}
