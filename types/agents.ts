export type LegalCategory =
  | 'Consumer Complaint'
  | 'Cybercrime'
  | 'Employment Dispute'
  | 'Landlord / Property Issue'
  | 'Contract Issue'
  | 'Family Dispute'
  | 'General Legal Question';

export interface IssueClassifierResponse {
  category: LegalCategory;
  confidence: number; // 0 to 100
  reasoning: string;
  isDocumentAnalysisRequired: boolean; // True if user query requests contract breakdown or contains pasted legal documents
}

export interface LegalAdvisorResponse {
  rights: string[];
  actions: string[];
  notes: string[];
  text: string; // The user-facing explanation in simple language
}

export interface DocumentClause {
  title: string;
  explanation: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface DocumentDeadline {
  date: string;
  action: string;
}

export interface ConfidenceEntity {
  value: string;
  confidence: number;
  sourceDocument: string;
  sourceSection: string;
  extractionMethod: string;
}

export interface ExtractedEntities {
  names?: string[];
  dates?: string[];
  addresses?: string[];
  amounts?: string[];
  depositValues?: string[];
  agreementNumbers?: string[];
  phoneNumbers?: string[];
  emailAddresses?: string[];
  legalDates?: string[];
  
  // Structured details
  parties?: Array<{ name: string; role: string }>;
  propertyDetails?: string;
  invoiceDetails?: { number?: string; date?: string; amount?: string };
  chequeDetails?: { number?: string; date?: string; amount?: string };
  cyberDetails?: { transactionId?: string; upiId?: string; amount?: string; date?: string };
  employmentDetails?: { role?: string; joinDate?: string; terminationDate?: string; salary?: string };

  // Traceability metadata
  traceability?: Record<string, ConfidenceEntity>;
}

export interface DocumentAnalyzerResponse {
  summary: string;
  clauses: DocumentClause[];
  obligations: string[];
  deadlines: DocumentDeadline[];
  risks: string[];
  text: string; // User-facing narrative summary of the document
  entities?: ExtractedEntities;
  detectedDocType?: string; // e.g. "Rent Agreement" | "Bank Receipt" | "WhatsApp Screenshot" | "Property Handover" | "Other"
}

export interface ActionTimelineStep {
  day: string;
  action: string;
  description: string;
}

export interface ActionDocument {
  title: string;
  type: string; // 'Notice' | 'Complaint' | 'Agreement' | 'Email'
  previewText: string;
}

export interface ActionGeneratorResponse {
  checklist: string[];
  timeline: ActionTimelineStep[];
  summary: string; // Executive overview for case summary card
  legalProvisions: string[]; // Relevant laws cited
  nextAction: string; // Suggested next action for card
  documents: ActionDocument[];
  score: number; // Suggested case strength score (0 to 100)
  riskLevel: 'Low' | 'Medium' | 'High' | 'Strong Case';
  riskFactors: string[];
}

export interface ResolvedEntity {
  id: string;
  value: string;
  entityType: 'Person' | 'Organization' | 'Address' | 'Amount' | 'Date' | 'Phone' | 'Email' | 'Other';
  legalRole: string;
  confidence: number;
  source: 'document' | 'user' | 'system';
  verificationStatus: 'verified' | 'unverified' | 'conflict';
  originalMentions: Array<{
    value: string;
    sourceDocument?: string;
    sourceSection?: string;
    confidence: number;
  }>;
}

export interface CaseContext {
  category: LegalCategory;
  parties: Array<{ name: string; role: string }>;
  uploadedDocs: Array<{
    id?: string;
    name: string;
    type: string;
    text: string;
    analysis: DocumentAnalyzerResponse;
  }>;
  facts: string;
  entities: ExtractedEntities;
  checklist: Array<{ id: string; label: string; checked: boolean; evidenceCategory?: string }>;
  timeline: Array<{ id: string; title: string; date: string; description: string; status: 'completed' | 'current' | 'upcoming' }>;
  score: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Strong Case';
  riskFactors: string[];
  nextAction: string;
  generatedDocs?: Array<{ id: string; title: string; type: string; date: string; previewText: string; templateText?: string }>;
  resolvedEntities?: ResolvedEntity[];
}

export interface OrchestratorResult {
  category: LegalCategory;
  isDocumentAnalysisRun: boolean;
  classification: IssueClassifierResponse;
  analysis?: DocumentAnalyzerResponse;
  advice: LegalAdvisorResponse;
  actions: ActionGeneratorResponse;
  caseContext?: CaseContext;
}
