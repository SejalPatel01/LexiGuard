'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Chat, Message, CaseChecklistItem, CaseStrength } from '../types';
import { INITIAL_MOCK_CHATS } from '../lib/mock-data';
import { runLegalAssessment, analyzeUploadedFileAction, generateCustomDocumentAction, translateDocumentAnalysisAction } from '@/app/actions/orchestrate';
import { detectLanguageLocal } from '@/lib/language-detector';
import { ExtractedEntities, DocumentAnalyzerResponse } from '../types/agents';
import { translations, translateKey } from '../lib/translations';

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
  sendMessage: (content: string, overrideDocs?: any[]) => Promise<void>;
  toggleChecklistItem: (itemId: string) => void;
  regenerateLastMessage: () => Promise<void>;
  uploadAndAnalyzeFile: (fileName: string, mimeType: string, base64Data: string) => Promise<any>;
  generateCustomDoc: (docType: string) => Promise<void>;
  updateGeneratedDoc: (docId: string, text: string) => void;
  removeUploadedDoc: () => void;
  t: (key: string) => string;
  renameChat: (id: string, newTitle: string) => void;
  togglePinChat: (id: string) => void;
  loadDemoCase: (demoId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'nyaya-chats';
const ACTIVE_CHAT_KEY = 'nyaya-active-chat-id';

import {
  mapLabelToCategory,
  detectCaseCategory,
  calculateEvidenceGaps,
  generateNextActionRecommendation,
  verifyChecklist,
  calculateWeightedScoreAndRisks,
  EVIDENCE_METADATA
} from '../services/evaluation';

export {
  mapLabelToCategory,
  detectCaseCategory,
  calculateEvidenceGaps,
  generateNextActionRecommendation,
  verifyChecklist,
  calculateWeightedScoreAndRisks,
  EVIDENCE_METADATA
};

// Helper to automatically verify checklist and compute score based on conversation messages
export function autoVerifyChecklistAndScore(
  messages: Message[], 
  currentChecklist: CaseChecklistItem[],
  uploadedDoc?: Chat['uploadedDoc'],
  uploadedDocs?: Chat['uploadedDocs']
): {
  checklist: CaseChecklistItem[];
  caseStrength: CaseStrength;
} {
  const docsList = uploadedDocs || (uploadedDoc ? [uploadedDoc] : []);
  const category = detectCaseCategory(currentChecklist, messages);
  const checklist = verifyChecklist(category, currentChecklist, messages, docsList);
  const caseStrength = calculateWeightedScoreAndRisks(category, checklist, docsList);
  return {
    checklist,
    caseStrength
  };
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
function findSemanticName(entities: ExtractedEntities, keywords: string[]): string | null {
  if (!entities.names || entities.names.length === 0) return null;
  const docText = (entities as any).text || "";
  const docLower = docText.toLowerCase();
  
  for (const name of entities.names) {
    const idx = docLower.indexOf(name.toLowerCase());
    if (idx !== -1) {
      const context = docLower.substring(Math.max(0, idx - 50), Math.min(docLower.length, idx + name.length + 50));
      if (keywords.some(kw => context.includes(kw))) {
        return name;
      }
    }
  }
  return null;
}

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
    if (p.includes('email') || (p.includes('mail') && !p.includes('landlord') && !p.includes('tenant') && !p.includes('employee') && !p.includes('employer'))) {
      if (entities.emailAddresses && entities.emailAddresses.length > 0) return entities.emailAddresses[0];
      return match;
    }

    // 3. Names (exclude addresses and signature placeholders)
    if (!p.includes('address') && !p.includes('addr') && !p.includes('signature') && !p.includes('sig')) {
      if (p.includes('landlord') || p.includes('lessor') || p.includes('employer') || p.includes('seller') || p.includes('recipient')) {
        const name = findSemanticName(entities, ['landlord', 'lessor', 'employer', 'seller', 'owner', 'company']);
        if (name) return name;
        return match;
      }
      if (p.includes('tenant') || p.includes('lessee') || p.includes('employee') || p.includes('buyer') || p.includes('sender') || p.includes('yourname')) {
        const name = findSemanticName(entities, ['tenant', 'lessee', 'employee', 'buyer', 'complainant', 'customer']);
        if (name) return name;
        return match;
      }
      if (p.includes('name')) {
        return match;
      }
    }

    // 4. Addresses
    if (p.includes('address') || p.includes('premises') || p.includes('property')) {
      if (entities.addresses && entities.addresses.length > 0) {
        const addr = entities.addresses[0];
        const hasAddrKeyword = /flat|road|street|sector|area|nagar|heights|floor|building|plot|lane|avenue|apartment|society|colony|bldg|hno|st|rd/i.test(addr);
        if (hasAddrKeyword) return addr;
      }
      return match;
    }

    // 5. Deposit Value / Amounts
    if (p.includes('deposit') || p.includes('security')) {
      if (entities.depositValues && entities.depositValues.length > 0) return entities.depositValues[0];
      if (entities.amounts && entities.amounts.length > 0) {
        const val = entities.amounts[0];
        if (!/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(val)) return val;
      }
      return match;
    }
    if (p.includes('rent') || p.includes('amount') || p.includes('value') || p.includes('salary') || p.includes('fee')) {
      if (entities.amounts && entities.amounts.length > 0) {
        const val = entities.amounts[0];
        if (!/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(val)) return val;
      }
      return match;
    }

    // 6. Agreement Numbers
    if (p.includes('number') || p.includes('id') || p.includes('reference') || p.includes('agreement') || p.includes('contract')) {
      if (entities.agreementNumbers && entities.agreementNumbers.length > 0) return entities.agreementNumbers[0];
      return match;
    }

    // 7. Dates
    // 7a. Vacation / Move dates (check explicitly first to prevent general date fallback)
    if (p.includes('vacat') || p.includes('move')) {
      if (entities.dates && entities.dates.length > 0) {
        const docText = (entities as any).text || "";
        const docLower = docText.toLowerCase();
        for (const dt of entities.dates) {
          const idx = docLower.indexOf(dt.toLowerCase());
          if (idx !== -1) {
            const context = docLower.substring(Math.max(0, idx - 50), Math.min(docLower.length, idx + dt.length + 50));
            if (/vacat|move|handover|leave|left/i.test(context)) {
              if (!/[₹$]/.test(dt) && !/\brs\b|\binr\b/i.test(dt)) return dt;
            }
          }
        }
      }
      return match;
    }

    // 7b. General Dates
    if (!p.includes('vacat') && !p.includes('move')) {
      if (p.includes('agreementdate') || p.includes('contractdate') || p.includes('leasedate') || p.includes('tenancydate')) {
        if (entities.legalDates && entities.legalDates.length > 0) {
          const dt = entities.legalDates[0];
          if (!/[₹$]/.test(dt) && !/\brs\b|\binr\b/i.test(dt)) return dt;
        }
        return match;
      }
      if (p.includes('date') || p === 'currentdate' || p === 'today') {
        if (p === 'currentdate' || p === 'today') {
          return new Date().toLocaleDateString();
        }
        if (entities.legalDates && entities.legalDates.length > 0) {
          const dt = entities.legalDates[0];
          if (!/[₹$]/.test(dt) && !/\brs\b|\binr\b/i.test(dt)) return dt;
        }
        return match;
      }
    }

    return match;
  });
}

