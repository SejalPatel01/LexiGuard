import { generateWithGemini } from '../lib/gemini';
import { safeJsonParse } from '../lib/safe-json';
import { ActionGeneratorResponse, LegalCategory } from '../types/agents';

const DEFAULT_ACTION_RESPONSE: ActionGeneratorResponse = {
  checklist: [],
  timeline: [],
  summary: 'Failed to compile action plan. Output was malformed.',
  legalProvisions: [],
  nextAction: 'Verify the details of your inquiry and try again.',
  documents: [],
  score: 10,
  riskLevel: 'High',
  riskFactors: ['Action plan generation output was malformed.']
};

const SYSTEM_INSTRUCTION = `Generate dispute resources. Keep checklist, timeline, summaries, and risk factors extremely concise.
CRITICAL CHRONOLOGY RULES:
1. Timeline: Build a chronologically valid timeline consisting ONLY of verified document events, verified user statement facts, and legally inferred milestones. Never invent hypothetical dates or events.
2. Context-Aware Notice Drafting: Look at the Extracted Entities in the Document Analysis context (such as names, addresses, and deposit amounts). Automatically populate these values directly into the drafted legal notice templates (documents[i].previewText) instead of leaving blank placeholders, unless the entity is missing or has low confidence.
3. Checklist: ONLY include evidence items that are explicitly mentioned or detected in the user query or document analysis. DO NOT include optional, generic, hypothetical, or typical evidence categories that the user has not explicitly stated they possess.

Output JSON only:
{
  checklist: string[];   // short evidence items explicitly detected/mentioned
  timeline: Array<{
    day: string;         // e.g. "Day 1", "Day 7"
    action: string;      // short title of action
    description: string; // brief description of action
  }>;
  summary: string;       // 1-2 sentence executive overview
  legalProvisions: string[]; // short cited laws (e.g. "IT Act Section 66D")
  nextAction: string;    // concise immediate next step
  documents: Array<{
    title: string;       // e.g. "Refund Demand Notice"
    type: string;        // "Notice" | "Complaint" | "Email"
    previewText: string; // complete drafted text in English (with placeholders like [Your Name] only for missing info)
  }>;
  score: number;         // 0-100
  riskLevel: "Low" | "Medium" | "High";
  riskFactors: string[]; // short bullet points of risks/strengths
}`;

// Helper to map checklist label to evidence category
function mapLabelToCategory(label: string): 'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos' | null {
  const l = label.toLowerCase();
  if (l.includes('witness') || l.includes('neighbour') || l.includes('manager') || l.includes('testimonial')) {
    return 'witness';
  }
  if (
    l.includes('communication') || 
    l.includes('correspondence') || 
    l.includes('email') || 
    l.includes('chat') || 
    l.includes('whatsapp') || 
    l.includes('message') || 
    l.includes('hr email') ||
    l.includes('chat log') ||
    (l.includes('letter') && !l.includes('appointment') && !l.includes('offer'))
  ) {
    return 'comm';
  }
  if (
    l.includes('transaction') || 
    l.includes('receipt') || 
    l.includes('payment') || 
    l.includes('bank') || 
    l.includes('invoice') || 
    l.includes('salary slip') || 
    l.includes('payslip') || 
    l.includes('salary') ||
    l.includes('statement')
  ) {
    return 'bank';
  }
  if (
    l.includes('agreement') || 
    l.includes('lease') || 
    l.includes('contract') || 
    l.includes('rent') || 
    l.includes('tenancy') || 
    l.includes('appointment') ||
    l.includes('offer letter') ||
    l.includes('offer') ||
    l.includes('fir') ||
    l.includes('bill')
  ) {
    return 'rent';
  }
  if (
    l.includes('photo') || 
    l.includes('video') || 
    l.includes('photograph') || 
    l.includes('image') || 
    l.includes('screenshot')
  ) {
    return 'photos';
  }
  if (
    l.includes('handover') || 
    l.includes('possession') || 
    l.includes('vacated') || 
    l.includes('move out') || 
    l.includes('move-out') || 
    l.includes('delivery') || 
    l.includes('discharge')
  ) {
    return 'handover';
  }
  return null;
}

// Strict evidence detection helpers matching use-chats.tsx
const detectRent = (text: string) => {
  const t = text.toLowerCase();
  return t.includes('rent agreement') || t.includes('lease agreement') || t.includes('tenancy agreement') || t.includes('employment contract') || t.includes('appointment letter') || t.includes('written contract') || t.includes('written agreement');
};

const detectBankStrict = (text: string) => {
  const t = text.toLowerCase();
  return t.includes('bank transfer') || t.includes('bank statement') || t.includes('payment receipt') || t.includes('transaction proof');
};

