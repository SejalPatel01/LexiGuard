import { DocumentAnalyzerResponse } from './agents';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string or human-readable format
  originalLanguage?: 'en' | 'hi' | 'gu';
  originalText?: string;
  translations?: {
    en?: string;
    hi?: string;
    gu?: string;
    version?: number;
  };
  toolkitCache?: {
    en?: {
      adviceText: string;
      rights: string[];
      actions: string[];
      notes: string[];
      checklist: string[];
      timeline: Array<{ day: string; action: string; description: string }>;
      summary: { overview: string; legalProvisions: string[]; nextAction: string };
      riskLevel: string;
      riskFactors: string[];
    };
    hi?: {
      adviceText: string;
      rights: string[];
      actions: string[];
      notes: string[];
      checklist: string[];
      timeline: Array<{ day: string; action: string; description: string }>;
      summary: { overview: string; legalProvisions: string[]; nextAction: string };
      riskLevel: string;
      riskFactors: string[];
    };
    gu?: {
      adviceText: string;
      rights: string[];
      actions: string[];
      notes: string[];
      checklist: string[];
      timeline: Array<{ day: string; action: string; description: string }>;
      summary: { overview: string; legalProvisions: string[]; nextAction: string };
      riskLevel: string;
      riskFactors: string[];
    };
    version?: number;
  };
  isBlocked?: boolean;
  threatType?: 'Prompt Injection' | 'Jailbreak' | 'Unknown Suspicious Input';
  severity?: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason?: string;
}

export interface CaseChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  evidenceCategory?: string;
}

export interface CaseStrength {
  score: number; // Percentage from 0 to 100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Strong Case';
  riskFactors: string[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface GeneratedDoc {
  id: string;
  title: string;
  type: string; // e.g., 'Notice', 'Agreement', 'Complaint'
  date: string;
  previewText: string;
  templateText?: string;
}

export interface CaseSummary {
  overview: string;
  legalProvisions: string[];
  nextAction: string;
}

export interface UploadedDocAnalysisCache {
  summary: string;
  clauses: Array<{ title: string; explanation: string; riskLevel: string }>;
  obligations: string[];
  deadlines: Array<{ date: string; action: string }>;
  risks: string[];
  text?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  checklist: CaseChecklistItem[];
  caseStrength: CaseStrength;
  timeline: TimelineEvent[];
  generatedDocs: GeneratedDoc[];
  summary: CaseSummary;
  uploadedDoc?: {
    name: string;
    type: string;
    text: string;
    analysis: DocumentAnalyzerResponse;
    analysisTranslationCache?: {
      en?: UploadedDocAnalysisCache;
      hi?: UploadedDocAnalysisCache;
      gu?: UploadedDocAnalysisCache;
      version?: number;
    };
  };
  uploadedDocs?: Array<{
    id: string;
    name: string;
    type: string;
    text: string;
    analysis: DocumentAnalyzerResponse;
    analysisTranslationCache?: {
      en?: UploadedDocAnalysisCache;
      hi?: UploadedDocAnalysisCache;
      gu?: UploadedDocAnalysisCache;
    };
  }>;
  pinned?: boolean;
  chatLanguage?: 'en' | 'hi' | 'gu';
}
