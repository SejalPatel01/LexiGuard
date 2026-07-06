import { Message, CaseChecklistItem, CaseStrength } from '../types';
import { DocumentAnalyzerResponse } from '../types/agents';

// Helper to map checklist label to evidence category based on keywords
export function mapLabelToCategory(label: string): 'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos' | null {
  const l = label.toLowerCase();

  // 1. Witness / Neighbour / Manager / Testimonial
  if (l.includes('witness') || l.includes('neighbour') || l.includes('manager') || l.includes('testimonial')) {
    return 'witness';
  }
  // 2. Communication / Chats / WhatsApp / Email / Messages / Letters / HR Emails / Chat Logs
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
  // 3. Payment Proof / Transaction / Bank / Statement / Receipt / Salary / Slip / Payslip
  if (
    l.includes('transaction') || 
    l.includes('receipt') || 
    l.includes('payment') || 
    l.includes('bank') || 
    l.includes('salary slip') || 
    l.includes('payslip') || 
    l.includes('salary') ||
    l.includes('statement')
  ) {
    return 'bank';
  }
  // 4. Rent / Lease / Contract / Tenancy / Agreement / Appointment Letter / Offer Letter / FIR / Bill / Invoice
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
    l.includes('bill') ||
    l.includes('invoice')
  ) {
    return 'rent';
  }
  // 5. Photos / Videos / Screenshots
  if (
    l.includes('photo') || 
    l.includes('video') || 
    l.includes('photograph') || 
    l.includes('image') || 
    l.includes('screenshot')
  ) {
    return 'photos';
  }
  // 6. Handover / Possession / Vacated / Move out / Move-out / Delivery proof / Product Return / Return Proof
  if (
    l.includes('handover') || 
    l.includes('possession') || 
    l.includes('vacated') || 
    l.includes('move out') || 
    l.includes('move-out') || 
    l.includes('delivery') || 
    l.includes('discharge') ||
    l.includes('product return') ||
    l.includes('return proof')
  ) {
    return 'handover';
  }
  return null;
}

// Helper to map specific evidence types back to evidence categories
export function getCategoryOfEvidenceType(type: string): 'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos' | null {
  const t = type.toLowerCase();
  if (t === 'rent agreement' || t === 'employment offer letter' || t === 'invoice' || t === 'police fir' || t === 'fir') return 'rent';
  if (t === 'bank transfer proof' || t === 'salary slips' || t === 'bank statements' || t === 'bank transaction records' || t === 'receipt') return 'bank';
  if (t === 'whatsapp chat logs' || t === 'hr email correspondence' || t === 'call logs' || t === 'email correspondence' || t === 'chat logs') return 'comm';
  if (t === 'property handover document' || t === 'discharge / handover proof' || t === 'product return proof') return 'handover';
  if (t === 'witness statement') return 'witness';
  if (t === 'screenshots / visual evidence' || t === 'screenshots') return 'photos';
  return null;
}

export type UniversalEvidenceCategory =
  | 'Identity Proof'
  | 'Ownership Proof'
  | 'Payment Proof'
  | 'Communication Evidence'
  | 'Contract Evidence'
  | 'Employment Evidence'
  | 'Medical Evidence'
  | 'Financial Evidence'
  | 'Government Record'
  | 'Court Record'
  | 'Digital Evidence'
  | 'Media Evidence'
  | 'Expert Opinion'
  | 'Supporting Evidence';

export const UNIVERSAL_EVIDENCE_KEYWORDS: Array<{ category: UniversalEvidenceCategory; keywords: string[] }> = [
  {
    category: 'Contract Evidence',
    keywords: ['agreement', 'lease', 'contract', 'tenancy', 'rent agreement', 'employment contract', 'offer letter', 'appointment letter', 'sale deed', 'property agreement', 'invoice', 'bill']
  },
  {
    category: 'Payment Proof',
    keywords: ['receipt', 'bank receipt', 'payment proof', 'transfer proof', 'transaction record', 'payslip', 'salary slip', 'bank statement', 'wages']
  },
  {
    category: 'Communication Evidence',
    keywords: ['whatsapp', 'chat log', 'email', 'correspondence', 'message', 'sms', 'call log']
  },
  {
    category: 'Supporting Evidence',
    keywords: ['handover', 'possession', 'witness statement', 'declaration', 'neighbour', 'testimonial', 'delivery slip', 'return proof', 'clearance certificate']
  },
  {
    category: 'Media Evidence',
    keywords: ['screenshot', 'photo', 'video', 'image', 'recording']
  },
  {
    category: 'Government Record',
    keywords: ['fir', 'police complaint', 'complaint copy', 'government notice', 'tax record']
  }
];