const detectComm = (text: string) => {
  const t = text.toLowerCase();
  return t.includes('whatsapp') || t.includes('email') || t.includes('messages') || t.includes('chats') || t.includes('chat log') || t.includes('correspondence');
};

const detectHandoverStrict = (text: string) => {
  const t = text.toLowerCase();
  return t.includes('handover') || t.includes('possession returned') || t.includes('vacated property') || t.includes('move out proof') || t.includes('delivery proof') || t.includes('vacated the');
};

const detectPhotosStrict = (text: string) => {
  const t = text.toLowerCase();
  return t.includes('photo') || t.includes('image') || t.includes('video') || t.includes('screenshot');
};

const detectWitnessStrict = (text: string) => {
  const t = text.toLowerCase();
  return t.includes('witness') || t.includes('neighbour') || t.includes('manager saw') || t.includes('someone can confirm');
};

export async function runActionGeneratorAgent(
  userQuery: string,
  category: LegalCategory,
  adviceContext: string,
  analysisContext?: string,
  detectedDocType?: string,
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<ActionGeneratorResponse> {
  const langName = language === 'hi' ? 'Hindi' : language === 'gu' ? 'Gujarati' : 'English';

  const prompt = `User Query: "${userQuery}"
Category: "${category}"
Advice provided: "${adviceContext}"
${analysisContext ? `Document Analysis Context: \n${analysisContext}` : ''}

Generate the evidence checklist, chronological action timeline, case summary, legal drafts, and strength analysis. Format the response as JSON.
IMPORTANT: You must write all output text, including the checklist item names, timeline title/descriptions, summary, nextAction, and riskFactors in ${langName}.
Ensure absolute consistency with the entities extracted in the Document Analysis Context (names, dates, deposit values).
MULTILINGUAL SAFETY RULE: The generated document content (documents[i].previewText and documents[i].title) MUST REMAIN IN ENGLISH. Under no circumstances should the legal templates, consumer complaints, court filing templates, affidavits, or formal legal drafts be automatically translated, unless the user query explicitly requests the document in Hindi or Gujarati.`;

  const rawResponse = await generateWithGemini(prompt, {
    systemInstruction: SYSTEM_INSTRUCTION,
    jsonMode: true
  });

  const parsed = safeJsonParse<ActionGeneratorResponse>(rawResponse, DEFAULT_ACTION_RESPONSE);

  // Filter generated checklist items programmatically to guarantee constraint
  const catLower = category.toLowerCase();
  const isEmployment = catLower.includes('employment');
  const isConsumer = catLower.includes('consumer');
  const isCyber = catLower.includes('cyber') || catLower.includes('fraud');
  const isLandlord = catLower.includes('landlord') || catLower.includes('property');

  let docRentDetected = false;
  let docBankDetected = false;
  let docCommDetected = false;
  let docHandoverDetected = false;
  let docWitnessDetected = false;
  let docPhotosDetected = false;

  // Strict document type driven mapping (no text scanning on documents)
  if (detectedDocType && detectedDocType !== 'Other' && detectedDocType !== 'Legal Notice') {
    const dt = detectedDocType;
    if (dt === 'Rent Agreement' || dt === 'Lease Agreement') {
      if (isLandlord) docRentDetected = true;
    } else if (dt === 'Employment Contract') {
      if (isEmployment) docRentDetected = true;
    } else if (dt === 'Invoice') {
      if (isConsumer) docRentDetected = true;
    } else if (dt === 'FIR') {
      if (isCyber) docRentDetected = true;
    } else if (dt === 'Bank Receipt' || dt === 'Bank Statement') {
      docBankDetected = true;
    } else if (dt === 'WhatsApp Screenshot' || dt === 'Email' || dt === 'SMS') {
      docCommDetected = true;
    } else if (dt === 'Property Handover') {
      if (isLandlord) docHandoverDetected = true;
    } else if (dt === 'Witness Statement') {
      docWitnessDetected = true;
    } else if (dt === 'Photos' || dt === 'Video') {
      docPhotosDetected = true;
    }
  }

  // Scan user messages for text-based keywords
  let queryRentDetected = false;
  let queryBankDetected = false;
  let queryCommDetected = false;
  let queryHandoverDetected = false;
  let queryWitnessDetected = false;
  let queryPhotosDetected = false;

  const t = userQuery.toLowerCase();

  if (isEmployment) {
    queryRentDetected = t.includes('offer letter') || t.includes('employment contract') || t.includes('appointment letter') || t.includes('employment agreement') || t.includes('joining letter');
    queryBankDetected = t.includes('salary slip') || t.includes('payslip') || t.includes('salary slips') || t.includes('payslips') || t.includes('bank statement') || t.includes('bank statements') || t.includes('bank transfer') || t.includes('wages') || t.includes('salary');
    queryCommDetected = t.includes('hr email') || t.includes('hr emails') || t.includes('email conversations with hr') || t.includes('emails with hr') || t.includes('hr correspondence') || t.includes('email with hr') || t.includes('email') || t.includes('emails');
    queryWitnessDetected = t.includes('witness') || t.includes('neighbour');
    queryPhotosDetected = t.includes('photo') || t.includes('image') || t.includes('video') || t.includes('screenshot');
  } else if (isLandlord) {
    queryRentDetected = t.includes('rent agreement') || t.includes('lease agreement') || t.includes('tenancy agreement') || t.includes('rental agreement') || t.includes('written lease') || t.includes('lease contract') || t.includes('written agreement');
    queryBankDetected = t.includes('bank transfer') || t.includes('payment proof') || t.includes('transaction proof') || t.includes('receipt') || t.includes('transaction id') || t.includes('bank transfer proof');
    queryCommDetected = t.includes('whatsapp') || t.includes('chat') || t.includes('email') || t.includes('messages') || t.includes('chats') || t.includes('whatsapp messages') || t.includes('whatsapp chat logs');
    queryHandoverDetected = t.includes('handover') || t.includes('possession returned') || t.includes('vacated property') || t.includes('move out proof') || t.includes('delivery proof') || t.includes('property handover');
    queryWitnessDetected = t.includes('witness') || t.includes('neighbour') || t.includes('manager') || t.includes('witness statement');
    queryPhotosDetected = t.includes('photo') || t.includes('image') || t.includes('video') || t.includes('screenshot') || t.includes('screenshots');
  } else if (isConsumer) {
    queryRentDetected = t.includes('invoice') || t.includes('bill');
    queryBankDetected = t.includes('receipt') || t.includes('payment receipt') || t.includes('payment proof') || t.includes('bank transfer');
    queryCommDetected = t.includes('complaint') || t.includes('email') || t.includes('chat') || t.includes('whatsapp') || t.includes('communication') || t.includes('message');
  } else if (isCyber) {
    queryRentDetected = t.includes('fir') || t.includes('police complaint') || t.includes('first information report');
    queryBankDetected = t.includes('transaction') || t.includes('bank transfer') || t.includes('upi') || t.includes('debit') || t.includes('statement') || t.includes('receipt') || t.includes('transaction records');
    queryCommDetected = t.includes('chat') || t.includes('log') || t.includes('whatsapp') || t.includes('telegram') || t.includes('messages') || t.includes('email');
    queryPhotosDetected = t.includes('screenshot') || t.includes('screenshots') || t.includes('photo') || t.includes('image');
  } else {
    // general fallback
    queryRentDetected = t.includes('rent agreement') || t.includes('lease agreement') || t.includes('tenancy agreement') || t.includes('rental agreement') || t.includes('written lease') || t.includes('lease contract');
    queryRentDetected = queryRentDetected || t.includes('offer letter') || t.includes('employment contract') || t.includes('appointment letter') || t.includes('fir') || t.includes('invoice');
    queryBankDetected = t.includes('bank transfer') || t.includes('bank statement') || t.includes('payment receipt') || t.includes('transaction proof') || t.includes('salary slip') || t.includes('payslip') || t.includes('receipt') || t.includes('invoice');
    queryCommDetected = t.includes('whatsapp') || t.includes('email') || t.includes('messages') || t.includes('chats') || t.includes('chat log') || t.includes('correspondence');
    queryHandoverDetected = t.includes('handover') || t.includes('possession returned') || t.includes('vacated');
    queryWitnessDetected = t.includes('witness') || t.includes('neighbour');
    queryPhotosDetected = t.includes('photo') || t.includes('image') || t.includes('video') || t.includes('screenshot');
  }

  const rentAgreementDetected = queryRentDetected || docRentDetected;
  const bankProofDetected = queryBankDetected || docBankDetected;
  const communicationDetected = queryCommDetected || docCommDetected;
  const propertyHandoverDetected = queryHandoverDetected || docHandoverDetected;
  const witnessDetected = queryWitnessDetected || docWitnessDetected;
  const photosDetected = queryPhotosDetected || docPhotosDetected;

  if (parsed && Array.isArray(parsed.checklist)) {
    parsed.checklist = parsed.checklist.filter((label) => {
      const cat = mapLabelToCategory(label);
      if (cat === 'rent') return rentAgreementDetected;
      if (cat === 'bank') return bankProofDetected;
      if (cat === 'comm') return communicationDetected;
      if (cat === 'handover') return propertyHandoverDetected;
      if (cat === 'witness') return witnessDetected;
      if (cat === 'photos') return photosDetected;
      return false; // Filter out items mapping to null or unsupported categories
    });
  }

  return parsed;
}
