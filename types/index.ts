import { DocumentAnalyzerResponse } from './agents';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string or human-readable format
}

export interface CaseChecklistItem {
  id: string;
  label: string;
  checked: boolean;
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
  };
  uploadedDocs?: Array<{
    id: string;
    name: string;
    type: string;
    text: string;
    analysis: DocumentAnalyzerResponse;
  }>;
  pinned?: boolean;
}