export function mapToUniversalEvidenceCategory(label: string): UniversalEvidenceCategory {
  const l = label.toLowerCase();
  
  if (l.includes('identity') || l.includes('passport') || l.includes('aadhar') || l.includes('pan card') || l.includes('id proof')) {
    return 'Identity Proof';
  }
  if (l.includes('ownership') || l.includes('deed') || l.includes('title') || l.includes('registry')) {
    return 'Ownership Proof';
  }
  if (l.includes('payment') || l.includes('receipt') || l.includes('transaction') || l.includes('transfer') || l.includes('bank statement') || l.includes('salary slip') || l.includes('payslip') || l.includes('debit') || l.includes('upi') || l.includes('bank')) {
    return 'Payment Proof';
  }
  if (l.includes('communication') || l.includes('chat') || l.includes('whatsapp') || l.includes('email') || l.includes('message') || l.includes('correspondence') || l.includes('sms') || l.includes('call log')) {
    return 'Communication Evidence';
  }
  if (l.includes('agreement') || l.includes('lease') || l.includes('contract') || l.includes('offer letter') || l.includes('appointment letter') || l.includes('rent') || l.includes('invoice') || l.includes('bill')) {
    return 'Contract Evidence';
  }
  if (l.includes('fir') || l.includes('police') || l.includes('complaint copy') || l.includes('government record') || l.includes('court record') || l.includes('government notice') || l.includes('record')) {
    return 'Government Record';
  }
  if (l.includes('handover') || l.includes('possession') || l.includes('witness') || l.includes('declaration') || l.includes('neighbour') || l.includes('testimonial') || l.includes('discharge') || l.includes('delivery')) {
    return 'Supporting Evidence';
  }
  if (l.includes('screenshot') || l.includes('photo') || l.includes('video') || l.includes('image')) {
    return 'Media Evidence';
  }

  return 'Supporting Evidence';
}

export function getUniversalEvidenceCategoryOfDoc(docType: string): UniversalEvidenceCategory {
  const t = docType.toLowerCase();
  if (t === 'rent agreement' || t === 'lease agreement' || t === 'employment contract' || t === 'agreement' || t === 'contract' || t === 'invoice' || t === 'bill') {
    return 'Contract Evidence';
  }
  if (t === 'bank receipt' || t === 'bank statement' || t === 'salary slips' || t === 'receipt') {
    return 'Payment Proof';
  }
  if (t === 'whatsapp screenshot' || t === 'email' || t === 'sms' || t === 'whatsapp chat logs') {
    return 'Communication Evidence';
  }
  if (t === 'property handover' || t === 'witness statement') {
    return 'Supporting Evidence';
  }
  if (t === 'photos' || t === 'video' || t === 'screenshots' || t === 'screenshots / visual evidence') {
    return 'Media Evidence';
  }
  if (t === 'fir' || t === 'complaint' || t === 'government notice' || t === 'police fir') {
    return 'Government Record';
  }
  return 'Supporting Evidence';
}

