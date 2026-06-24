'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Chat, Message, CaseChecklistItem, CaseStrength } from '../types';
import { INITIAL_MOCK_CHATS } from '../lib/mock-data';
import { runLegalAssessment, analyzeUploadedFileAction, generateCustomDocumentAction } from '@/app/actions/orchestrate';
import { ExtractedEntities, DocumentAnalyzerResponse } from '../types/agents';
import { translations } from '../lib/translations';

interface ChatContextType {
  chats: Chat[];
  activeChatId: string | null;
  searchQuery: string;
  isTyping: boolean;
  activeChat: Chat | null;
  lastOrchestratorResponse: any;
  isQuotaExhausted: boolean;
  setSearchQuery: (query: string) => void;
  createChat: (title?: string) => string;
  deleteChat: (id: string) => void;
  selectChat: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  toggleChecklistItem: (itemId: string) => void;
  regenerateLastMessage: () => Promise<void>;
  uploadAndAnalyzeFile: (fileName: string, mimeType: string, base64Data: string) => Promise<void>;
  generateCustomDoc: (docType: string) => Promise<void>;
  updateGeneratedDoc: (docId: string, text: string) => void;
  removeUploadedDoc: () => void;
  language: 'en' | 'hi' | 'gu';
  setLanguage: (lang: 'en' | 'hi' | 'gu') => void;
  t: (key: string) => string;
  renameChat: (id: string, newTitle: string) => void;
  togglePinChat: (id: string) => void;
  loadDemoCase: (demoId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'nyaya-chats';
const ACTIVE_CHAT_KEY = 'nyaya-active-chat-id';

// Helper to map label to category based on keywords
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

// Helper to generate a unique ID
export function generateUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const randomStr = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${Date.now()}-${randomStr}`;
}

const ALLOWED_LEGAL_DOC_TYPES = [
  'Rent Agreement',
  'Lease Agreement',
  'Legal Notice',
  'FIR',
  'Complaint',
  'Contract',
  'Sale Deed',
  'Property Agreement',
  'Employment Contract',
  'Government Notice',
  'Agreement',
  'Bank Receipt',
  'Bank Statement',
  'WhatsApp Screenshot',
  'Email',
  'SMS',
  'Property Handover',
  'Witness Statement',
  'Photos',
  'Video'
];

export function hasEnoughVerifiedInfo(chat: Chat): boolean {
  const hasLegalUpload = chat.uploadedDocs?.some(doc => 
    doc.analysis?.detectedDocType && ALLOWED_LEGAL_DOC_TYPES.includes(doc.analysis.detectedDocType)
  ) || (chat.uploadedDoc?.analysis?.detectedDocType && ALLOWED_LEGAL_DOC_TYPES.includes(chat.uploadedDoc.analysis.detectedDocType));

  const hasCheckedAgreement = chat.checklist.some(item => 
    item.checked && (
      item.label.toLowerCase().includes('agreement') || 
      item.label.toLowerCase().includes('contract') || 
      item.label.toLowerCase().includes('lease')
    )
  );

  return !!(hasLegalUpload || hasCheckedAgreement);
}

// Helper to auto-fill placeholders in templates
export function autoFillPlaceholders(previewText: string, entities: ExtractedEntities): string {
  if (!entities) return previewText;
  
  const clean = (s: string) => s.toLowerCase().replace(/['’\s_-]/g, '');

  return previewText.replace(/\[([^\]]+)\]/g, (match, placeholderName) => {
    const p = clean(placeholderName);
    
    // 1. Phone Numbers
    if (p.includes('phone') || p.includes('mobile') || p.includes('contact')) {
      if (entities.phoneNumbers && entities.phoneNumbers.length > 0) return entities.phoneNumbers[0];
      return match;
    }

    // 2. Email
    if (p.includes('email') || p.includes('mail')) {
      if (entities.emailAddresses && entities.emailAddresses.length > 0) return entities.emailAddresses[0];
      return match;
    }

    // 3. Names
    if (p.includes('landlord') || p.includes('lessor') || p.includes('employer') || p.includes('sender')) {
      if (entities.names && entities.names.length > 0) return entities.names[0];
      return match;
    }
    if (p.includes('tenant') || p.includes('lessee') || p.includes('employee') || p.includes('recipient')) {
      if (entities.names && entities.names.length > 1) return entities.names[1];
      if (entities.names && entities.names.length > 0) return entities.names[0];
      return match;
    }
    if (p.includes('name')) {
      if (entities.names && entities.names.length > 0) {
        return entities.names[0];
      }
      return match;
    }

    // 4. Addresses
    if (p.includes('address') || p.includes('premises') || p.includes('property')) {
      if (entities.addresses && entities.addresses.length > 0) return entities.addresses[0];
      return match;
    }

    // 5. Deposit Value / Amounts
    if (p.includes('deposit') || p.includes('security')) {
      if (entities.depositValues && entities.depositValues.length > 0) return entities.depositValues[0];
      if (entities.amounts && entities.amounts.length > 0) return entities.amounts[0];
      return match;
    }
    if (p.includes('rent') || p.includes('amount') || p.includes('value') || p.includes('salary') || p.includes('fee')) {
      if (entities.amounts && entities.amounts.length > 0) return entities.amounts[0];
      return match;
    }

    // 6. Agreement Numbers
    if (p.includes('number') || p.includes('id') || p.includes('reference') || p.includes('agreement') || p.includes('contract')) {
      if (entities.agreementNumbers && entities.agreementNumbers.length > 0) return entities.agreementNumbers[0];
      return match;
    }

    // 7. Dates
    if (p.includes('agreementdate') || p.includes('contractdate') || p.includes('leasedate') || p.includes('tenancydate')) {
      if (entities.legalDates && entities.legalDates.length > 0) return entities.legalDates[0];
      return match;
    }
    if (p.includes('date') || p === 'currentdate' || p === 'today') {
      if (entities.legalDates && entities.legalDates.length > 0) return entities.legalDates[0];
      if (entities.dates && entities.dates.length > 0) return entities.dates[0];
      if (p === 'currentdate' || p === 'today') {
        return new Date().toLocaleDateString();
      }
      return match;
    }

    return match;
  });
}

// Helper to merge all entities from all documents
export function mergeExtractedEntities(docs: Array<{ analysis?: DocumentAnalyzerResponse }>): ExtractedEntities {
  const merged: ExtractedEntities = {
    names: [],
    dates: [],
    addresses: [],
    amounts: [],
    depositValues: [],
    agreementNumbers: [],
    phoneNumbers: [],
    emailAddresses: [],
    legalDates: []
  };

  docs.forEach(doc => {
    const ent = doc.analysis?.entities;
    if (!ent) return;

    // Check if the document is classified as a legal document (i.e. detectedDocType is in ALLOWED_LEGAL_DOC_TYPES)
    const docType = doc.analysis?.detectedDocType || 'Other';
    const isLegalDoc = ALLOWED_LEGAL_DOC_TYPES.includes(docType);

    if (isLegalDoc) {
      if (ent.names) merged.names = Array.from(new Set([...(merged.names || []), ...ent.names]));
      if (ent.addresses) merged.addresses = Array.from(new Set([...(merged.addresses || []), ...ent.addresses]));
      if (ent.depositValues) merged.depositValues = Array.from(new Set([...(merged.depositValues || []), ...ent.depositValues]));
      if (ent.amounts) merged.amounts = Array.from(new Set([...(merged.amounts || []), ...ent.amounts]));
      if (ent.agreementNumbers) merged.agreementNumbers = Array.from(new Set([...(merged.agreementNumbers || []), ...ent.agreementNumbers]));
      if (ent.dates) merged.legalDates = Array.from(new Set([...(merged.legalDates || []), ...ent.dates]));
    }

    if (ent.dates) merged.dates = Array.from(new Set([...(merged.dates || []), ...ent.dates]));
    if (ent.phoneNumbers) merged.phoneNumbers = Array.from(new Set([...(merged.phoneNumbers || []), ...ent.phoneNumbers]));
    if (ent.emailAddresses) merged.emailAddresses = Array.from(new Set([...(merged.emailAddresses || []), ...ent.emailAddresses]));
  });

  return merged;
}

function getEvidenceCategoryFromDocType(docType: string): 'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos' | null {
  const dt = docType.toLowerCase().trim();
  
  // Strict matching for specific document types
  if (dt === 'rent agreement' || 
      dt === 'lease agreement' || 
      dt === 'agreement' || 
      dt === 'contract' || 
      dt === 'employment contract' || 
      dt === 'sale deed' || 
      dt === 'property agreement') {
    return 'rent';
  }
  if (dt === 'bank receipt' || dt === 'bank statement') {
    return 'bank';
  }
  if (dt === 'whatsapp screenshot' || dt === 'email' || dt === 'sms') {
    return 'comm';
  }
  if (dt === 'property handover') {
    return 'handover';
  }
  if (dt === 'witness statement') {
    return 'witness';
  }
  if (dt === 'photos' || dt === 'video') {
    return 'photos';
  }
  if (dt === 'legal notice' || dt === 'other' || dt === 'fir' || dt === 'complaint' || dt === 'government notice') {
    return null;
  }

  // Fallback checks with safe priorities to avoid incorrect matches
  if (dt.includes('witness')) {
    return 'witness';
  }
  if (dt.includes('rent') || dt.includes('lease') || dt.includes('employment') || dt.includes('contract') || dt.includes('agreement')) {
    return 'rent';
  }
  if (dt.includes('bank') || dt.includes('receipt') || dt.includes('transaction') || dt.includes('statement') || dt.includes('payment') || dt.includes('utr') || dt.includes('transfer')) {
    return 'bank';
  }
  if (dt.includes('whatsapp') || dt.includes('chat') || dt.includes('email') || dt.includes('sms') || dt.includes('message') || dt.includes('communication') || dt.includes('correspondence')) {
    return 'comm';
  }
  if (dt.includes('handover') || dt.includes('possession') || dt.includes('moveout') || dt.includes('move-out') || dt.includes('vacat')) {
    return 'handover';
  }
  if (dt.includes('photo') || dt.includes('video') || dt.includes('image') || dt.includes('screenshot')) {
    return 'photos';
  }
  
  return null;
}


function detectAttachedEvidenceInNotice(text: string): {
  rent?: boolean;
  bank?: boolean;
  comm?: boolean;
  handover?: boolean;
  witness?: boolean;
  photos?: boolean;
} {
  const t = text.toLowerCase();
  
  const hasAttachment = (keywords: string[]) => {
    return keywords.some(kw => {
      return t.includes(`attached ${kw}`) || 
             t.includes(`annexed ${kw}`) || 
             t.includes(`enclosed ${kw}`) ||
             t.includes(`${kw} attached`) || 
             t.includes(`${kw} annexed`) || 
             t.includes(`${kw} enclosed`) ||
             t.includes(`copy of ${kw}`) ||
             t.includes(`copy of the ${kw}`);
    });
  };

  return {
    rent: hasAttachment(['rent agreement', 'lease agreement', 'agreement', 'contract', 'employment contract', 'offer letter']),
    bank: hasAttachment(['receipt', 'bank statement', 'transaction statement', 'payment confirmation', 'transfer proof', 'bank proof', 'utr']),
    comm: hasAttachment(['whatsapp', 'email', 'chat', 'message', 'correspondence', 'sms']),
    handover: hasAttachment(['handover', 'possession receipt', 'vacate certificate', 'move-out proof', 'move out proof']),
    witness: hasAttachment(['witness statement', 'witness declaration', 'witness confirmation']),
    photos: hasAttachment(['photo', 'photograph', 'video', 'image', 'screenshot'])
  };
}

// Helper to automatically verify checklist and compute score based on conversation messages
// Helper to detect case category dynamically
export function detectCaseCategory(
  checklist: CaseChecklistItem[],
  messages: Message[]
): 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general' {
  // 1. Check checklist labels first, ignoring generic ones
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

  // 2. Check user messages next
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
}// Helper to automatically verify checklist and compute score based on conversation messages
export function autoVerifyChecklistAndScore(
  messages: Message[], 
  currentChecklist: CaseChecklistItem[],
  uploadedDoc?: Chat['uploadedDoc'],
  uploadedDocs?: Chat['uploadedDocs']
): {
  checklist: CaseChecklistItem[];
  caseStrength: CaseStrength;
} {
  // If the active/latest document is a non-legal document, bypass verification and return default/empty state
  if (uploadedDoc?.analysis?.detectedDocType === 'Other') {
    const resetChecklist = currentChecklist.map(item => ({ ...item, checked: false }));
    return {
      checklist: resetChecklist,
      caseStrength: {
        score: 15,
        riskLevel: 'High' as const,
        riskFactors: [
          'Initial details pending. Case strength score will adjust once incident context is provided.'
        ]
      }
    };
  }

  const caseCategory = detectCaseCategory(currentChecklist, messages);
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  const detectedTypes = new Set<string>();

  // 1. Scan user messages for text-based keywords (chat query verification)
  if (caseCategory === 'employment') {
    if (userText.includes('offer letter') || userText.includes('employment contract') || userText.includes('appointment letter') || userText.includes('employment agreement') || userText.includes('joining letter')) {
      detectedTypes.add('Employment Offer Letter');
    }
    if (userText.includes('salary slip') || userText.includes('payslip') || userText.includes('salary slips') || userText.includes('payslips')) {
      detectedTypes.add('Salary Slips');
    }
    if (userText.includes('bank statement') || userText.includes('bank statements') || userText.includes('bank transfer') || userText.includes('wages') || userText.includes('salary')) {
      detectedTypes.add('Bank Statements');
    }
    if (userText.includes('hr email') || userText.includes('hr emails') || userText.includes('email conversations with hr') || userText.includes('emails with hr') || userText.includes('hr correspondence') || userText.includes('email with hr') || userText.includes('email') || userText.includes('emails')) {
      detectedTypes.add('HR Email Correspondence');
    }
    if (userText.includes('termination letter') || userText.includes('termination notice')) {
      detectedTypes.add('Termination Letter');
    }
    if (userText.includes('attendance') || userText.includes('timesheet') || userText.includes('attendance records')) {
      detectedTypes.add('Attendance Records');
    }
    if (userText.includes('witness statement') || userText.includes('witness')) {
      detectedTypes.add('Witness Statement');
    }
    if (userText.includes('screenshots') || userText.includes('screenshot') || userText.includes('photo') || userText.includes('image')) {
      detectedTypes.add('Screenshots / Visual Evidence');
    }
  } else if (caseCategory === 'landlord') {
    if (userText.includes('rent agreement') || userText.includes('lease agreement') || userText.includes('tenancy agreement') || userText.includes('rental agreement') || userText.includes('written lease') || userText.includes('lease contract') || userText.includes('written agreement')) {
      detectedTypes.add('Rent Agreement');
    }
    if (userText.includes('bank transfer proof') || userText.includes('bank transfer') || userText.includes('payment proof') || userText.includes('transaction proof') || userText.includes('payment receipt') || userText.includes('transaction id')) {
      detectedTypes.add('Bank Transfer Proof');
    }
    if (userText.includes('whatsapp messages') || userText.includes('whatsapp chat logs') || userText.includes('whatsapp chats') || userText.includes('whatsapp') || userText.includes('chat logs') || userText.includes('chat history')) {
      detectedTypes.add('WhatsApp Chat Logs');
    }
    if (userText.includes('property handover') || userText.includes('handover document') || userText.includes('handover')) {
      detectedTypes.add('Property Handover Document');
    }
    if (userText.includes('witness statement') || userText.includes('witness declarations') || userText.includes('witness')) {
      detectedTypes.add('Witness Statement');
    }
    if (userText.includes('screenshots') || userText.includes('screenshot') || userText.includes('photo') || userText.includes('image')) {
      detectedTypes.add('Screenshots / Visual Evidence');
    }
    if (userText.includes('deposit receipt') || userText.includes('deposit receipts')) {
      detectedTypes.add('Deposit Receipts');
    }
  } else if (caseCategory === 'consumer') {
    if (userText.includes('invoice') || userText.includes('bill')) {
      detectedTypes.add('Invoice');
    }
    if (userText.includes('receipt') || userText.includes('payment receipt') || userText.includes('payment proof') || userText.includes('bank transfer')) {
      detectedTypes.add('Receipt');
    }
    if (userText.includes('complaint communication') || userText.includes('complaint email') || userText.includes('complaint chat') || userText.includes('communication') || userText.includes('email') || userText.includes('chat') || userText.includes('whatsapp')) {
      detectedTypes.add('Email Correspondence');
    }
  } else if (caseCategory === 'cyber') {
    if (userText.includes('fir') || userText.includes('police complaint') || userText.includes('first information report')) {
      detectedTypes.add('Police FIR');
    }
    if (userText.includes('transaction records') || userText.includes('bank transaction') || userText.includes('transaction id') || userText.includes('bank statement') || userText.includes('bank transfer') || userText.includes('transaction') || userText.includes('debit') || userText.includes('upi')) {
      detectedTypes.add('Bank Transaction Records');
    }
    if (userText.includes('chat logs') || userText.includes('chat log') || userText.includes('chats') || userText.includes('telegram') || userText.includes('messages') || userText.includes('whatsapp')) {
      detectedTypes.add('WhatsApp Chat Logs');
    }
    if (userText.includes('call logs') || userText.includes('call log')) {
      detectedTypes.add('Call Logs');
    }
    if (userText.includes('email evidence') || userText.includes('email correspondence') || userText.includes('email') || userText.includes('emails')) {
      detectedTypes.add('Email Correspondence');
    }
    if (userText.includes('screenshots') || userText.includes('screenshot') || userText.includes('photo') || userText.includes('image')) {
      detectedTypes.add('Screenshots / Visual Evidence');
    }
    if (userText.includes('identity documents') || userText.includes('identity') || userText.includes('id documents') || userText.includes('government id')) {
      detectedTypes.add('Identity Documents');
    }
  } else {
    // general fallback
    if (userText.includes('rent agreement') || userText.includes('lease agreement') || userText.includes('tenancy agreement') || userText.includes('rental agreement') || userText.includes('written lease') || userText.includes('lease contract')) {
      detectedTypes.add('Rent Agreement');
    }
    if (userText.includes('offer letter') || userText.includes('employment contract') || userText.includes('appointment letter')) {
      detectedTypes.add('Employment Offer Letter');
    }
    if (userText.includes('fir') || userText.includes('police complaint') || userText.includes('first information report')) {
      detectedTypes.add('Police FIR');
    }
    if (userText.includes('bank transfer proof') || userText.includes('bank transfer') || userText.includes('payment proof') || userText.includes('transaction proof') || userText.includes('payment receipt')) {
      detectedTypes.add('Bank Transfer Proof');
    }
    if (userText.includes('salary slips') || userText.includes('salary slip') || userText.includes('payslip')) {
      detectedTypes.add('Salary Slips');
    }
    if (userText.includes('bank statements') || userText.includes('bank statement')) {
      detectedTypes.add('Bank Statements');
    }
    if (userText.includes('whatsapp messages') || userText.includes('whatsapp chat logs') || userText.includes('whatsapp')) {
      detectedTypes.add('WhatsApp Chat Logs');
    }
    if (userText.includes('hr emails') || userText.includes('hr email')) {
      detectedTypes.add('HR Email Correspondence');
    }
    if (userText.includes('email evidence') || userText.includes('email conversations') || userText.includes('email')) {
      detectedTypes.add('Email Correspondence');
    }
    if (userText.includes('property handover') || userText.includes('handover')) {
      detectedTypes.add('Property Handover Document');
    }
    if (userText.includes('witness statement') || userText.includes('witness')) {
      detectedTypes.add('Witness Statement');
    }
    if (userText.includes('screenshots') || userText.includes('screenshot') || userText.includes('photo')) {
      detectedTypes.add('Screenshots / Visual Evidence');
    }
  }

  // 2. Scan uploaded documents for type-based detection (Strict one-to-one mapping, NO keyword scanning on document text!)
  const docsToScan: Array<{ name: string; type: string; text: string; analysis?: DocumentAnalyzerResponse }> = [];
  if (uploadedDocs && uploadedDocs.length > 0) {
    docsToScan.push(...uploadedDocs);
  } else if (uploadedDoc) {
    docsToScan.push(uploadedDoc);
  }

  docsToScan.forEach(doc => {
    // Verification must strictly require a valid detectedDocType from the document analyzer
    let docType = doc.analysis?.detectedDocType;

    if (!docType || docType === 'Other' || docType === 'Legal Notice') {
      return;
    }

    // Helper validation functions for secondary confirmation
    const validateRentAgreement = (d: any) => {
      if (!d.analysis) return true;
      const entities = d.analysis.entities;
      const hasEntities = entities && (
        (entities.agreementNumbers && entities.agreementNumbers.length > 0) ||
        (entities.depositValues && entities.depositValues.length > 0) ||
        (entities.addresses && entities.addresses.length > 0) ||
        (entities.names && entities.names.length > 0)
      );
      const hasClauses = d.analysis.clauses && d.analysis.clauses.length > 0;
      const summary = (d.analysis.summary || '').toLowerCase();
      const hasKeywords = summary.includes('rent') || summary.includes('lease') || summary.includes('agreement') || summary.includes('contract') || summary.includes('tenancy') || summary.includes('landlord') || summary.includes('tenant');
      return !!(hasEntities || hasClauses || hasKeywords || !entities);
    };

    const validateBankProof = (d: any) => {
      if (!d.analysis) return true;
      const entities = d.analysis.entities;
      const hasEntities = entities && (
        (entities.amounts && entities.amounts.length > 0) ||
        (entities.depositValues && entities.depositValues.length > 0) ||
        (entities.dates && entities.dates.length > 0)
      );
      const summary = (d.analysis.summary || '').toLowerCase();
      const hasKeywords = summary.includes('bank') || summary.includes('receipt') || summary.includes('statement') || summary.includes('payment') || summary.includes('transaction') || summary.includes('slip') || summary.includes('salary');
      return !!(hasEntities || hasKeywords || !entities);
    };

    const validateCommunication = (d: any) => {
      if (!d.analysis) return true;
      const entities = d.analysis.entities;
      const hasEntities = entities && (
        (entities.phoneNumbers && entities.phoneNumbers.length > 0) ||
        (entities.emailAddresses && entities.emailAddresses.length > 0) ||
        (entities.dates && entities.dates.length > 0)
      );
      const summary = (d.analysis.summary || '').toLowerCase();
      const hasKeywords = summary.includes('whatsapp') || summary.includes('chat') || summary.includes('email') || summary.includes('sms') || summary.includes('message') || summary.includes('correspondence') || summary.includes('conversation');
      return !!(hasEntities || hasKeywords || !entities);
    };

    const validateHandover = (d: any) => {
      if (!d.analysis) return true;
      const entities = d.analysis.entities;
      const hasEntities = entities && (
        (entities.addresses && entities.addresses.length > 0) ||
        (entities.names && entities.names.length > 0) ||
        (entities.dates && entities.dates.length > 0)
      );
      const summary = (d.analysis.summary || '').toLowerCase();
      const hasKeywords = summary.includes('handover') || summary.includes('possession') || summary.includes('move') || summary.includes('delivery') || summary.includes('vacat') || summary.includes('discharge');
      return !!(hasEntities || hasKeywords || !entities);
    };

    const validateWitness = (d: any) => {
      if (!d.analysis) return true;
      const entities = d.analysis.entities;
      const hasEntities = entities && (
        (entities.names && entities.names.length > 0) ||
        (entities.dates && entities.dates.length > 0)
      );
      const summary = (d.analysis.summary || '').toLowerCase();
      const hasKeywords = summary.includes('witness') || summary.includes('statement') || summary.includes('declaration') || summary.includes('neighbour') || summary.includes('neighbor');
      return !!(hasEntities || hasKeywords || !entities);
    };

    // Strict one-to-one document type verification checks (no cross-category leakage)
    if (docType === 'Rent Agreement' || docType === 'Lease Agreement') {
      if ((caseCategory === 'landlord' || caseCategory === 'general') && validateRentAgreement(doc)) {
        detectedTypes.add('Rent Agreement');
      }
    } else if (docType === 'Employment Contract') {
      if ((caseCategory === 'employment' || caseCategory === 'general') && validateRentAgreement(doc)) {
        detectedTypes.add('Employment Offer Letter');
      }
    } else if (docType === 'Invoice') {
      if ((caseCategory === 'consumer' || caseCategory === 'general') && validateRentAgreement(doc)) {
        detectedTypes.add('Invoice');
      }
    } else if (docType === 'FIR') {
      if ((caseCategory === 'cyber' || caseCategory === 'general') && validateRentAgreement(doc)) {
        detectedTypes.add('Police FIR');
      }
    } else if (docType === 'Bank Receipt' || docType === 'Bank Statement') {
      if (validateBankProof(doc)) {
        if (caseCategory === 'employment') {
          detectedTypes.add('Bank Statements');
        } else if (caseCategory === 'consumer') {
          detectedTypes.add('Receipt');
        } else if (caseCategory === 'cyber') {
          detectedTypes.add('Bank Transaction Records');
        } else {
          detectedTypes.add('Bank Transfer Proof');
        }
      }
    } else if (docType === 'WhatsApp Screenshot' || docType === 'Email' || docType === 'SMS') {
      if (validateCommunication(doc)) {
        if (caseCategory === 'employment') {
          detectedTypes.add('HR Email Correspondence');
        } else if (caseCategory === 'consumer') {
          detectedTypes.add('Email Correspondence');
        } else {
          detectedTypes.add('WhatsApp Chat Logs');
        }
      }
    } else if (docType === 'Property Handover') {
      if (validateHandover(doc)) {
        if (caseCategory === 'landlord' || caseCategory === 'general') {
          detectedTypes.add('Property Handover Document');
        } else if (caseCategory === 'employment' || caseCategory === 'cyber') {
          detectedTypes.add('Discharge / Handover Proof');
        } else if (caseCategory === 'consumer') {
          detectedTypes.add('Product Return Proof');
        }
      }
    } else if (docType === 'Witness Statement') {
      if (validateWitness(doc)) {
        detectedTypes.add('Witness Statement');
      }
    } else if (docType === 'Photos' || docType === 'Video') {
      detectedTypes.add('Screenshots / Visual Evidence');
    }
  });

  function getCategoryOfEvidenceType(type: string): 'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos' | null {
    if (type === 'Rent Agreement' || type === 'Employment Offer Letter' || type === 'Invoice' || type === 'Police FIR') return 'rent';
    if (type === 'Bank Transfer Proof' || type === 'Salary Slips' || type === 'Bank Statements' || type === 'Bank Transaction Records' || type === 'Receipt') return 'bank';
    if (type === 'WhatsApp Chat Logs' || type === 'HR Email Correspondence' || type === 'Call Logs' || type === 'Email Correspondence') return 'comm';
    if (type === 'Property Handover Document' || type === 'Discharge / Handover Proof' || type === 'Product Return Proof') return 'handover';
    if (type === 'Witness Statement') return 'witness';
    if (type === 'Screenshots / Visual Evidence') return 'photos';
    return null;
  }

  const DEFAULT_LABELS_MAP: Record<'landlord' | 'employment' | 'consumer' | 'cyber' | 'general', Record<string, string>> = {
    landlord: {
      rent: "Rent Agreement",
      bank: "Bank Transfer Proof",
      comm: "WhatsApp Messages",
      handover: "Property Handover Document",
      witness: "Witness statement/declaration",
      photos: "Screenshots / Visual Evidence"
    },
    employment: {
      rent: "Employment Offer Letter",
      bank: "Salary Slips",
      comm: "HR Emails",
      handover: "Discharge / Handover Proof",
      witness: "Witness statement/declaration",
      photos: "Screenshots / Visual Evidence"
    },
    consumer: {
      rent: "Invoice",
      bank: "Receipt",
      comm: "Complaint Communication",
      handover: "Product Return Proof",
      witness: "Witness statement/declaration",
      photos: "Screenshots / Visual Evidence"
    },
    cyber: {
      rent: "FIR",
      bank: "Transaction Records",
      comm: "Chat Logs",
      photos: "Screenshots",
      handover: "Discharge / Handover Proof",
      witness: "Witness statement/declaration"
    },
    general: {
      rent: "Written Lease/Purchase/Employment Agreement",
      bank: "Proof of Transactions (Receipts/Statements)",
      comm: "Correspondence Logs (Emails/Chats)",
      handover: "Property handover document",
      witness: "Witness statement/declaration",
      photos: "Screenshots / Visual Evidence"
    }
  };

  const DEFAULT_LABELS = DEFAULT_LABELS_MAP[caseCategory];

  // Set to keep track of categories of detected types
  const detectedCategories = new Set<'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos'>();
  detectedTypes.forEach(type => {
    const cat = getCategoryOfEvidenceType(type);
    if (cat) {
      detectedCategories.add(cat);
    }
  });

  // Map currentChecklist and set checked status while preserving the full structure
  const matchedChecklist = currentChecklist.map(item => {
    const itemCat = mapLabelToCategory(item.label);
    const isVerified = itemCat !== null && detectedCategories.has(itemCat);
    return {
      ...item,
      checked: isVerified
    };
  });

  // Check if there are any detected types whose category is NOT represented in the checklist.
  // If so, append them to the checklist as checked.
  const existingCategories = new Set(
    currentChecklist.map(item => mapLabelToCategory(item.label)).filter((c): c is 'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos' => c !== null)
  );

  const updatedChecklist = [...matchedChecklist];
  detectedTypes.forEach(type => {
    const cat = getCategoryOfEvidenceType(type);
    if (cat && !existingCategories.has(cat)) {
      const label = DEFAULT_LABELS[cat] || type;
      updatedChecklist.push({
        id: `chk-dyn-${updatedChecklist.length}-${Date.now()}`,
        label,
        checked: true
      });
      existingCategories.add(cat); // prevent duplicate additions
    }
  });

  // Calculate score and risk based on verified checklist items
  const verifiedCount = updatedChecklist.filter(item => item.checked).length;
  let score = 15; // default if no evidence

  const rentVerified = detectedTypes.has('Rent Agreement') || detectedTypes.has('Employment Offer Letter') || detectedTypes.has('Invoice') || detectedTypes.has('Police FIR');
  const bankVerified = detectedTypes.has('Bank Transfer Proof') || detectedTypes.has('Salary Slips') || detectedTypes.has('Bank Statements') || detectedTypes.has('Bank Transaction Records') || detectedTypes.has('Receipt');
  const commVerified = detectedTypes.has('WhatsApp Chat Logs') || detectedTypes.has('HR Email Correspondence') || detectedTypes.has('Email Correspondence') || detectedTypes.has('Call Logs');
  const handoverVerified = detectedTypes.has('Property Handover Document') || detectedTypes.has('Discharge / Handover Proof') || detectedTypes.has('Product Return Proof');
  const witnessVerified = detectedTypes.has('Witness Statement');
  const photosVerified = detectedTypes.has('Screenshots / Visual Evidence');

  const hasLandlordKeywords = userText.includes('landlord') || userText.includes('tenant') || userText.includes('rent') || userText.includes('lease') || userText.includes('deposit') || userText.includes('flat') || userText.includes('property');
  const isLandlordCase = rentVerified && hasLandlordKeywords;

  let generalScore = 15;
  if (verifiedCount === 1) generalScore = 40;
  else if (verifiedCount === 2) generalScore = 65;
  else if (verifiedCount === 3) generalScore = 80;
  else if (verifiedCount === 4) generalScore = 90;
  else if (verifiedCount === 5) generalScore = 93;
  else if (verifiedCount >= 6) generalScore = 95;

  let landlordScore = 15;
  if (isLandlordCase) {
    if (commVerified && bankVerified && (handoverVerified || witnessVerified || photosVerified)) {
      landlordScore = 95;
    } else if (commVerified && bankVerified) {
      landlordScore = 85;
    } else if (commVerified) {
      landlordScore = 65;
    } else {
      landlordScore = 45;
    }
  }

  score = isLandlordCase ? Math.max(generalScore, landlordScore) : generalScore;

  // Determine risk level
  let riskLevel: 'High' | 'Medium' | 'Strong Case' = 'High';
  if (score > 70) {
    riskLevel = 'Strong Case';
  } else if (score > 40) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'High';
  }

  // Compile risk factors dynamically based on what is missing
  const riskFactors: string[] = [];
  const hasHandover = updatedChecklist.some(item => mapLabelToCategory(item.label) === 'handover');
  const hasWitness = updatedChecklist.some(item => mapLabelToCategory(item.label) === 'witness');

  // --- Dynamic Entity Checks for Deposit Value Mismatches ---
  let depositMismatchFound = false;
  let mismatchDetail = '';
  const rentDepositValues: number[] = [];
  const bankReceiptAmounts: number[] = [];

  docsToScan.forEach(doc => {
    const docType = doc.analysis?.detectedDocType;
    const entities = doc.analysis?.entities;
    if (!entities) return;
    
    // Helper to parse numbers
    const extractNumbers = (strList?: string[]) => {
      if (!strList) return [];
      return strList
        .map(s => {
          const cleaned = s.replace(/[^0-9.]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? null : num;
        })
        .filter((n): n is number => n !== null);
    };

    if (docType === 'Rent Agreement') {
      rentDepositValues.push(...extractNumbers(entities.depositValues));
      if (rentDepositValues.length === 0) {
        rentDepositValues.push(...extractNumbers(entities.amounts));
      }
    } else if (docType === 'Bank Receipt') {
      bankReceiptAmounts.push(...extractNumbers(entities.amounts));
      if (bankReceiptAmounts.length === 0) {
        bankReceiptAmounts.push(...extractNumbers(entities.depositValues));
      }
    }
  });

  if (rentDepositValues.length > 0 && bankReceiptAmounts.length > 0) {
    const hasMatch = rentDepositValues.some(rv => bankReceiptAmounts.some(bv => Math.abs(rv - bv) < 1.0));
    if (!hasMatch) {
      depositMismatchFound = true;
      let agreementRaw = '';
      let bankRaw = '';
      docsToScan.forEach(doc => {
        const docType = doc.analysis?.detectedDocType;
        const entities = doc.analysis?.entities;
        if (docType === 'Rent Agreement') {
          agreementRaw = entities?.depositValues?.[0] || entities?.amounts?.[0] || '';
        } else if (docType === 'Bank Receipt') {
          bankRaw = entities?.amounts?.[0] || entities?.depositValues?.[0] || '';
        }
      });
      mismatchDetail = `Deposit value mismatch: Rent Agreement specifies ${agreementRaw || rentDepositValues[0]}, but Bank Receipt shows payment of ${bankRaw || bankReceiptAmounts[0]}.`;
    }
  } else if (rentDepositValues.length > 0 && bankVerified && bankReceiptAmounts.length === 0) {
    depositMismatchFound = true;
    mismatchDetail = 'Deposit amount could not be verified from transactions.';
  }

  if (depositMismatchFound) {
    riskFactors.push(mismatchDetail);
    score = Math.max(15, score - 15);
    if (score > 70) riskLevel = 'Strong Case';
    else if (score > 40) riskLevel = 'Medium';
    else riskLevel = 'High';
  }

  if (!rentVerified) {
    riskFactors.push('Written agreement / contract is not verified.');
  }
  if (!bankVerified) {
    riskFactors.push('Proof of bank transactions or payment is missing.');
  }
  if (!commVerified) {
    riskFactors.push('Official communication records or chat history not verified.');
  }
  if (!handoverVerified && hasHandover) {
    riskFactors.push('Official delivery or possession handover proof pending.');
  }
  if (!witnessVerified && hasWitness) {
    riskFactors.push('Witness statements or neighbour confirmation not verified.');
  }
  if (riskFactors.length === 0) {
    riskFactors.push('No significant evidence risks identified. All key evidence categories verified.');
  }

  console.log("DETECTED_EVIDENCE", Array.from(detectedTypes));
  console.log("GENERATED_CHECKLIST", currentChecklist.map(i => i.label));
  console.log("VERIFIED_ITEMS", updatedChecklist.filter(i => i.checked).map(i => i.label));
  console.log("SCORING_INPUT", verifiedCount);
  console.log("FINAL_SCORE", score);

  return {
    checklist: updatedChecklist,
    caseStrength: {
      score,
      riskLevel,
      riskFactors
    }
  };
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastOrchestratorResponse, setLastOrchestratorResponse] = useState<any>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [language, setLanguageState] = useState<'en' | 'hi' | 'gu'>('en');

  // Initialize and load from LocalStorage
  useEffect(() => {
    const savedChats = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_CHAT_KEY);
    const savedLang = localStorage.getItem('nyaya-lang');

    if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'gu')) {
      setLanguageState(savedLang);
    }

    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        setChats(parsed);
        if (savedActiveId && parsed.some((c: Chat) => c.id === savedActiveId)) {
          setActiveChatId(savedActiveId);
        } else if (parsed.length > 0) {
          setActiveChatId(parsed[0].id);
        }
      } catch (e) {
        console.error('Error parsing saved chats', e);
        setChats(INITIAL_MOCK_CHATS);
        setActiveChatId(INITIAL_MOCK_CHATS[0].id);
      }
    } else {
      setChats(INITIAL_MOCK_CHATS);
      setActiveChatId(INITIAL_MOCK_CHATS[0].id);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: 'en' | 'hi' | 'gu') => {
    setLanguageState(lang);
    localStorage.setItem('nyaya-lang', lang);
  };

  // Save to LocalStorage whenever chats or activeChatId changes
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chats));
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY);
    }
  }, [chats, activeChatId, mounted]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const createChat = (title?: string) => {
    const newId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newId,
      title: title || 'New Case Inquiry',
      createdAt: new Date().toISOString(),
      messages: [],
      checklist: [
        { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
        { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
        { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
        { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
      ],
      caseStrength: {
        score: 40,
        riskLevel: 'Medium',
        riskFactors: [
          'Initial details pending. Case strength score will adjust once incident context is provided.'
        ]
      },
      timeline: [
        {
          id: 't-n-1',
          title: 'Initial Consultation',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          description: 'NyayaAI intake chat session started.',
          status: 'current'
        },
        {
          id: 't-n-2',
          title: 'Fact Verification',
          date: 'TBD',
          description: 'Review supporting evidence items checklist.',
          status: 'upcoming'
        },
        {
          id: 't-n-3',
          title: 'Draft demand / representation',
          date: 'TBD',
          description: 'Document assembly in the Legal Toolkit.',
          status: 'upcoming'
        }
      ],
      generatedDocs: [],
      summary: {
        overview: 'Please detail your legal inquiry in the chat window. NyayaAI will compile an executive case summary here.',
        legalProvisions: [],
        nextAction: 'Explain the facts of your dispute to generate action items.'
      }
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    return newId;
  };

  const deleteChat = (id: string) => {
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeChatId === id) {
        if (filtered.length > 0) {
          setActiveChatId(filtered[0].id);
        } else {
          setActiveChatId(null);
        }
      }
      return filtered;
    });
  };

  const selectChat = (id: string) => {
    setActiveChatId(id);
  };

  const sendMessage = async (content: string) => {
    if (!activeChatId || !content.trim()) return;

    // 1. Add user message to active chat
    const userMsg: Message = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let currentMessages: Message[] = [];
    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c.id === activeChatId) {
          const updatedTitle = c.messages.length === 0 
            ? (content.length > 25 ? content.substring(0, 25) + '...' : content)
            : c.title;

          const newMsgs = [...c.messages, userMsg];
          currentMessages = newMsgs;

          const verified = autoVerifyChecklistAndScore(newMsgs, c.checklist, c.uploadedDoc, c.uploadedDocs);

          return {
            ...c,
            title: updatedTitle,
            messages: newMsgs,
            checklist: verified.checklist,
            caseStrength: verified.caseStrength
          };
        }
        return c;
      });
    });

    // 2. Trigger typing indicator
    setIsTyping(true);

    try {
      // 3. Compile history context for Server Action
      const historyContext = currentMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      // 4. Run orchestration pipeline server-side
      const response = await runLegalAssessment(content, historyContext, language);
      setLastOrchestratorResponse(response);
      console.log('[DEBUG-CLIENT-RECEIVED] Orchestrator Output:', response);

      if ('error' in response) {
        throw new Error(response.error);
      }

      // 5. Create assistant response message
      const assistantMsg: Message = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        content: response.advice.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            // Update title to categories if it was a default title
            const isInitialTitle = c.title === 'New Case Inquiry' || c.title.endsWith('...');
            const updatedTitle = isInitialTitle ? response.category : c.title;

            // Map evidence checklist and keep already checked states if matching, tracking matched existing items to prevent duplicates
            const usedExistingIds = new Set<string>();
            const mappedChecklist = response.actions.checklist.map((label) => {
              const newCat = mapLabelToCategory(label);
              const existing = c.checklist.find((item) => {
                if (usedExistingIds.has(item.id)) return false;
                if (item.label.toLowerCase() === label.toLowerCase()) return true;
                const existingCat = mapLabelToCategory(item.label);
                return newCat !== null && existingCat === newCat;
              });
              if (existing) {
                usedExistingIds.add(existing.id);
              }
              return {
                id: existing?.id || generateUniqueId('chk'),
                label,
                checked: existing?.checked || false
              };
            });

            // Map timeline events
            const mappedTimeline = response.actions.timeline.map((step, idx) => ({
              id: generateUniqueId('timeline'),
              title: step.action,
              date: step.day,
              description: step.description,
              status: idx === 0 
                ? ('completed' as const) 
                : idx === 1 
                  ? ('current' as const) 
                  : ('upcoming' as const)
            }));

            const allMsgs = [...c.messages, assistantMsg];
            const verified = autoVerifyChecklistAndScore(allMsgs, mappedChecklist, c.uploadedDoc, c.uploadedDocs);

            // Construct a temp updated chat object to check hasEnoughVerifiedInfo
            const tempUpdatedChat = {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength
            };
            const hasVerifiedInfo = hasEnoughVerifiedInfo(tempUpdatedChat);

            // Map generated document templates
            const mergedEntities = mergeExtractedEntities(c.uploadedDocs || (c.uploadedDoc ? [c.uploadedDoc] : []));
            const mappedDocs = response.actions.documents.map((doc) => ({
              id: generateUniqueId('doc'),
              title: doc.title,
              type: doc.type,
              date: new Date().toLocaleDateString(),
              previewText: autoFillPlaceholders(doc.previewText, mergedEntities),
              templateText: doc.previewText
            }));

            return {
              ...c,
              title: updatedTitle,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength,
              timeline: mappedTimeline,
              generatedDocs: mappedDocs,
              summary: {
                overview: response.actions.summary,
                legalProvisions: response.actions.legalProvisions,
                nextAction: response.actions.nextAction
              }
            };
          }
          return c;
        });
      });
    } catch (e: any) {
      console.error('Orchestrator assessment failure:', e);
      setLastOrchestratorResponse({ error: e.message || 'Failed to complete legal analysis.' });

      const errMsgStr = e.message || 'Failed to complete legal analysis.';
      const isQuotaOrServiceIssue = 
        /503|429|quota|rate\s*limit|overloaded|unavailable|capacity/i.test(errMsgStr);

      if (isQuotaOrServiceIssue) {
        setIsQuotaExhausted(true);
      }

      const displayMsg = isQuotaOrServiceIssue
        ? "AI service is temporarily unavailable due to API quota limits. Please try again later."
        : `Connection error: ${errMsgStr} Please ensure your GEMINI_API_KEY environment variable is configured in a .env.local file.`;

      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: displayMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            const allMsgs = [...c.messages, errMsg];
            const verified = autoVerifyChecklistAndScore(allMsgs, c.checklist, c.uploadedDoc, c.uploadedDocs);
            return {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength
            };
          }
          return c;
        });
      });
    } finally {
      setIsTyping(false);
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    if (!activeChatId) return;
    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c.id === activeChatId) {
          const updatedChecklist = c.checklist.map((item) => {
            if (item.id === itemId) {
              return { ...item, checked: !item.checked };
            }
            return item;
          });

          // 1. Identify which categories are verified
          let rentVerified = false;
          let bankVerified = false;
          let commVerified = false;
          let handoverVerified = false;
          let witnessVerified = false;
          let photosVerified = false;

          updatedChecklist.forEach((item) => {
            if (item.checked) {
              const cat = mapLabelToCategory(item.label);
              if (cat === 'rent') rentVerified = true;
              if (cat === 'bank') bankVerified = true;
              if (cat === 'comm') commVerified = true;
              if (cat === 'handover') handoverVerified = true;
              if (cat === 'witness') witnessVerified = true;
              if (cat === 'photos') photosVerified = true;
            }
          });

          // 2. Dynamic scoring logic matching example
          const verifiedCount = updatedChecklist.filter((item) => item.checked).length;
          let score = 15; // default if no evidence
          if (rentVerified) {
            if (commVerified && bankVerified && (handoverVerified || witnessVerified || photosVerified)) {
              score = 95; // Rent agreement + chats + bank proof + other evidence (All evidence)
            } else if (commVerified && bankVerified) {
              score = 85; // Rent agreement + chats + bank proof
            } else if (commVerified) {
              score = 65; // Rent agreement + chats
            } else {
              score = 45; // Only rent agreement
            }
          } else {
            // If no rent agreement but other evidence, default count based score to pass existing unit tests
            if (verifiedCount === 1) score = 40;
            else if (verifiedCount === 2) score = 65;
            else if (verifiedCount === 3) score = 80;
            else if (verifiedCount >= 4) score = 90;
          }

          let riskLevel: 'High' | 'Medium' | 'Strong Case' = 'High';
          if (score > 70) {
            riskLevel = 'Strong Case';
          } else if (score > 40) {
            riskLevel = 'Medium';
          } else {
            riskLevel = 'High';
          }

          // Compile risk factors dynamically based on what is checked

          const riskFactors: string[] = [];
          if (!rentVerified) riskFactors.push('Written agreement / contract is not verified.');
          if (!bankVerified) riskFactors.push('Proof of bank transactions or payment is missing.');
          if (!commVerified) riskFactors.push('Official communication records or chat history not verified.');
          if (!handoverVerified) riskFactors.push('Official delivery or possession handover proof pending.');
          if (!witnessVerified) riskFactors.push('Witness statements or neighbour confirmation not verified.');
          if (riskFactors.length === 0) riskFactors.push('No significant evidence risks identified. All key evidence categories verified.');

          // Add Debug Logs for manual toggles as well
          console.log('[DEBUG-EVIDENCE-TOGGLE] === Manual Evidence Toggle ===');
          console.log('[DEBUG-EVIDENCE-TOGGLE] Checked Items:', updatedChecklist.filter(i => i.checked).map(i => i.label));
          console.log('[DEBUG-EVIDENCE-TOGGLE] Evidence Count:', verifiedCount);
          console.log('[DEBUG-EVIDENCE-TOGGLE] Final Score:', score);
          console.log('[DEBUG-EVIDENCE-TOGGLE] Risk Level:', riskLevel);

          return {
            ...c,
            checklist: updatedChecklist,
            caseStrength: {
              score,
              riskLevel,
              riskFactors
            }
          };
        }
        return c;
      });
    });
  };

  const regenerateLastMessage = async () => {
    if (!activeChatId) return;
    const currentChat = chats.find((c) => c.id === activeChatId);
    if (!currentChat || currentChat.messages.length < 2) return;

    // Find the last user query
    const messagesCopy = [...currentChat.messages];
    let lastUserMessageContent = '';

    for (let i = messagesCopy.length - 1; i >= 0; i--) {
      if (messagesCopy[i].role === 'user') {
        lastUserMessageContent = messagesCopy[i].content;
        break;
      }
    }

    if (!lastUserMessageContent) return;

    // Filter out the last assistant message
    const cleanMessages = messagesCopy.filter(
      (m) => m.id !== messagesCopy[messagesCopy.length - 1].id || m.role !== 'assistant'
    );

    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c.id === activeChatId) {
          const verified = autoVerifyChecklistAndScore(cleanMessages, c.checklist, c.uploadedDoc, c.uploadedDocs);
          return {
            ...c,
            messages: cleanMessages,
            checklist: verified.checklist,
            caseStrength: verified.caseStrength
          };
        }
        return c;
      });
    });

    setIsTyping(true);

    try {
      const historyContext = cleanMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await runLegalAssessment(lastUserMessageContent, historyContext, language);
      setLastOrchestratorResponse(response);
      console.log('[DEBUG-CLIENT-RECEIVED] Orchestrator Output (Regen):', response);

      if ('error' in response) {
        throw new Error(response.error);
      }

      const assistantMsg: Message = {
        id: `msg-a-regen-${Date.now()}`,
        role: 'assistant',
        content: `${response.advice.text}\n\n*(Regenerated response)*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            const usedExistingIds = new Set<string>();
            const mappedChecklist = response.actions.checklist.map((label) => {
              const newCat = mapLabelToCategory(label);
              const existing = c.checklist.find((item) => {
                if (usedExistingIds.has(item.id)) return false;
                if (item.label.toLowerCase() === label.toLowerCase()) return true;
                const existingCat = mapLabelToCategory(item.label);
                return newCat !== null && existingCat === newCat;
              });
              if (existing) {
                usedExistingIds.add(existing.id);
              }
              return {
                id: existing?.id || generateUniqueId('chk'),
                label,
                checked: existing?.checked || false
              };
            });

            const mappedTimeline = response.actions.timeline.map((step, idx) => ({
              id: generateUniqueId('timeline'),
              title: step.action,
              date: step.day,
              description: step.description,
              status: idx === 0 
                ? ('completed' as const) 
                : idx === 1 
                  ? ('current' as const) 
                  : ('upcoming' as const)
            }));

            const allMsgs = [...c.messages, assistantMsg];
            const verified = autoVerifyChecklistAndScore(allMsgs, mappedChecklist, c.uploadedDoc, c.uploadedDocs);

            // Construct a temp updated chat object to check hasEnoughVerifiedInfo
            const tempUpdatedChat = {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength
            };
            const hasVerifiedInfo = hasEnoughVerifiedInfo(tempUpdatedChat);

            const mergedEntities = mergeExtractedEntities(c.uploadedDocs || (c.uploadedDoc ? [c.uploadedDoc] : []));
            const mappedDocs = response.actions.documents.map((doc) => ({
              id: generateUniqueId('doc'),
              title: doc.title,
              type: doc.type,
              date: new Date().toLocaleDateString(),
              previewText: autoFillPlaceholders(doc.previewText, mergedEntities),
              templateText: doc.previewText
            }));

            return {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength,
              timeline: mappedTimeline,
              generatedDocs: mappedDocs,
              summary: {
                overview: response.actions.summary,
                legalProvisions: response.actions.legalProvisions,
                nextAction: response.actions.nextAction
              }
            };
          }
          return c;
        });
      });
    } catch (e: any) {
      console.error('Failed to regenerate response:', e);
      setLastOrchestratorResponse({ error: e.message || 'Service error.' });

      const errMsgStr = e.message || 'Service error.';
      const isQuotaOrServiceIssue = 
        /503|429|quota|rate\s*limit|overloaded|unavailable|capacity/i.test(errMsgStr);

      if (isQuotaOrServiceIssue) {
        setIsQuotaExhausted(true);
      }

      const displayMsg = isQuotaOrServiceIssue
        ? "AI service is temporarily unavailable due to API quota limits. Please try again later."
        : `Regeneration failed: ${errMsgStr}`;

      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: displayMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            const allMsgs = [...c.messages, errMsg];
            const verified = autoVerifyChecklistAndScore(allMsgs, c.checklist, c.uploadedDoc, c.uploadedDocs);
            return {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength
            };
          }
          return c;
        });
      });
    } finally {
      setIsTyping(false);
    }
  };

  const uploadAndAnalyzeFile = async (fileName: string, mimeType: string, base64Data: string) => {
    if (!activeChatId) return;

    // Add user placeholder message
    const userMsg: Message = {
      id: `msg-u-upload-${Date.now()}`,
      role: 'user',
      content: `[Document Uploaded: ${fileName}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c.id === activeChatId) {
          const newMsgs = [...c.messages, userMsg];
          const verified = autoVerifyChecklistAndScore(newMsgs, c.checklist, c.uploadedDoc, c.uploadedDocs);
          return {
            ...c,
            messages: newMsgs,
            checklist: verified.checklist,
            caseStrength: verified.caseStrength
          };
        }
        return c;
      });
    });

    setIsTyping(true);

    try {
      const activeChecklist = activeChat?.checklist || [];
      const labels = activeChecklist.map((item) => item.label);

      const response = await analyzeUploadedFileAction(base64Data, fileName, mimeType, language);
      setLastOrchestratorResponse(response);
      console.log('[DEBUG-CLIENT-RECEIVED] Document Analyzer Output:', response);

      if ('error' in response) {
        throw new Error(response.error);
      }

      const docType = response.analysis?.detectedDocType || 'Other';
      const isLegal = ALLOWED_LEGAL_DOC_TYPES.includes(docType);

      // Localized helper assistant responses
      let assistantMsgContent = '';
      if (language === 'hi') {
        assistantMsgContent = isLegal
          ? `मैंने आपके अपलोड किए गए दस्तावेज़ **${fileName}** को सफलतापूर्वक पार्स और सरल कर दिया है।\n\nमैंने आपकी **साक्ष्य सूची** से मिलान वाले तत्वों को स्वचालित रूप से चिह्नित कर दिया है और पहचाने गए खंडों और जोखिमों के आधार पर **मामले की मजबूती** को अपडेट कर दिया है।\n\nआप अपने कानूनी टूलकिट डैशबोर्ड में **दस्तावेज़ सरलीकारक** पैनल के अंदर क्लॉज विवरण, दायित्वों और जोखिमों की जांच कर सकते हैं।`
          : `मैंने अपलोड किए गए दस्तावेज़ **${fileName}** का विश्लेषण किया है, लेकिन इसे एक वैध कानूनी दस्तावेज़ या साक्ष्य प्रकार के रूप में मान्यता नहीं दी गई थी। साक्ष्य सूची और मामले की मजबूती को अपडेट नहीं किया गया है। आगे बढ़ने के लिए कृपया किराया समझौता, बैंक प्रमाण या संचार लॉग अपलोड करें।`;
      } else if (language === 'gu') {
        assistantMsgContent = isLegal
          ? `મેં તમારા અપલોડ કરેલા દસ્તાવેજ **${fileName}** ને સફળતાપૂર્વક પાર્સ અને સરળ બનાવ્યો છે.\n\nમેં તમારી **પુરાવાઓની સૂચિ** માંથી મેળ ખાતા તત્વોને આપમેળે ચકાસી લીધા છે અને ઓળખાયેલ કલમો અને જોખમોના આધારે **કેસની સ્થિતિની મજબૂતાઈ** ને અપડેટ કરી છે.\n\nતમે તમારા કાનૂની ટૂલકિટ ડેશબોર્ડમાં **દસ્તાવેજ સરળીકરણ** પેનલની અંદર કલમ વિરામ, જવાબદારીઓ અને જોખમોનું નિરીક્ષણ કરી શકો છો.`
          : `મેં અપલોડ કરેલા દસ્તાવેજ **${fileName}** નું વિશ્લેષણ કર્યું છે, પરંતુ તે માન્ય કાનૂની દસ્તાવેજ અથવા પુરાવાના પ્રકાર તરીકે ઓળખાયો નથી. પુરાવાઓની સૂચિ અને કેસની મજબૂતાઈ અપડેટ કરવામાં આવી નથી. કૃપા કરીને આગળ વધવા માટે ભાડા કરાર, બેંક પુરાવા અથવા પત્રવ્યવહાર લોગ અપલોડ કરો.`;
      } else {
        assistantMsgContent = isLegal
          ? `I have successfully parsed and simplified your uploaded document **${fileName}**. \n\nI have automatically checked matching elements off your **Evidence Checklist** and updated the **Case Standing Strength** based on the clauses and risks identified.\n\nYou can inspect the clause breakdown, obligations, and risks inside the **Document Simplifier** panel in your Legal Toolkit dashboard.`
          : `I have analyzed the uploaded document **${fileName}**, but it was not recognized as a valid legal document or evidence type. The Evidence Checklist and Case Standing Strength have not been updated. Please upload a rent agreement, bank proof, or communication logs to proceed.`;
      }

      // Add helper assistant response
      const assistantMsg: Message = {
        id: `msg-a-upload-res-${Date.now()}`,
        role: 'assistant',
        content: assistantMsgContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {

            const tempUploadedDoc = {
              name: fileName,
              type: mimeType,
              text: response.text,
              analysis: response.analysis
            };

            const newUploadedDocObj = {
              id: generateUniqueId('doc-upload'),
              name: fileName,
              type: mimeType,
              text: response.text,
              analysis: response.analysis
            };
            const updatedDocsArray = [...(c.uploadedDocs || []), newUploadedDocObj];

            const allMsgs = [...c.messages, assistantMsg];

            if (!isLegal) {
              const resetChecklist = c.checklist.map((item) => ({
                ...item,
                checked: false
              }));

              const resetCaseStrength = {
                score: 15,
                riskLevel: 'High' as const,
                riskFactors: [
                  'Initial details pending. Case strength score will adjust once incident context is provided.'
                ]
              };

              const resetTimeline = [
                {
                  id: 't-n-1',
                  title: 'Initial Consultation',
                  date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                  description: 'NyayaAI intake chat session started.',
                  status: 'current' as const
                },
                {
                  id: 't-n-2',
                  title: 'Fact Verification',
                  date: 'TBD',
                  description: 'Review supporting evidence items checklist.',
                  status: 'upcoming' as const
                },
                {
                  id: 't-n-3',
                  title: 'Draft demand / representation',
                  date: 'TBD',
                  description: 'Document assembly in the Legal Toolkit.',
                  status: 'upcoming' as const
                }
              ];

              const resetSummary = {
                overview: 'Please detail your legal inquiry in the chat window. NyayaAI will compile an executive case summary here.',
                legalProvisions: [],
                nextAction: 'Explain the facts of your dispute to generate action items.'
              };

              return {
                ...c,
                messages: allMsgs,
                checklist: resetChecklist,
                caseStrength: resetCaseStrength,
                timeline: resetTimeline,
                generatedDocs: [],
                summary: resetSummary,
                uploadedDoc: tempUploadedDoc,
                uploadedDocs: [newUploadedDocObj]
              };
            }

            // Combine document analyzer risks into case risks
            const uniqueRisks = Array.from(
              new Set([...c.caseStrength.riskFactors, ...response.analysis.risks])
            ).slice(0, 5);

            // Merge entities from all documents in updatedDocsArray
            const mergedEntities = mergeExtractedEntities(updatedDocsArray);

            const verified = autoVerifyChecklistAndScore(allMsgs, c.checklist, tempUploadedDoc, updatedDocsArray);

            const tempUpdatedChat = {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength,
              uploadedDoc: tempUploadedDoc,
              uploadedDocs: updatedDocsArray
            };
            const hasVerifiedInfo = hasEnoughVerifiedInfo(tempUpdatedChat);

            // Apply retroactive auto-fill to all generatedDocs
            const updatedGeneratedDocs = c.generatedDocs.map((doc) => ({
              ...doc,
              previewText: autoFillPlaceholders(doc.templateText || doc.previewText, mergedEntities)
            }));

            return {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: {
                ...verified.caseStrength,
                riskFactors: uniqueRisks.length > 0 ? uniqueRisks : verified.caseStrength.riskFactors
              },
              uploadedDoc: tempUploadedDoc,
              uploadedDocs: updatedDocsArray,
              generatedDocs: updatedGeneratedDocs
            };
          }
          return c;
        });
      });
    } catch (e: any) {
      console.error('Document analysis failed:', e);
      setLastOrchestratorResponse({ error: e.message || 'Service failure.' });
      
      const errMsgStr = e.message || 'Service failure.';
      const isQuotaOrServiceIssue = 
        /503|429|quota|rate\s*limit|overloaded|unavailable|capacity/i.test(errMsgStr);

      if (isQuotaOrServiceIssue) {
        setIsQuotaExhausted(true);
      }
 
      const displayMsg = isQuotaOrServiceIssue
        ? "AI service is temporarily unavailable due to API quota limits. Please try again later."
        : `Failed to analyze document: ${errMsgStr}`;
 
      const errMsg: Message = {
        id: `msg-err-upload-${Date.now()}`,
        role: 'assistant',
        content: displayMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            const allMsgs = [...c.messages, errMsg];
            const verified = autoVerifyChecklistAndScore(allMsgs, c.checklist, c.uploadedDoc, c.uploadedDocs);
            return {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength
            };
          }
          return c;
        });
      });
    } finally {
      setIsTyping(false);
    }
  };

  const generateCustomDoc = async (docType: string) => {
    if (!activeChatId || !activeChat) return;

    setIsTyping(true);

    try {
      const factsContext = `
Case Category: ${activeChat.title}
Case Summary Overview: ${activeChat.summary.overview}
Relevant Laws: ${activeChat.summary.legalProvisions.join(', ')}
Chat Message Log:
${activeChat.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
      `;

      const response = await generateCustomDocumentAction(docType, factsContext);

      if ('error' in response) {
        throw new Error(response.error);
      }

      const mergedEntities = mergeExtractedEntities(activeChat.uploadedDocs || (activeChat.uploadedDoc ? [activeChat.uploadedDoc] : []));
      const hasVerifiedInfo = hasEnoughVerifiedInfo(activeChat);
      const newDoc = {
        id: `doc-custom-${Date.now()}`,
        title: response.title,
        type: response.type,
        date: new Date().toLocaleDateString(),
        previewText: autoFillPlaceholders(response.previewText, mergedEntities),
        templateText: response.previewText
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            return {
              ...c,
              generatedDocs: [newDoc, ...c.generatedDocs]
            };
          }
          return c;
        });
      });
    } catch (e: any) {
      console.error('Custom doc generation failure:', e);
      const errMsgStr = e.message || 'Connection issue.';
      const isQuotaOrServiceIssue = 
        /503|429|quota|rate\s*limit|overloaded|unavailable|capacity/i.test(errMsgStr);

      if (isQuotaOrServiceIssue) {
        setIsQuotaExhausted(true);
      }

      const displayMsg = isQuotaOrServiceIssue
        ? "AI service is temporarily unavailable due to API quota limits. Please try again later."
        : `Could not generate template: ${errMsgStr}`;

      alert(displayMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const updateGeneratedDoc = (docId: string, text: string) => {
    if (!activeChatId) return;
    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c.id === activeChatId) {
          const updatedDocs = c.generatedDocs.map((doc) => {
            if (doc.id === docId) {
              return { ...doc, previewText: text };
            }
            return doc;
          });
          return {
            ...c,
            generatedDocs: updatedDocs
          };
        }
        return c;
      });
    });
  };

  const removeUploadedDoc = () => {
    if (!activeChatId) return;
    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c.id === activeChatId) {
          const updatedChat = { ...c };
          delete updatedChat.uploadedDoc;
          delete updatedChat.uploadedDocs;
          return updatedChat;
        }
        return c;
      });
    });
  };

  const renameChat = (id: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const togglePinChat = (id: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const loadDemoCase = (demoId: string) => {
    const targetId = `demo-${demoId}`;
    let mockChatTemplate = INITIAL_MOCK_CHATS.find(c => {
      if (demoId === 'landlord') return c.id === 'chat-landlord-deposit';
      if (demoId === 'consumer') return c.id === 'chat-consumer-complaint';
      if (demoId === 'cyber') return c.id === 'chat-cyber-fraud';
      if (demoId === 'employment') return c.id === 'chat-employment-dispute';
      return false;
    });

    if (!mockChatTemplate) return;

    const demoChat: Chat = JSON.parse(JSON.stringify(mockChatTemplate));
    demoChat.id = targetId;
    demoChat.createdAt = new Date().toISOString();

    // Localize the title
    if (demoId === 'landlord') demoChat.title = language === 'hi' ? 'किराया समझौता विवाद' : language === 'gu' ? 'ભાડા કરાર વિવાદ' : 'Landlord Deposit Dispute';
    if (demoId === 'employment') demoChat.title = language === 'hi' ? 'रोजगार वेतन विवाद' : language === 'gu' ? 'રોજગાર પગાર વિવાદ' : 'Employment Salary Dispute';
    if (demoId === 'consumer') demoChat.title = language === 'hi' ? 'उपभोक्ता शिकायत' : language === 'gu' ? 'ગ્રાહક ફરિયાદ' : 'Consumer Complaint';
    if (demoId === 'cyber') demoChat.title = language === 'hi' ? 'साइबर धोखाधड़ी मामला' : language === 'gu' ? 'સાયબર છેતરપિંડી કેસ' : 'Cyber Fraud';

    setChats((prev) => {
      const filtered = prev.filter(c => c.id !== targetId);
      return [demoChat, ...filtered];
    });
    setActiveChatId(targetId);
  };

  const t = (key: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const engDict = translations['en'];
    if (engDict && engDict[key]) {
      return engDict[key];
    }
    return key;
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        searchQuery,
        isTyping,
        activeChat,
        lastOrchestratorResponse,
        isQuotaExhausted,
        setSearchQuery,
        createChat,
        deleteChat,
        selectChat,
        sendMessage,
        toggleChecklistItem,
        regenerateLastMessage,
        uploadAndAnalyzeFile,
        generateCustomDoc,
        updateGeneratedDoc,
        removeUploadedDoc,
        language,
        setLanguage,
        t,
        renameChat,
        togglePinChat,
        loadDemoCase
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChats() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatProvider');
  }
  return context;
}

// Centralized configuration for evidence metadata
export interface EvidenceMeta {
  why: string;
  upload: string;
}

export const EVIDENCE_METADATA: Record<string, Record<'rent' | 'bank' | 'comm' | 'handover' | 'witness' | 'photos', EvidenceMeta>> = {
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
      why: "Screenshots/visuals provide objective evidence of physical facts.",
      upload: "Relevant photos or videos"
    }
  }
};

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
  checklist: CaseChecklistItem[],
  uploadedDocs?: any[]
): EvidenceGapResult {
  const missingEvidence: string[] = [];
  const recommendations: EvidenceGapRecommendation[] = [];

  // Determine critical categories: 'rent', 'bank', 'comm'
  const criticalCategories = new Set<string>(['rent', 'bank', 'comm']);

  // Get metadata configuration for this category
  const metadata = EVIDENCE_METADATA[caseCategory] || EVIDENCE_METADATA['general'];

  // Check checklist items
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

  // Calculate estimatedImprovedScore by simulating verification of missing critical items
  // Let's create a simulated checklist where all missing critical items are set to checked: true
  const simulatedChecklist = checklist.map(item => {
    const cat = mapLabelToCategory(item.label);
    const isCritical = cat && criticalCategories.has(cat);
    return {
      ...item,
      checked: item.checked || !!isCritical
    };
  });

  // Simulate verification count
  const verifiedCount = simulatedChecklist.filter(item => item.checked).length;
  let generalScore = 15;
  if (verifiedCount === 1) generalScore = 40;
  else if (verifiedCount === 2) generalScore = 65;
  else if (verifiedCount === 3) generalScore = 80;
  else if (verifiedCount === 4) generalScore = 90;
  else if (verifiedCount === 5) generalScore = 93;
  else if (verifiedCount >= 6) generalScore = 95;

  let landlordScore = 15;
  if (caseCategory === 'landlord') {
    const rentVerified = simulatedChecklist.some(item => mapLabelToCategory(item.label) === 'rent' && item.checked);
    const bankVerified = simulatedChecklist.some(item => mapLabelToCategory(item.label) === 'bank' && item.checked);
    const commVerified = simulatedChecklist.some(item => mapLabelToCategory(item.label) === 'comm' && item.checked);
    const handoverVerified = simulatedChecklist.some(item => mapLabelToCategory(item.label) === 'handover' && item.checked);
    const witnessVerified = simulatedChecklist.some(item => mapLabelToCategory(item.label) === 'witness' && item.checked);
    const photosVerified = simulatedChecklist.some(item => mapLabelToCategory(item.label) === 'photos' && item.checked);

    if (rentVerified) {
      if (commVerified && bankVerified && (handoverVerified || witnessVerified || photosVerified)) {
        landlordScore = 95;
      } else if (commVerified && bankVerified) {
        landlordScore = 85;
      } else if (commVerified) {
        landlordScore = 65;
      } else {
        landlordScore = 45;
      }
    }
  }

  const estimatedImprovedScore = caseCategory === 'landlord'
    ? Math.max(generalScore, landlordScore)
    : generalScore;

  return {
    missingEvidence,
    recommendations,
    estimatedImprovedScore
  };
}

export interface NextActionRecommendation {
  action: string;
  reason: string;
}

export function generateNextActionRecommendation(
  caseCategory: 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general',
  isFullyVerified: boolean = false
): NextActionRecommendation {
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
    switch (caseCategory) {
      case 'landlord':
        return {
          action: "Send Security Deposit Demand Notice",
          reason: "Formally demand the refund of the security deposit within the legal notice period before proceeding to litigation."
        };
      case 'employment':
        return {
          action: "Send Salary Recovery Notice",
          reason: "Demand the immediate release of unpaid salary and outstanding dues from the employer."
        };
      case 'consumer':
        return {
          action: "File Consumer Complaint",
          reason: "Initiate a formal complaint with the Consumer Forum to seek product replacement or refund."
        };
      case 'cyber':
        return {
          action: "File FIR and freeze transaction trail",
          reason: "Submit a police complaint immediately to secure the transaction IDs and freeze recipient bank accounts."
        };
      case 'general':
      default:
        return {
          action: "Draft Legal Notice",
          reason: "Serve a formal legal notice setting out claims and giving the counterparty a deadline to settle."
        };
    }
  }
}