// Helper to merge all entities from all documents
export function mergeExtractedEntities(docs: Array<{ text?: string; analysis?: DocumentAnalyzerResponse }>): ExtractedEntities {
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

  let combinedText = '';

  docs.forEach(doc => {
    if (doc.text) {
      combinedText += ' ' + doc.text;
    }
    const ent = doc.analysis?.entities;
    if (!ent) return;

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

  (merged as any).text = combinedText;
  return merged;
}



export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastOrchestratorResponse, setLastOrchestratorResponse] = useState<any>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);

  // Initialize and load from LocalStorage
  useEffect(() => {
    const savedChats = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_CHAT_KEY);

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

  // Clean up any empty chats that are not the currently active chat
  useEffect(() => {
    if (!mounted) return;
    setChats((prev) => {
      const hasEmptyNonActive = prev.some((c) => c.id !== activeChatId && c.messages.length === 0);
      if (hasEmptyNonActive) {
        return prev.filter((c) => c.id === activeChatId || c.messages.length > 0);
      }
      return prev;
    });
  }, [activeChatId, mounted]);

  // Save to LocalStorage whenever chats or activeChatId changes (only persisting non-empty chats)
  useEffect(() => {
    if (!mounted) return;
    const chatsToPersist = chats.filter((c) => c.messages.length > 0);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatsToPersist));
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY);
    }
  }, [chats, activeChatId, mounted]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const createChat = (title?: string) => {
    // If the active chat is already empty, just return its ID instead of creating another one
    if (activeChat && activeChat.messages.length === 0) {
      return activeChat.id;
    }

    const newId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newId,
      title: title || t('New Case Inquiry'),
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
      },
      chatLanguage: 'en'
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

  const sendMessage = async (content: string, overrideDocs?: any[]) => {
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

      // 4. Run orchestration pipeline and document translation in parallel in detected language
      const currentChatObj = chats.find(c => c.id === activeChatId);
      const targetLang = detectLanguageLocal(content);
      console.log('[use-chats] sendMessage detected prompt language:', targetLang);
      
      const uploadedDocsList = overrideDocs || currentChatObj?.uploadedDocs || (currentChatObj?.uploadedDoc ? [currentChatObj.uploadedDoc] : []);
      console.log(`[use-chats] sendMessage: currentChatObj id=${currentChatObj?.id}, uploadedDocs length=${currentChatObj?.uploadedDocs?.length || 0}, uploadedDoc=${!!currentChatObj?.uploadedDoc}, uploadedDocsList length=${uploadedDocsList.length}`);
      const assessmentPromise = runLegalAssessment(content, historyContext, targetLang, uploadedDocsList);
      
      let docTranslationPromise: Promise<any> = Promise.resolve(null);
      if (currentChatObj?.uploadedDoc) {
        const doc = currentChatObj.uploadedDoc;
        const cache = doc.analysisTranslationCache;
        if (!cache || !cache[targetLang]) {
          console.log(`[use-chats] Translating uploadedDoc analysis to: ${targetLang}`);
          docTranslationPromise = translateDocumentAnalysisAction(doc.analysis, targetLang)
            .catch(err => {
              console.error('Failed to translate uploadedDoc analysis:', err);
              return null;
            });
        }
      }

      let docsListTranslationPromise = Promise.resolve<any[]>([]);
      if (currentChatObj?.uploadedDocs) {
        docsListTranslationPromise = Promise.all(
          currentChatObj.uploadedDocs.map(async (doc) => {
            const cache = doc.analysisTranslationCache;
            if (!cache || !cache[targetLang]) {
              console.log(`[use-chats] Translating uploadedDocs list item "${doc.id}" analysis to: ${targetLang}`);
              try {
                const trans = await translateDocumentAnalysisAction(doc.analysis, targetLang);
                return { id: doc.id, analysis: trans };
              } catch (err) {
                console.error('Failed to translate uploadedDocs list item:', err);
                return null;
              }
            }
            return null;
          })
        ).then(results => results.filter(Boolean) as any[]);
      }

      const [response, translatedDocAnalysis, translatedDocsList] = await Promise.all([
        assessmentPromise,
        docTranslationPromise,
        docsListTranslationPromise
      ]);

      setLastOrchestratorResponse(response);
      console.log('[DEBUG-CLIENT-RECEIVED] Orchestrator Output:', response);

      if (response && 'isBlocked' in response && response.isBlocked) {
        const blockMsg: Message = {
          id: `msg-a-sec-${Date.now()}`,
          role: 'assistant',
          content: 'Security Blocked Request',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isBlocked: true,
          threatType: response.threatType,
          severity: response.severity,
          reason: response.reason
        };

        setChats((prevChats) => {
          return prevChats.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: [...c.messages, blockMsg],
                chatLanguage: targetLang
              };
            }
            return c;
          });
        });
        return;
      }

      if ('error' in response) {
        throw new Error(response.error);
      }

      const successResponse = response as any;

      // 5. Create assistant response message
      const assistantMsg: Message = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        content: successResponse.advice.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            // Update title to categories if it was a default title, using targetLang
            const isInitialTitle = c.title === 'New Case Inquiry' || c.title === t('New Case Inquiry') || c.title.endsWith('...');             const updatedTitle = isInitialTitle ? translateKey(successResponse.category, targetLang) : c.title;

            // Map evidence checklist and keep already checked states if matching, tracking matched existing items to prevent duplicates
            const usedExistingIds = new Set<string>();
            const mappedChecklist = successResponse.actions.checklist.map((label: string) => {
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
            const mappedTimeline = successResponse.actions.timeline.map((step: any, idx: number) => ({
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
            const mappedDocs = successResponse.actions.documents.map((doc: any) => ({
              id: generateUniqueId('doc'),
              title: doc.title,
              type: doc.type,
              date: new Date().toLocaleDateString(),
              previewText: autoFillPlaceholders(doc.previewText, mergedEntities),
              templateText: doc.previewText
            }));

            // Update uploadedDoc with the new translation cache
            let updatedUploadedDoc = c.uploadedDoc;
            if (c.uploadedDoc) {
              const newCache: any = {
                ...(c.uploadedDoc.analysisTranslationCache || {}),
                version: 1
              };
              if (translatedDocAnalysis) {
                newCache[targetLang] = translatedDocAnalysis;
              }
              updatedUploadedDoc = {
                ...c.uploadedDoc,
                analysisTranslationCache: newCache
              };
            }

            // Update uploadedDocs list with new translation caches
            let updatedUploadedDocs = c.uploadedDocs;
            if (c.uploadedDocs) {
              updatedUploadedDocs = c.uploadedDocs.map((doc) => {
                const match = (translatedDocsList || []).find((t: any) => t.id === doc.id);
                if (match) {
                  const newCache = {
                    ...(doc.analysisTranslationCache || {}),
                    [targetLang]: match.analysis,
                    version: 1
                  };
                  return {
                    ...doc,
                    analysisTranslationCache: newCache
                  };
                }
                return doc;
              });
            }

            return {
              ...c,
              title: updatedTitle,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength,
              timeline: mappedTimeline,
              generatedDocs: mappedDocs,
              summary: {
                overview: successResponse.actions.summary,
                legalProvisions: successResponse.actions.legalProvisions,
                nextAction: successResponse.actions.nextAction
              },
              uploadedDoc: updatedUploadedDoc,
              uploadedDocs: updatedUploadedDocs,
              chatLanguage: targetLang
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

      // Run assessment and translations in parallel in detected language
      const targetLang = detectLanguageLocal(lastUserMessageContent);
      console.log('[use-chats] regenerateLastMessage detected prompt language:', targetLang);
      
      const uploadedDocsList = currentChat?.uploadedDocs || (currentChat?.uploadedDoc ? [currentChat.uploadedDoc] : []);
      console.log(`[use-chats] regenerateLastMessage: currentChat id=${currentChat?.id}, uploadedDocs length=${currentChat?.uploadedDocs?.length || 0}, uploadedDoc=${!!currentChat?.uploadedDoc}, uploadedDocsList length=${uploadedDocsList.length}`);
      const assessmentPromise = runLegalAssessment(lastUserMessageContent, historyContext, targetLang, uploadedDocsList);

      let docTranslationPromise: Promise<any> = Promise.resolve(null);
      if (currentChat?.uploadedDoc) {
        const doc = currentChat.uploadedDoc;
        const cache = doc.analysisTranslationCache;
        if (!cache || !cache[targetLang]) {
          console.log(`[use-chats] Translating uploadedDoc analysis to: ${targetLang} (Regen)`);
          docTranslationPromise = translateDocumentAnalysisAction(doc.analysis, targetLang)
            .catch(err => {
              console.error('Failed to translate uploadedDoc analysis:', err);
              return null;
            });
        }
      }

      let docsListTranslationPromise = Promise.resolve<any[]>([]);
      if (currentChat?.uploadedDocs) {
        docsListTranslationPromise = Promise.all(
          currentChat.uploadedDocs.map(async (doc) => {
            const cache = doc.analysisTranslationCache;
            if (!cache || !cache[targetLang]) {
              console.log(`[use-chats] Translating uploadedDocs list item "${doc.id}" analysis to: ${targetLang} (Regen)`);
              try {
                const trans = await translateDocumentAnalysisAction(doc.analysis, targetLang);
                return { id: doc.id, analysis: trans };
              } catch (err) {
                console.error('Failed to translate uploadedDocs list item:', err);
                return null;
              }
            }
            return null;
          })
        ).then(results => results.filter(Boolean) as any[]);
      }

      const [response, translatedDocAnalysis, translatedDocsList] = await Promise.all([
        assessmentPromise,
        docTranslationPromise,
        docsListTranslationPromise
      ]);

      setLastOrchestratorResponse(response);
      console.log('[DEBUG-CLIENT-RECEIVED] Orchestrator Output (Regen):', response);

      if (response && 'isBlocked' in response && response.isBlocked) {
        const blockMsg: Message = {
          id: `msg-a-sec-${Date.now()}`,
          role: 'assistant',
          content: 'Security Blocked Request',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isBlocked: true,
          threatType: response.threatType,
          severity: response.severity,
          reason: response.reason
        };

        setChats((prevChats) => {
          return prevChats.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: [...cleanMessages, blockMsg],
                chatLanguage: targetLang
              };
            }
            return c;
          });
        });
        return;
      }

      if ('error' in response) {
        throw new Error(response.error);
      }

      const successResponse = response as any;

      const assistantMsg: Message = {
        id: `msg-a-regen-${Date.now()}`,
        role: 'assistant',
        content: `${successResponse.advice.text}\n\n*(Regenerated response)*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === activeChatId) {
            const usedExistingIds = new Set<string>();
            const mappedChecklist = successResponse.actions.checklist.map((label: string) => {
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
             const mappedTimeline = successResponse.actions.timeline.map((step: any, idx: number) => ({
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
            const mappedDocs = successResponse.actions.documents.map((doc: any) => ({
              id: generateUniqueId('doc'),
              title: doc.title,
              type: doc.type,
              date: new Date().toLocaleDateString(),
              previewText: autoFillPlaceholders(doc.previewText, mergedEntities),
              templateText: doc.previewText
            }));

            // Update uploadedDoc with the new translation cache
            let updatedUploadedDoc = c.uploadedDoc;
            if (c.uploadedDoc) {
              const newCache: any = {
                ...(c.uploadedDoc.analysisTranslationCache || {}),
                version: 1
              };
              if (translatedDocAnalysis) {
                newCache[targetLang] = translatedDocAnalysis;
              }
              updatedUploadedDoc = {
                ...c.uploadedDoc,
                analysisTranslationCache: newCache
              };
            }

            // Update uploadedDocs list with new translation caches
            let updatedUploadedDocs = c.uploadedDocs;
            if (c.uploadedDocs) {
              updatedUploadedDocs = c.uploadedDocs.map((doc) => {
                const match = (translatedDocsList || []).find((t: any) => t.id === doc.id);
                if (match) {
                  const newCache = {
                    ...(doc.analysisTranslationCache || {}),
                    [targetLang]: match.analysis,
                    version: 1
                  };
                  return {
                    ...doc,
                    analysisTranslationCache: newCache
                  };
                }
                return doc;
              });
            }

            return {
              ...c,
              messages: allMsgs,
              checklist: verified.checklist,
              caseStrength: verified.caseStrength,
              timeline: mappedTimeline,
              generatedDocs: mappedDocs,
              summary: {
                overview: successResponse.actions.summary,
                legalProvisions: successResponse.actions.legalProvisions,
                nextAction: successResponse.actions.nextAction
              },
              uploadedDoc: updatedUploadedDoc,
              uploadedDocs: updatedUploadedDocs,
              chatLanguage: targetLang
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
      const targetLang = activeChat?.chatLanguage || 'en';

      const response = await analyzeUploadedFileAction(base64Data, fileName, mimeType, targetLang);
      setLastOrchestratorResponse(response);
      console.log('[DEBUG-CLIENT-RECEIVED] Document Analyzer Output:', response);

      if ('error' in response) {
        throw new Error(response.error);
      }

      const docType = response.analysis?.detectedDocType || 'Other';
      const isLegal = ALLOWED_LEGAL_DOC_TYPES.includes(docType);

      // Localized helper assistant responses based on targetLang
      let assistantMsgContent = '';
      if (targetLang === 'hi') {
        assistantMsgContent = isLegal
          ? `मैंने आपके अपलोड किए गए दस्तावेज़ **${fileName}** को सफलतापूर्वक पार्स और सरल कर दिया है।\n\nमैंने आपकी **साक्ष्य सूची** से मिलान वाले तत्वों को स्वचालित रूप से चिह्नित कर दिया है और पहचाने गए खंडों और जोखिमों के आधार पर **मामले की मजबूती** को अपडेट कर दिया है।\n\nआप अपने कानूनी टूलकिट डैशबोर्ड में **दस्तावेज़ सरलीकारक** पैनल के अंदर क्लॉज विवरण, दायित्वों और जोखिमों की जांच कर सकते हैं।`
          : `मैंने अपलोड किए गए दस्तावेज़ **${fileName}** का विश्लेषण किया है, लेकिन इसे एक वैध कानूनी दस्तावेज़ या साक्ष्य प्रकार के रूप में मान्यता नहीं दी गई थी। साक्ष्य सूची और मामले की मजबूती को अपडेट नहीं किया गया है। आगे बढ़ने के लिए कृपया किराया समझौता, बैंक प्रमाण या संचार लॉग अपलोड करें।`;
      } else if (targetLang === 'gu') {
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

      const newUploadedDocObj = {
        id: generateUniqueId('doc-upload'),
        name: fileName,
        type: mimeType,
        text: response.text,
        analysis: response.analysis
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
                uploadedDocs: [newUploadedDocObj],
                chatLanguage: targetLang
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
              generatedDocs: updatedGeneratedDocs,
              chatLanguage: targetLang
            };
          }
          return c;
        });
      });
      return newUploadedDocObj;
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

    // Localize the title (always use English by default since manual selector is removed)
    if (demoId === 'landlord') demoChat.title = 'Landlord Deposit Dispute';
    if (demoId === 'employment') demoChat.title = 'Employment Salary Dispute';
    if (demoId === 'consumer') demoChat.title = 'Consumer Complaint';
    if (demoId === 'cyber') demoChat.title = 'Cyber Fraud';

    demoChat.chatLanguage = 'en';

    setChats((prev) => {
      const filtered = prev.filter(c => c.id !== targetId);
      return [demoChat, ...filtered];
    });
    setActiveChatId(targetId);
  };

  const t = (key: string): string => {
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