export const EVIDENCE_METADATA: Record<string, Record<'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos', { why: string; upload: string }>> = {
  landlord: {
    rent: {
      why: "Written agreement establishes lease terms and deposit refund conditions.",
      upload: "Rent or Lease Agreement"
    },
    bank: {
      why: "Payment proof strengthens claims of actual deposit payment.",
      upload: "Bank statement, bank receipt, or transaction screenshot"
    },
    comm: {
      why: "Communication logs establish deposit demand and landlord refusal timeline.",
      upload: "WhatsApp screenshots or chat export"
    },
    handover: {
      why: "Handover proof confirms the date vacancy occurred and lease ended.",
      upload: "Property handover or keys return slip"
    },
    witness: {
      why: "Witness statements back up verbal discussions and physical condition.",
      upload: "Signed witness declaration or statement"
    },
    photos: {
      why: "Photos/videos document property condition and avoid wear-and-tear claims.",
      upload: "Condition photographs or video walk-through"
    }
  },
  employment: {
    rent: {
      why: "Offer letter or contract establishes employment status, notice period, and salary terms.",
      upload: "Employment contract or offer letter"
    },
    bank: {
      why: "Salary slips prove payment history and verify unpaid wages.",
      upload: "Salary slips or bank statement showing past salary credits"
    },
    comm: {
      why: "HR emails document termination notices and salary conversations.",
      upload: "HR email threads or official chat screenshots"
    },
    handover: {
      why: "Discharge or handover proof confirms you returned company assets upon exit.",
      upload: "Asset return receipt or clearance certificate"
    },
    witness: {
      why: "Witness declarations substantiate work environment and verbal assurances.",
      upload: "Colleague testimony or statement"
    },
    photos: {
      why: "Screenshots verify specific communication or system access records.",
      upload: "System logins or slack chat screenshots"
    }
  },
  consumer: {
    rent: {
      why: "Invoice or purchase bill proves transaction details, pricing, and seller details.",
      upload: "Invoice or cash bill"
    },
    bank: {
      why: "Payment receipt confirms payment was processed to the merchant.",
      upload: "Payment receipt or bank statement"
    },
    comm: {
      why: "Grievance communications establish that the merchant was notified of the issue.",
      upload: "Email threads or customer service chat records"
    },
    handover: {
      why: "Product return proof verifies product was returned back to merchant.",
      upload: "Courier receipt or returns slip"
    },
    witness: {
      why: "Witness statements corroborate item condition or delivery failure details.",
      upload: "Delivery agent or bystander declaration"
    },
    photos: {
      why: "Visual evidence clearly displays defects or incorrect product delivered.",
      upload: "Defective item photos or unboxing video"
    }
  },
  cyber: {
    rent: {
      why: "Police FIR is required by banks to initiate chargebacks for cyber crime.",
      upload: "Police FIR copy or online complaint draft"
    },
    bank: {
      why: "Transaction logs list precise transaction IDs to trace fraudulent accounts.",
      upload: "UPI/Bank transaction receipt or bank statement"
    },
    comm: {
      why: "Scam communications establish deception methods and details.",
      upload: "Telegram/WhatsApp chat logs with the offender"
    },
    handover: {
      why: "Discharge / Handover Proof confirms that you closed/suspended related compromised accounts.",
      upload: "Account suspension confirmation"
    },
    witness: {
      why: "Witness declarations substantiate facts surrounding unauthorized access.",
      upload: "Witness statement"
    },
    photos: {
      why: "Visual records preserve scam websites, profile pictures, and transactions.",
      upload: "Scam interface or profile screenshots"
    }
  },
  general: {
    rent: {
      why: "Written contract establishes legal obligations and terms between parties.",
      upload: "Written contract or agreement"
    },
    bank: {
      why: "Transaction history proves financial exchange occurred.",
      upload: "Bank receipts or transaction statements"
    },
    comm: {
      why: "Correspondence logs establish notification and communication timeline.",
      upload: "Email conversations or chat transcripts"
    },
    handover: {
      why: "Handover proof documents assets transfer details.",
      upload: "Handover memo or return slip"
    },
    witness: {
      why: "Witness statement backs up verbal agreements or physical events.",
      upload: "Witness declaration"
    },
    photos: {
      why: "Visual records verify claims and document incidents.",
      upload: "Incident photos or visual evidence"
    }
  }
};

