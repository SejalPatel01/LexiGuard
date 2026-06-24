'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import React from 'react';
import { useChats, mergeExtractedEntities, mapLabelToCategory, detectCaseCategory } from '@/hooks/use-chats';
import { 
  EvidenceChecklistCard, 
  CaseStrengthCard, 
  ActionTimelineCard, 
  GeneratedDocsCard, 
  DocumentSimplifierCard,
  EvidenceGapAdvisorCard
} from './toolkit-cards';
import { Briefcase, X } from 'lucide-react';

interface LegalToolkitProps {
  isOpenOnMobile: boolean;
  setIsOpenOnMobile: (open: boolean) => void;
}



export function LegalToolkit({ isOpenOnMobile, setIsOpenOnMobile }: LegalToolkitProps) {
  const { chats, activeChat, toggleChecklistItem, lastOrchestratorResponse, language, t } = useChats();



  console.log('[DEBUG-TOOLKIT-RENDER] activeChat:', activeChat ? {
    id: activeChat.id,
    checklist: activeChat.checklist,
    caseStrength: activeChat.caseStrength,
    summary: activeChat.summary
  } : null);

  if (!activeChat) {
    return (
      <div className="hidden xl:flex flex-col w-80 shrink-0 bg-card border-l border-border/80 p-4 items-center justify-center text-center">
        <Briefcase className="size-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">
          {t('empty_summary')}
        </p>
      </div>
    );
  }

  const rentAgreementDetected = activeChat.messages.some(m => {
    if (m.role !== 'user') return false;
    const t = m.content.toLowerCase();
    return t.includes('rent agreement') || t.includes('lease agreement') || t.includes('tenancy agreement') || t.includes('employment contract') || t.includes('appointment letter') || t.includes('written contract') || t.includes('written agreement');
  }) || (activeChat.uploadedDoc ? activeChat.uploadedDoc.text.toLowerCase().includes('rent agreement') || activeChat.uploadedDoc.text.toLowerCase().includes('lease agreement') || activeChat.uploadedDoc.text.toLowerCase().includes('tenancy agreement') : false);

  const bankProofDetected = activeChat.messages.some(m => {
    if (m.role !== 'user') return false;
    const t = m.content.toLowerCase();
    return t.includes('bank transfer') || t.includes('bank statement') || t.includes('payment receipt') || t.includes('transaction proof');
  }) || (activeChat.uploadedDoc ? activeChat.uploadedDoc.text.toLowerCase().includes('bank transfer') || activeChat.uploadedDoc.text.toLowerCase().includes('bank statement') || activeChat.uploadedDoc.text.toLowerCase().includes('payment receipt') || activeChat.uploadedDoc.text.toLowerCase().includes('transaction proof') : false);

  const communicationDetected = activeChat.messages.some(m => {
    if (m.role !== 'user') return false;
    const t = m.content.toLowerCase();
    return t.includes('whatsapp') || t.includes('email') || t.includes('messages') || t.includes('chats') || t.includes('chat log') || t.includes('correspondence');
  }) || (activeChat.uploadedDoc ? activeChat.uploadedDoc.text.toLowerCase().includes('whatsapp') || activeChat.uploadedDoc.text.toLowerCase().includes('email') || activeChat.uploadedDoc.text.toLowerCase().includes('messages') : false);

  const propertyHandoverDetected = activeChat.messages.some(m => {
    if (m.role !== 'user') return false;
    const t = m.content.toLowerCase();
    return t.includes('handover') || t.includes('possession returned') || t.includes('vacated property') || t.includes('move out proof') || t.includes('delivery proof') || t.includes('vacated the');
  }) || (activeChat.uploadedDoc ? activeChat.uploadedDoc.text.toLowerCase().includes('handover') || activeChat.uploadedDoc.text.toLowerCase().includes('move out') : false);

  const witnessDetected = activeChat.messages.some(m => {
    if (m.role !== 'user') return false;
    const t = m.content.toLowerCase();
    return t.includes('witness') || t.includes('neighbour') || t.includes('manager saw') || t.includes('someone can confirm');
  }) || (activeChat.uploadedDoc ? activeChat.uploadedDoc.text.toLowerCase().includes('witness') || activeChat.uploadedDoc.text.toLowerCase().includes('neighbour') || activeChat.uploadedDoc.text.toLowerCase().includes('manager saw') || activeChat.uploadedDoc.text.toLowerCase().includes('someone can confirm') : false);

  const photosDetected = activeChat.messages.some(m => {
    if (m.role !== 'user') return false;
    const t = m.content.toLowerCase();
    return t.includes('photo') || t.includes('image') || t.includes('video') || t.includes('screenshot');
  }) || (activeChat.uploadedDoc ? activeChat.uploadedDoc.text.toLowerCase().includes('photo') || activeChat.uploadedDoc.text.toLowerCase().includes('image') || activeChat.uploadedDoc.text.toLowerCase().includes('video') || activeChat.uploadedDoc.text.toLowerCase().includes('screenshot') : false);

  const detectedEvidence = {
    rentAgreement: rentAgreementDetected,
    bankProof: bankProofDetected,
    communication: communicationDetected,
    propertyHandover: propertyHandoverDetected,
    witnessStatements: witnessDetected,
    photos: photosDetected
  };

  const verifiedCount = activeChat.checklist.filter(item => item.checked).length;

  const uploadedFiles = activeChat.uploadedDocs || (activeChat.uploadedDoc ? [activeChat.uploadedDoc] : []);
  const mergedEntities = mergeExtractedEntities(uploadedFiles);

  const getVerificationSources = () => {
    const mapping: Record<string, string[]> = {};
    const caseCategory = detectCaseCategory(activeChat.checklist, activeChat.messages);
    
    activeChat.checklist.forEach(item => {
      const cat = mapLabelToCategory(item.label);
      if (!cat) return;
      const matchedDocs: string[] = [];
      
      uploadedFiles.forEach(doc => {
        let docType = doc.analysis?.detectedDocType;
        if (!docType && doc.name) {
          const nameLower = doc.name.toLowerCase();
          if (nameLower.includes('rent') || nameLower.includes('lease') || nameLower.includes('agreement') || nameLower.includes('contract')) {
            docType = 'Rent Agreement';
          } else if (nameLower.includes('witness') || nameLower.includes('declaration')) {
            docType = 'Witness Statement';
          } else if (nameLower.includes('bank') || nameLower.includes('receipt') || nameLower.includes('statement') || nameLower.includes('payment')) {
            docType = 'Bank Statement';
          } else if (nameLower.includes('whatsapp') || nameLower.includes('chat') || nameLower.includes('email') || nameLower.includes('sms')) {
            docType = 'WhatsApp Screenshot';
          } else if (nameLower.includes('handover') || nameLower.includes('possession') || nameLower.includes('moveout') || nameLower.includes('move-out')) {
            docType = 'Property Handover';
          } else if (nameLower.includes('photo') || nameLower.includes('video') || nameLower.includes('image') || nameLower.includes('screenshot')) {
            docType = 'Photos';
          } else if (nameLower.includes('notice')) {
            docType = 'Legal Notice';
          }
        }

        if (!docType || docType === 'Other' || docType === 'Legal Notice') {
          return;
        }

        let matched = false;

        // Strict one-to-one category matching with no cross-category leaks
        if (docType === 'Rent Agreement' || docType === 'Lease Agreement') {
          if (cat === 'rent' && (caseCategory === 'landlord' || caseCategory === 'general')) matched = true;
        } else if (docType === 'Employment Contract') {
          if (cat === 'rent' && (caseCategory === 'employment' || caseCategory === 'general')) matched = true;
        } else if (docType === 'Invoice') {
          if (cat === 'rent' && (caseCategory === 'consumer' || caseCategory === 'general')) matched = true;
        } else if (docType === 'FIR') {
          if (cat === 'rent' && (caseCategory === 'cyber' || caseCategory === 'general')) matched = true;
        } else if (docType === 'Bank Receipt' || docType === 'Bank Statement') {
          if (cat === 'bank') matched = true;
        } else if (docType === 'WhatsApp Screenshot' || docType === 'Email' || docType === 'SMS') {
          if (cat === 'comm') matched = true;
        } else if (docType === 'Property Handover') {
          if (cat === 'handover' && caseCategory === 'landlord') matched = true;
        } else if (docType === 'Witness Statement') {
          if (cat === 'witness') matched = true;
        } else if (docType === 'Photos' || docType === 'Video') {
          if (cat === 'photos') matched = true;
        }

        if (matched) {
          matchedDocs.push(doc.name);
        }
      });
      
      if (matchedDocs.length > 0) {
        mapping[item.label] = matchedDocs;
      }
    });
    
    return mapping;
  };

  const verificationSources = getVerificationSources();

  const toolkitContent = (
    <div className="flex flex-col h-full bg-card text-card-foreground border-l border-border/80">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4.5 text-primary dark:text-amber-500" />
          <span className="text-sm font-bold text-foreground">{t('toolkit_dashboard')}</span>
        </div>


        
        {/* Mobile close button */}
        <button 
          onClick={() => setIsOpenOnMobile(false)}
          className="xl:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4.5" />
        </button>
      </div>

      {/* Cards Scrollable Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">


        {/* Document Simplifier Card */}
        <div data-tour-step="3">
          <DocumentSimplifierCard />
        </div>

        {/* 2. Case Strength */}
        <CaseStrengthCard caseStrength={activeChat.caseStrength} />

        {/* Evidence Gap Advisor */}
        <EvidenceGapAdvisorCard chat={activeChat} />

        {/* 3. Evidence Checklist */}
        <div data-tour-step="4">
          <EvidenceChecklistCard 
            checklist={activeChat.checklist} 
            onToggle={toggleChecklistItem} 
          />
        </div>

        {/* 4. Action Timeline */}
        <ActionTimelineCard timeline={activeChat.timeline} />

        {/* 5. Generated Documents */}
        <div data-tour-step="5">
          <GeneratedDocsCard generatedDocs={activeChat.generatedDocs} />
        </div>


      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border/60 bg-muted/20 dark:bg-muted/10 text-center shrink-0">
        <span className="text-[10px] text-muted-foreground font-semibold">
          {t('compliance_footer')}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Toolkit (visible on xl screens) */}
      <aside className="hidden xl:block w-80 shrink-0 h-full">
        {toolkitContent}
      </aside>

      {/* Mobile Drawer (visible on smaller screens when toggled) */}
      {isOpenOnMobile && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsOpenOnMobile(false)}
          />
          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs sm:max-w-sm w-full h-full animate-in slide-in-from-right duration-200 z-10">
            {toolkitContent}
          </div>
        </div>
      )}
    </>
  );
}
