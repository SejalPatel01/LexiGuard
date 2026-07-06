import { generateWithGemini } from '../lib/gemini';
import { safeJsonParse } from '../lib/safe-json';
import { DocumentAnalyzerResponse } from '../types/agents';

const getFallbackAnalyzerResponse = (language: 'en' | 'hi' | 'gu'): DocumentAnalyzerResponse => {
  const summary = language === 'hi' 
    ? 'दस्तावेज़ का विश्लेषण करने में विफल।' 
    : language === 'gu' 
      ? 'દસ્તાવેજનું વિશ્લેષણ કરવામાં નિષ્ફળ.' 
      : 'Failed to analyze document.';
  const text = language === 'hi' 
    ? 'विश्लेषण प्रतिक्रिया को पार्स नहीं किया जा सका।' 
    : language === 'gu' 
      ? 'વિશ્લેષણ પ્રતિસાદ પાર્સ કરી શકાયો નથી.' 
      : 'The analysis response could not be parsed correctly.';
  return {
    summary,
    clauses: [],
    obligations: [],
    deadlines: [],
    risks: [],
    text,
    entities: {
      names: [],
      dates: [],
      addresses: [],
      amounts: [],
      depositValues: [],
      agreementNumbers: [],
      phoneNumbers: [],
      emailAddresses: [],
      parties: [],
      traceability: {}
    },
    detectedDocType: 'Other'
  };
};

export async function runDocumentAnalyzerAgent(
  pastedText: string,
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<DocumentAnalyzerResponse> {
  console.log('[agents/document-analyzer] runDocumentAnalyzerAgent invoked. Language parameter:', language);
  const langName = language === 'hi' ? 'Hindi' : language === 'gu' ? 'Gujarati' : 'English';

  const dynamicSystemInstruction = `Analyze pasted legal text. Keep summaries, explanations, obligations, and risks short and concise.
IMPORTANT: Generate the entire response in ${langName} (except the extracted entities list and detectedDocType which must remain in English).
Output JSON only:
{
  summary: string;     // brief 1-2 sentence overview in ${langName}
  clauses: Array<{
    title: string;     // clause name in ${langName}
    explanation: string; // very short plain-language explanation in ${langName}
    riskLevel: "Low" | "Medium" | "High";
  }>;
  obligations: string[]; // short bullet points of actions required in ${langName}
  deadlines: Array<{
    date: string;      // deadline or timeframe (e.g. "14 days") in ${langName}
    action: string;    // concise required action in ${langName}
  }>;
  risks: string[];     // short bullet points of key liabilities in ${langName}
  text: string;        // concise narrative summary of the document in ${langName}
  entities: {
    names: string[];            // Names of parties (in English)
    dates: string[];            // Dates mentioned (in English)
    addresses: string[];        // Addresses mentioned (in English)
    amounts: string[];          // General amounts or monetary figures (in English)
    depositValues: string[];    // Security deposit values specifically (in English)
    agreementNumbers: string[]; // Agreement/Contract numbers (in English)
    phoneNumbers: string[];     // Phone numbers (in English)
    emailAddresses: string[];   // Email addresses (in English)
    parties: Array<{ name: string; role: "Plaintiff" | "Defendant" | "Tenant" | "Landlord" | "Lessor" | "Lessee" | "Employer" | "Employee" | "Buyer" | "Seller" | "Complainant" | "Respondent" | "Other" }>;
    propertyDetails?: string;
    invoiceDetails?: { number?: string; date?: string; amount?: string };
    chequeDetails?: { number?: string; date?: string; amount?: string };
    cyberDetails?: { transactionId?: string; upiId?: string; amount?: string; date?: string };
    employmentDetails?: { role?: string; joinDate?: string; terminationDate?: string; salary?: string };
    traceability: Record<string, {
      value: string;
      confidence: number;       // Number between 0 and 1 indicating how explicitly it is stated
      sourceDocument: string;   // Use the file name or default to "Uploaded Document"
      sourceSection: string;    // Specific clause, section header, or paragraph context
      extractionMethod: "Gemini OCR" | "Gemini Parsing" | "User Input";
    }>;
  };
  detectedDocType: "Rent Agreement" | "Lease Agreement" | "Agreement" | "Contract" | "Employment Contract" | "Sale Deed" | "Property Agreement" | "Bank Receipt" | "Bank Statement" | "WhatsApp Screenshot" | "Email" | "SMS" | "Property Handover" | "Witness Statement" | "Photos" | "Video" | "Legal Notice" | "FIR" | "Complaint" | "Government Notice" | "Other";
}

CRITICAL RULES:
1. Zero Fabrication Principle: If a value or field is not present in the document text, do NOT make it up. Set it to null/empty and do not suggest fake names, dates, or values.
2. Traceability: For key entities (like names, addresses, amounts, dates, depositValues), create entries in the traceability object. The keys of the traceability record should represent the paths, e.g. "depositValues[0]" or "names[1]" or "agreementNumbers[0]". Assign a realistic confidence level and sourceSection where the information was found.`;
  
  const prompt = `Analyze this pasted legal document text:
"""
${pastedText}
"""

Provide a full clause-by-clause breakdown, active obligations, critical deadlines, and risks. Format the response as JSON.
IMPORTANT: You must write all output text, including the summary, explanation fields inside clauses, obligations list, deadlines action descriptions, risks list, and narrative text summary, in ${langName}. However, the entities (names, dates, addresses, amounts, etc.) and detectedDocType must remain in English.`;

  const rawResponse = await generateWithGemini(prompt, {
    systemInstruction: dynamicSystemInstruction,
    jsonMode: true
  });

  const parsed = safeJsonParse<DocumentAnalyzerResponse>(rawResponse, getFallbackAnalyzerResponse(language));

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
      emailAddresses: [],
      parties: [],
      traceability: {}
    };
  }

  return parsed;
}