// Helper to detect case category dynamically
export function detectCaseCategory(
  checklist: CaseChecklistItem[],
  messages: Message[]
): 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general' {
  const GENERIC_LABELS = [
    'written lease/purchase/employment agreement',
    'proof of transactions (receipts/statements)',
    'correspondence logs (emails/chats)',
    'government id & proof of address',
    'written lease or rental agreement',
    'bank transaction proof or receipts',
    'whatsapp chat logs or emails',
    'property handover document',
    'witness statement/declaration',
    'screenshots / visual evidence',
    'photos/video evidence',
    'identity documents'
  ];

  for (const item of checklist) {
    const label = item.label.toLowerCase().trim();
    if (GENERIC_LABELS.includes(label)) {
      continue;
    }
    if (label.includes('offer letter') || label.includes('salary slip') || label.includes('hr email') || label.includes('payslip') || label.includes('employment')) {
      return 'employment';
    }
    if (label.includes('fir') || label.includes('transaction records') || label.includes('screenshots') || (label.includes('chat logs') && !label.includes('whatsapp'))) {
      return 'cyber';
    }
    if (label.includes('invoice') || label.includes('receipt') || label.includes('complaint communication')) {
      return 'consumer';
    }
    if (label.includes('rent agreement') || label.includes('lease or rental') || label.includes('whatsapp messages') || label.includes('whatsapp chat logs') || label.includes('landlord')) {
      return 'landlord';
    }
  }

  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  if (userText.includes('salary') || userText.includes('employer') || userText.includes('termination') || userText.includes('offer letter') || userText.includes('salary slip') || userText.includes('payslip') || userText.includes('wages') || userText.includes('employee') || userText.includes('employment')) {
    return 'employment';
  }
  if (userText.includes('fir') || userText.includes('scam') || userText.includes('cyber') || userText.includes('upi') || userText.includes('phishing') || userText.includes('hacked') || userText.includes('otp')) {
    return 'cyber';
  }
  if (userText.includes('refund') || userText.includes('defective') || userText.includes('seller') || userText.includes('invoice') || userText.includes('receipt') || userText.includes('purchase') || userText.includes('product') || userText.includes('warranty')) {
    return 'consumer';
  }
  if (userText.includes('landlord') || userText.includes('tenant') || userText.includes('rent') || userText.includes('lease') || userText.includes('deposit') || userText.includes('rental') || userText.includes('tenancy') || userText.includes('flat')) {
    return 'landlord';
  }

  return 'general';
}

export function generateNextActionRecommendation(
  caseCategory: 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general',
  isFullyVerified: boolean = false
): { action: string; reason: string } {
  if (isFullyVerified) {
    switch (caseCategory) {
      case 'landlord':
        return {
          action: "Generate Security Deposit Demand Notice",
          reason: "All critical evidence is collected. You can now generate the demand notice template to send to the landlord."
        };
      case 'employment':
        return {
          action: "Generate Salary Recovery Notice",
          reason: "All critical evidence is collected. You can now generate the salary recovery notice template to send to the employer."
        };
      case 'consumer':
        return {
          action: "Generate Consumer Complaint",
          reason: "All critical evidence is collected. You can now generate the consumer complaint template to file with the Consumer Forum."
        };
      case 'cyber':
        return {
          action: "Prepare FIR / Transaction Evidence Package",
          reason: "All critical evidence is collected. You can now compile the transaction trail evidence package for submission to the Cyber Cell."
        };
      case 'general':
      default:
        return {
          action: "Generate Formal Legal Draft",
          reason: "All critical evidence is collected. You can now generate the legal draft template to pursue formal recourse."
        };
    }
  } else {
    return {
      action: "Upload Supporting Evidence",
      reason: "To strengthen your case standing, please upload the missing critical evidence (such as agreements, bills, or payment receipts) or detail them in the chat window."
    };
  }
}

export interface EvidenceGapRecommendation {
  evidenceType: string;
  whyItMatters: string;
  nextUpload: string;
}

export interface EvidenceGapResult {
  missingEvidence: string[];
  recommendations: EvidenceGapRecommendation[];
  estimatedImprovedScore: number;
}

export function calculateEvidenceGaps(
  caseCategory: 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general',
  checklist: CaseChecklistItem[]
): EvidenceGapResult {
  const missingEvidence: string[] = [];
  const recommendations: EvidenceGapRecommendation[] = [];
  const criticalCategories = new Set<string>(['rent', 'bank', 'comm']);
  const metadata = EVIDENCE_METADATA[caseCategory] || EVIDENCE_METADATA['general'];

  checklist.forEach(item => {
    if (!item.checked) {
      const cat = mapLabelToCategory(item.label);
      if (cat && criticalCategories.has(cat)) {
        missingEvidence.push(item.label);
        const meta = metadata[cat];
        if (meta) {
          recommendations.push({
            evidenceType: item.label,
            whyItMatters: meta.why,
            nextUpload: meta.upload
          });
        }
      }
    }
  });

  const simulatedChecklist = checklist.map(item => {
    const cat = mapLabelToCategory(item.label);
    const isCritical = cat && criticalCategories.has(cat);
    return {
      ...item,
      checked: item.checked || !!isCritical
    };
  });

  const simulatedResult = calculateWeightedScoreAndRisks(caseCategory, simulatedChecklist, []);
  
  return {
    missingEvidence,
    recommendations,
    estimatedImprovedScore: simulatedResult.score
  };
}

// Canonical Weighted Scoring logic implementation
export function calculateWeightedScoreAndRisks(
  caseCategory: 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general',
  checklist: CaseChecklistItem[],
  uploadedDocs: Array<{ name: string; type: string; text: string; analysis?: DocumentAnalyzerResponse }>,
  userQuery?: string
): { score: number; riskLevel: 'Low' | 'Medium' | 'High' | 'Strong Case'; riskFactors: string[] } {
  
  // Check if the latest document type is 'Other' and if there is no other evidence yet
  const primaryDoc = uploadedDocs && uploadedDocs[0];
  if (primaryDoc && primaryDoc.analysis?.detectedDocType === 'Other' && uploadedDocs.length === 1 && checklist.every(i => !i.checked)) {
    return {
      score: 15,
      riskLevel: 'High',
      riskFactors: ['Initial details pending. Case strength score will adjust once incident context is provided.']
    };
  }

  // Define Verification States based on Universal Evidence Categories
  let contractVerified = false;
  let bankVerified = false;
  let commVerified = false;
  let supportVerified = false;

  checklist.forEach(item => {
    if (item.checked) {
      const cat = item.evidenceCategory || mapToUniversalEvidenceCategory(item.label);
      if (cat === 'Contract Evidence') contractVerified = true;
      if (cat === 'Payment Proof') bankVerified = true;
      if (cat === 'Communication Evidence') commVerified = true;
      if (cat === 'Supporting Evidence' || cat === 'Media Evidence' || cat === 'Government Record') supportVerified = true;
    }
  });

  // Calculate weighted score
  let baseScore = 15;
  let contractWeight = contractVerified ? 40 : 0;
  let bankWeight = bankVerified ? 30 : 0;
  let commWeight = commVerified ? 20 : 0;
  let supportWeight = supportVerified ? 10 : 0;

  let score = baseScore + contractWeight + bankWeight + commWeight + supportWeight;

  // Capped at 95% maximum for legal realism
  score = Math.min(95, score);

  // Mismatch & Inconsistency Penalty and detection logic
  let depositMismatchFound = false;
  let mismatchDetail = '';
  const contractValues: number[] = [];
  const paymentValues: number[] = [];
  let contractRawVal = '';
  let paymentRawVal = '';

  uploadedDocs.forEach(doc => {
    const docType = doc.analysis?.detectedDocType;
    const cat = getUniversalEvidenceCategoryOfDoc(docType || '');
    const entities = doc.analysis?.entities;
    if (!entities) return;
    
    const extractNumbers = (strList?: string[]) => {
      if (!strList) return [];
      return strList
        .map(s => {
          const cleanedCurrency = s.toLowerCase()
            .replace(/rs\./g, '')
            .replace(/rs/g, '')
            .replace(/₹/g, '')
            .replace(/inr/g, '');
          const cleaned = cleanedCurrency.replace(/[^0-9.]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? null : num;
        })
        .filter((n): n is number => n !== null);
    };

    if (cat === 'Contract Evidence') {
      contractValues.push(...extractNumbers(entities.depositValues));
      contractValues.push(...extractNumbers(entities.amounts));
      contractRawVal = entities.depositValues?.[0] || entities.amounts?.[0] || '';
    } else if (cat === 'Payment Proof') {
      paymentValues.push(...extractNumbers(entities.amounts));
      paymentValues.push(...extractNumbers(entities.depositValues));
      paymentRawVal = entities.amounts?.[0] || entities.depositValues?.[0] || '';
    }
  });

  if (paymentValues.length === 0 && userQuery) {
    const cleanedQuery = userQuery.toLowerCase()
      .replace(/rs\./g, '')
      .replace(/rs/g, '')
      .replace(/₹/g, '')
      .replace(/inr/g, '')
      .replace(/,/g, '');
    
    const queryNumbers = cleanedQuery
      .replace(/[^0-9.]/g, ' ')
      .split(/\s+/)
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
    
    if (queryNumbers.length > 0) {
      paymentValues.push(...queryNumbers);
      paymentRawVal = `₹${queryNumbers[0].toLocaleString()}`;
    }
  }

  if (contractValues.length > 0 && paymentValues.length > 0) {
    const hasMatch = contractValues.some(cv => paymentValues.some(pv => Math.abs(cv - pv) < 1.0));
    if (!hasMatch) {
      depositMismatchFound = true;
      mismatchDetail = `Transaction value mismatch: Contract specifies ${contractRawVal || contractValues[0]}, but Payment Proof shows ${paymentRawVal || paymentValues[0]}.`;
    }
  } else if (contractValues.length > 0 && bankVerified && paymentValues.length === 0) {
    depositMismatchFound = true;
    mismatchDetail = 'Transaction amount could not be verified from transactions.';
  }

  // Dynamic Risk Factors compilation
  const riskFactors: string[] = [];
  if (depositMismatchFound) {
    riskFactors.push(mismatchDetail);
    // Apply penalty
    score = Math.max(15, score - 15);
  }

  if (!contractVerified) {
    riskFactors.push('Primary contract or agreement establishing the terms is missing.');
  }
  if (!bankVerified) {
    riskFactors.push('Proof of bank transactions or payment is missing.');
  }
  if (!commVerified) {
    riskFactors.push('Official communication records or correspondence history not verified.');
  }
  if (!supportVerified) {
    riskFactors.push('Supporting files, witness confirmation, or media evidence pending.');
  }

  if (riskFactors.length === 0) {
    riskFactors.push('No significant evidence risks identified. All key evidence categories verified.');
  }

  // Risk levels based on score thresholds
  let riskLevel: 'High' | 'Medium' | 'Strong Case' = 'High';
  if (score > 70) {
    riskLevel = 'Strong Case';
  } else if (score > 40) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'High';
  }

  return {
    score,
    riskLevel,
    riskFactors
  };
}

export function getDefaultChecklist(category: 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general'): CaseChecklistItem[] {
  const map: Record<string, string[]> = {
    landlord: [
      "Rent Agreement",
      "Bank Transfer Proof",
      "WhatsApp Messages",
      "Property Handover Document",
      "Witness statement/declaration",
      "Screenshots / Visual Evidence"
    ],
    employment: [
      "Employment Offer Letter",
      "Salary Slips",
      "HR Emails",
      "Discharge / Handover Proof",
      "Witness statement/declaration",
      "Screenshots / Visual Evidence"
    ],
    consumer: [
      "Invoice",
      "Receipt",
      "Complaint Communication",
      "Product Return Proof",
      "Witness statement/declaration",
      "Screenshots / Visual Evidence"
    ],
    cyber: [
      "FIR",
      "Transaction Records",
      "Chat Logs",
      "Discharge / Handover Proof",
      "Witness statement/declaration",
      "Screenshots"
    ],
    general: [
      "Written Lease/Purchase/Employment Agreement",
      "Proof of Transactions (Receipts/Statements)",
      "Correspondence Logs (Emails/Chats)",
      "Property handover document",
      "Witness statement/declaration",
      "Screenshots / Visual Evidence"
    ]
  };

  const labels = map[category] || map['general'];
  return labels.map((label, idx) => ({
    id: `chk-${category}-${idx}`,
    label,
    checked: false
  }));
}

export function verifyChecklist(
  category: 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general',
  checklist: CaseChecklistItem[],
  messages: Message[],
  uploadedDocs: any[]
): CaseChecklistItem[] {
  // 1. Resolve uploaded document universal categories
  const uploadedDocCategories = new Set<string>(
    uploadedDocs.map(doc => {
      const docType = doc.analysis?.detectedDocType || doc.type;
      return docType ? getUniversalEvidenceCategoryOfDoc(docType) : null;
    }).filter(Boolean) as string[]
  );

  // 2. Resolve user text keywords to universal categories
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  const userDocCategories = new Set<string>();
  UNIVERSAL_EVIDENCE_KEYWORDS.forEach(rule => {
    if (rule.keywords.some(kw => userText.includes(kw))) {
      userDocCategories.add(rule.category);
    }
  });

  return checklist.map(item => {
    const itemCat = item.evidenceCategory || mapToUniversalEvidenceCategory(item.label);
    const isVerified = uploadedDocCategories.has(itemCat) || userDocCategories.has(itemCat);
    return {
      ...item,
      checked: isVerified,
      evidenceCategory: itemCat
    };
  });
}
