'use client';

import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  FileText, 
  Eye, 
  ArrowRight,
  ClipboardList,
  X,
  Copy,
  Check,
  Plus,
  Download,
  Edit3,
  Trash,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Chat, GeneratedDoc } from '@/types';
import { cn } from '@/lib/utils';
import { useChats, calculateEvidenceGaps, generateNextActionRecommendation, detectCaseCategory } from '@/hooks/use-chats';
import { exportToPDF } from '@/services/pdf-export';
import { translateKey } from '@/lib/translations';

// --- CARD WRAPPER ---
function ToolkitCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2.5 mb-3">
        <Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// --- 1. EVIDENCE CHECKLIST ---
interface EvidenceChecklistProps {
  checklist: Chat['checklist'];
  onToggle: (id: string) => void;
}
export function EvidenceChecklistCard({ checklist, onToggle }: EvidenceChecklistProps) {
  const { activeChat } = useChats();
  const tkLang = activeChat?.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);

  // Deduplicate items by ID to guarantee uniqueness in React children rendering
  const uniqueChecklist = Array.from(new Map(checklist.map(item => [item.id, item])).values());



  const completed = uniqueChecklist.filter((item) => item.checked).length;
  const total = uniqueChecklist.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <ToolkitCard title={t('evidence_checklist')} icon={ClipboardList}>
      <div className="space-y-3">
        {/* Progress header */}
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-muted-foreground">
            {completed} {t('checklist_of')} {total} {t('checklist_verified')}
          </span>
          <span className="text-foreground font-bold">{percent}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-600 dark:to-purple-500 rounded-full transition-all duration-500" 
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Checkbox Items */}
        <div className="space-y-2 pt-1 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
          {uniqueChecklist.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={cn(
                "flex items-start gap-2.5 p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors select-none",
                item.checked 
                  ? "bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="shrink-0 mt-0.5">
                {item.checked ? (
                  <CheckSquare className="size-3.5" />
                ) : (
                  <Square className="size-3.5" />
                )}
              </span>
              <span className="leading-tight">{activeChat && activeChat.messages.length > 0 ? item.label : t(item.label)}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolkitCard>
  );
}

// --- 2. CASE STRENGTH CARD ---
export function CaseStrengthCard({ caseStrength }: { caseStrength: Chat['caseStrength'] }) {
  const { score, riskLevel, riskFactors } = caseStrength;
  const { activeChat } = useChats();
  const tkLang = activeChat?.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);
  
  const getRiskDetails = () => {
    switch (riskLevel) {
      case 'Low':
      case 'Strong Case':
        return { 
          icon: ShieldCheck, 
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/60 shadow-sm', 
          bar: 'bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-600 dark:to-purple-500',
          label: t('strong_case')
        };
      case 'Medium':
        return { 
          icon: AlertTriangle, 
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/60 shadow-sm', 
          bar: 'bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-600 dark:to-purple-500',
          label: t('medium_risk')
        };
      case 'High':
      default:
        return { 
          icon: ShieldAlert, 
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/60 shadow-sm', 
          bar: 'bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-600 dark:to-purple-500',
          label: t('high_risk')
        };
    }
  };

  const risk = getRiskDetails();
  const RiskIcon = risk.icon;

  return (
    <ToolkitCard title={t('case_standing')} icon={ShieldCheck}>
      <div className="space-y-4">
        {/* Score & Risk Badge Row */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('eval_score')}</span>
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {score}%
            </span>
          </div>
          
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold shadow-sm", risk.color)}>
            <RiskIcon className="size-3.5 shrink-0" />
            <span>{risk.label}</span>
          </div>
        </div>

        {/* Linear Progress Score bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-700 to-purple-600 dark:from-blue-600 dark:to-purple-500 transition-all duration-500"
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Risk factors bullet details */}
        <div className="space-y-2 pt-1.5 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            {t('key_risk_factors')}
          </span>
          <ul className="space-y-2">
            {riskFactors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80 leading-normal pl-0.5">
                <span className="size-1 rounded-full bg-indigo-600 dark:bg-purple-400 shrink-0 mt-1.5" />
                <span>{activeChat && activeChat.messages.length > 0 ? factor : t(factor)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ToolkitCard>
  );
}

// --- 3. ACTION TIMELINE CARD ---
export function ActionTimelineCard({ timeline }: { timeline: Chat['timeline'] }) {
  const uniqueTimeline = Array.from(new Map(timeline.map(e => [e.id, e])).values());
  const { activeChat } = useChats();
  const tkLang = activeChat?.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);



  const getStatusLabel = (status: string) => {
    if (status === 'completed') return t('status_completed');
    if (status === 'current') return t('status_current');
    return t('status_upcoming');
  };

  return (
    <ToolkitCard title={t('timeline_milestones')} icon={Calendar}>
      <div className="relative pl-3 border-l-2 border-border/80 ml-2.5 space-y-4 py-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
        {uniqueTimeline.map((event) => {
          const isCompleted = event.status === 'completed';
          const isCurrent = event.status === 'current';
          
          return (
            <div key={event.id} className="relative group">
              {/* Timeline marker */}
              <div 
                className={cn(
                  "absolute -left-[19px] top-1.5 size-3 rounded-full border-2 transition-all duration-300",
                  isCompleted 
                    ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20" 
                    : isCurrent 
                      ? "bg-indigo-600 border-indigo-600 animate-pulse shadow-md shadow-indigo-500/20 dark:bg-indigo-500 dark:border-indigo-500"
                      : "bg-card border-border"
                )}
              />

              {/* Event content */}
              <div className="space-y-0.5 select-none">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span>{event.date}</span>
                  <span className={cn(
                    "uppercase tracking-wider px-1.5 py-0.5 rounded",
                    isCompleted 
                      ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/15" 
                      : isCurrent ? "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/15" 
                        : "text-muted-foreground/60 bg-muted"
                  )}>
                    {getStatusLabel(event.status)}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {activeChat && activeChat.messages.length > 0 ? event.title : t(event.title)}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-normal pr-1">
                  {activeChat && activeChat.messages.length > 0 ? event.description : t(event.description)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ToolkitCard>
  );
}

// --- 4. GENERATED DOCUMENTS CARD ---
export function GeneratedDocsCard({ generatedDocs }: { generatedDocs: GeneratedDoc[] }) {
  const uniqueDocs = Array.from(new Map(generatedDocs.map(doc => [doc.id, doc])).values());
  const { generateCustomDoc, updateGeneratedDoc, isQuotaExhausted, activeChat } = useChats();
  const tkLang = activeChat?.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);



  const [activeDoc, setActiveDoc] = useState<GeneratedDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showGeneratorDropdown, setShowGeneratorDropdown] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectDocType = async (type: string) => {
    setShowGeneratorDropdown(false);
    await generateCustomDoc(type);
  };

  const handleStartEdit = () => {
    if (activeDoc) {
      setEditText(activeDoc.previewText);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (activeDoc) {
      updateGeneratedDoc(activeDoc.id, editText);
      setActiveDoc({ ...activeDoc, previewText: editText });
      setIsEditing(false);
    }
  };

  const handleDownloadPDF = async (title: string, text: string) => {
    await exportToPDF(title, text);
  };

  const getDocTypeTranslation = (type: string) => {
    if (type === 'Demand Notice') return tkLang === 'hi' ? 'मांग नोटिस' : tkLang === 'gu' ? 'માંગ નોટિસ' : 'Demand Notice';
    if (type === 'Refund Notice') return tkLang === 'hi' ? 'वापसी नोटिस' : tkLang === 'gu' ? 'રિફંડ નોટિસ' : 'Refund Notice';
    if (type === 'Deposit Recovery Notice') return tkLang === 'hi' ? 'जमा वसूली नोटिस' : tkLang === 'gu' ? 'ડિપોઝિટ વસૂલાત નોટિસ' : 'Deposit Recovery Notice';
    if (type === 'Consumer Complaint Letter') return tkLang === 'hi' ? 'उपभोक्ता शिकायत पत्र' : tkLang === 'gu' ? 'ગ્રાહક ફરિયાદ પત્ર' : 'Consumer Complaint Letter';
    if (type === 'Landlord Deposit Complaint') return tkLang === 'hi' ? 'मकान मालिक जमा शिकायत' : tkLang === 'gu' ? 'મકાનમાલિક ડિપોઝિટ ફરિયાદ' : 'Landlord Deposit Complaint';
    if (type === 'Employment Complaint') return tkLang === 'hi' ? 'रोजगार शिकायत' : tkLang === 'gu' ? 'રોજગાર ફરિયાદ' : 'Employment Complaint';
    if (type === 'Cybercrime Complaint') return tkLang === 'hi' ? 'साइबर अपराध शिकायत' : tkLang === 'gu' ? 'સાયબર ક્રાઇમ ફરિયાદ' : 'Cybercrime Complaint';
    return type;
  };

  return (
    <>
      <ToolkitCard title={t('generated_docs')} icon={FileText}>
        <div className="space-y-3">
          {/* Custom Generator trigger */}
          <div className="relative">
            <button
              onClick={() => !isQuotaExhausted && setShowGeneratorDropdown(!showGeneratorDropdown)}
              disabled={isQuotaExhausted}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold shadow-md transition-all select-none",
                isQuotaExhausted
                  ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white cursor-pointer"
              )}
            >
              <Plus className="size-3.5" />
              <span>
                {isQuotaExhausted ? t('quota_exhausted') : t('draft_complaint')}
              </span>
            </button>

            {showGeneratorDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-xl rounded-lg z-30 p-1 max-h-[220px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                <div className="text-[9px] font-bold text-muted-foreground uppercase px-2 py-1 select-none">
                  {t('legal_notices_group')}
                </div>
                {['Demand Notice', 'Refund Notice', 'Deposit Recovery Notice'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSelectDocType(type)}
                    className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-muted font-medium transition-colors"
                  >
                    {getDocTypeTranslation(type)}
                  </button>
                ))}
                <div className="h-[1px] bg-border my-1" />
                <div className="text-[9px] font-bold text-muted-foreground uppercase px-2 py-1 select-none">
                  {t('court_complaints_group')}
                </div>
                {['Consumer Complaint Letter', 'Landlord Deposit Complaint', 'Employment Complaint', 'Cybercrime Complaint'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSelectDocType(type)}
                    className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-muted font-medium transition-colors"
                  >
                    {getDocTypeTranslation(type)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {generatedDocs.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed border-border/80 rounded-xl bg-muted/20 dark:bg-muted/10 select-none">
              <FileText className="size-6 text-muted-foreground/30 mb-2" />
              <p className="text-[11px] text-muted-foreground/80 max-w-[200px] leading-relaxed">
                {t('empty_docs')}
              </p>
            </div>
          ) : (
            /* Document links list */
            <div className="space-y-2">
              {uniqueDocs.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => {
                    setActiveDoc(doc);
                    setIsEditing(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/40 hover:bg-muted cursor-pointer transition-colors select-none group"
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-3">
                    <FileText className="size-4 text-indigo-600 dark:text-purple-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">{doc.title}</span>
                      <span className="text-[10px] text-muted-foreground">{doc.type} • {doc.date}</span>
                    </div>
                  </div>
                  <button
                    className="p-1 rounded-md text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-colors shrink-0"
                    title={t('view_edit')}
                  >
                    <Eye className="size-3.5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ToolkitCard>

      {/* Modal Dialog for Document Preview & Live Edit */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => {
              setActiveDoc(null);
              setIsEditing(false);
            }}
          />
          
          <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-muted/20 dark:bg-muted/10">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-indigo-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-none">{activeDoc.title}</h3>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {activeDoc.type} • {t('live_draft_editor')}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setActiveDoc(null);
                  setIsEditing(false);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={t('close_btn')}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Document preview & edit block */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-950 font-serif text-sm leading-relaxed text-slate-800 dark:text-zinc-300 border-b border-border/80 custom-scrollbar select-text">
              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={20}
                  className="w-full font-serif text-sm leading-relaxed p-4 border border-border bg-white dark:bg-zinc-900 rounded-lg shadow-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 rounded-lg shadow-sm whitespace-pre-wrap">
                  {activeDoc.previewText}
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/80 bg-muted/20 dark:bg-muted/10 shrink-0">
              <span className="text-[10px] text-muted-foreground font-semibold">
                {t('draft_notice_warning')}
              </span>
              
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors"
                    >
                      {t('cancel_btn')}
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      {t('save_changes')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors"
                    >
                      <Edit3 className="size-3.5" />
                      <span>{t('edit_btn')}</span>
                    </button>
                    <button
                      onClick={() => handleCopy(activeDoc.previewText)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">{t('copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>{t('copy_btn')}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(activeDoc.title, activeDoc.previewText)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors"
                      title={t('download_pdf_title')}
                    >
                      <Download className="size-3.5" />
                      <span>{t('download_pdf')}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setActiveDoc(null);
                    setIsEditing(false);
                  }}
                  className="py-1.5 px-3.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-700 to-purple-600 hover:from-blue-800 hover:to-purple-700 text-white shadow-md shadow-purple-500/10"
                >
                  {t('close_preview')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- 5. CASE SUMMARY CARD ---
export function CaseSummaryCard({ summary }: { summary: Chat['summary'] }) {
  const { activeChat } = useChats();
  const tkLang = activeChat?.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);
  const { overview, legalProvisions, nextAction } = summary;

  if (!activeChat) return null;

  // Compute checklist status for case summary
  const completedEvidence = activeChat.checklist.filter(item => item.checked);
  const totalEvidence = activeChat.checklist.length;

  const handleExportSummaryPDF = () => {
    const summaryText = `CASE SUMMARY ASSESSMENT REPORT
Generated by LexiGuard • Legal Guardian AI

ISSUE CATEGORY: ${activeChat.title === 'New Case Inquiry' ? t('New Case Inquiry') : activeChat.title}

1. EXECUTIVE OVERVIEW:
${overview}

2. STANDING & RISKS:
Risk Level: ${activeChat.caseStrength.riskLevel}
Case Score: ${activeChat.caseStrength.score}%
Key Risk Factors:
${activeChat.caseStrength.riskFactors.map((f, i) => `${i + 1}. ${f}`).join('\n')}

3. VERIFIED EVIDENCE CHECKLIST:
${activeChat.checklist.map(item => `[${item.checked ? 'X' : ' '}] ${item.label}`).join('\n')}

4. RELEVANT LAWS AND PROVISIONS:
${legalProvisions.join(', ') || 'No specific sections cited.'}

5. IMMEDIATE RECOMMENDED NEXT ACTION:
${nextAction}

6. DETAILED ACTION PLAN TIMELINE:
${activeChat.timeline.map(step => `- ${step.date}: ${step.title} — ${step.description}`).join('\n')}

---
DISCLAIMER: This case summary report is generated using generative AI for informational purposes only. It does not constitute formal legal counsel or advocate advice.`;

    exportToPDF(`Case Summary - ${activeChat.title === 'New Case Inquiry' ? t('New Case Inquiry') : activeChat.title}`, summaryText);
  };

  return (
    <ToolkitCard title={t('exec_summary')} icon={ClipboardList}>
      <div className="space-y-4">
        {/* Overview */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            {t('exec_overview')}
          </span>
          <p className="text-xs text-foreground/80 leading-normal">
            {activeChat && activeChat.messages.length > 0 ? overview : t(overview)}
          </p>
        </div>

        {/* Legal provisions list */}
        {legalProvisions.length > 0 && (
          <div className="space-y-1 border-t border-border/40 pt-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {t('relevant_provisions')}
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {legalProvisions.map((provision, idx) => (
                <span 
                  key={idx} 
                  className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded px-2 py-0.5"
                >
                  {provision}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic evidence status */}
        <div className="space-y-1 border-t border-border/40 pt-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            {t('evidence_standing')}
          </span>
          <p className="text-xs font-semibold text-foreground/80">
            {completedEvidence.length} {t('of')} {totalEvidence} {t('checklist_verified')}
          </p>
        </div>

        {/* Next actions */}
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            {t('next_action_label')}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 leading-tight">
            <ArrowRight className="size-3.5 shrink-0" />
            <span>{activeChat && activeChat.messages.length > 0 ? nextAction : t(nextAction)}</span>
          </div>
        </div>

        {/* PDF Export button */}
        <div className="border-t border-border/40 pt-3">
          <button
            onClick={handleExportSummaryPDF}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-all duration-200 shadow-sm"
          >
            <Download className="size-3.5" />
            <span>{t('export_summary')}</span>
          </button>
        </div>
      </div>
    </ToolkitCard>
  );
}

// --- 6. DOCUMENT SIMPLIFIER CARD ---
export function DocumentSimplifierCard() {
  const { activeChat, removeUploadedDoc } = useChats();
  const tkLang = activeChat?.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'obligations' | 'risks' | 'deadlines'>('summary');
  const [showRawText, setShowRawText] = useState(false);

  if (!activeChat || !activeChat.uploadedDoc) return null;

  const { name, type, text } = activeChat.uploadedDoc;
  const cache = activeChat.uploadedDoc.analysisTranslationCache;
  const analysis = (cache && cache[tkLang]) ? cache[tkLang] : activeChat.uploadedDoc.analysis;

  const handleExportAnalysisPDF = () => {
    const analysisText = `DOCUMENT SIMPLIFICATION ANALYSIS REPORT
File Name: ${name}
Format: ${type}
Analyzed by LexiGuard • Document Simplifier Agent

1. PLAIN ENGLISH SUMMARY:
${analysis.summary}

2. KEY CLAUSES & EXPLANATIONS:
${analysis.clauses.map((c, i) => `${i + 1}. Clause: "${c.title}"
   Explanation: ${c.explanation}
   Risk Rating: ${c.riskLevel}`).join('\n\n')}

3. KEY USER OBLIGATIONS (WHO MUST DO WHAT):
${analysis.obligations.map(o => `- ${o}`).join('\n')}

4. POTENTIAL SYSTEM & LEGAL RISKS:
${analysis.risks.map(r => `- ${r}`).join('\n')}

5. CRITICAL DEADLINES AND DATES:
${analysis.deadlines.map(d => `- ${d.date}: ${d.action}`).join('\n')}

---
DISCLAIMER: This analysis is compiled using AI translation. Verify exact wording before signing or initiating disputes.`;

    exportToPDF(`Simplification - ${name}`, analysisText);
  };

  const getRiskBadgeColor = (risk: string) => {
    const riskNorm = risk ? risk.toLowerCase() : '';
    if (riskNorm.includes('low') || riskNorm.includes('कम') || riskNorm.includes('ઓછું')) {
      return 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60';
    }
    if (riskNorm.includes('medium') || riskNorm.includes('मध्यम') || riskNorm.includes('મધ્યમ')) {
      return 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60';
    }
    return 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60';
  };

  const getTabLabel = (tab: string) => {
    if (tab === 'summary') return t('tab_summary');
    if (tab === 'clauses') return t('tab_clauses');
    if (tab === 'obligations') return t('tab_obligations');
    if (tab === 'risks') return t('tab_risks');
    return t('tab_deadlines');
  };

  return (
    <>
      <ToolkitCard title={t('doc_simplifier')} icon={FileText}>
        <div className="space-y-3.5">
          {/* Document File metadata row */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 dark:bg-muted/15 border border-border/80 select-none">
            <div className="flex items-center gap-2 overflow-hidden pr-2">
              <FileText className="size-4.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate leading-tight">{name}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                  {t('simplified_breakdown')}
                </span>
              </div>
            </div>
            
            <button
              onClick={removeUploadedDoc}
              className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              title={t('remove_analysis')}
            >
              <Trash className="size-3.5" />
            </button>
          </div>

          {/* Quick tab controls */}
          <div className="flex flex-wrap gap-1 border-b border-border/40 pb-1 select-none">
            {(['summary', 'clauses', 'obligations', 'risks', 'deadlines'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                  activeTab === tab 
                    ? "bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </div>

          {/* Tab content viewer */}
          <div className="min-h-[160px] max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {activeTab === 'summary' && (
              <div className="space-y-1">
                <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                  {analysis.summary}
                </p>
                <div className="pt-2 text-[11px] text-muted-foreground leading-normal">
                  {analysis.text}
                </div>
              </div>
            )}

            {activeTab === 'clauses' && (
              <div className="space-y-3">
                {analysis.clauses.map((clause, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                       <h4 className="text-xs font-bold text-foreground truncate">{clause.title}</h4>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                        getRiskBadgeColor(clause.riskLevel)
                      )}>
                        {clause.riskLevel} {t('risk_suffix')}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {clause.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'obligations' && (
              <ul className="space-y-2">
                {analysis.obligations.map((ob, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80 leading-normal pl-0.5">
                    <span className="size-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{ob}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === 'risks' && (
              <ul className="space-y-2">
                {analysis.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80 leading-normal pl-0.5">
                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5 animate-pulse" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === 'deadlines' && (
              <div className="space-y-2.5">
                {analysis.deadlines.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    {t('no_deadlines')}
                  </p>
                ) : (
                  analysis.deadlines.map((dl, idx) => (
                     <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg border border-dashed border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/20">
                      <Calendar className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{dl.date}</span>
                        <span className="text-[11px] text-foreground/80 leading-snug">{dl.action}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40 select-none">
            <button
              onClick={() => setShowRawText(true)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold border border-border hover:bg-muted text-foreground transition-colors"
            >
              <Eye className="size-3" />
              <span>{t('extracted_text')}</span>
            </button>
            <button
              onClick={handleExportAnalysisPDF}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-500/10"
            >
              <Download className="size-3" />
              <span>{t('download_pdf')}</span>
            </button>
          </div>
        </div>
      </ToolkitCard>

      {/* Raw Extracted Text Viewer Modal */}
      {showRawText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowRawText(false)}
          />
          <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-xl overflow-hidden z-10 flex flex-col max-h-[75vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-muted/20">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <FileText className="size-4.5 text-amber-500" />
                <span>
                  {t('extracted_title')}
                </span>
              </div>
              <button 
                onClick={() => setShowRawText(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-zinc-950 font-mono text-xs leading-relaxed text-slate-800 dark:text-zinc-300 custom-scrollbar select-text whitespace-pre-wrap">
              {text}
            </div>
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-right shrink-0">
              <button
                onClick={() => setShowRawText(false)}
                className="py-1 px-4 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/95 text-white shadow-md dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-600"
              >
                {t('close_view')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- 7. EVIDENCE GAP ADVISOR CARD ---
interface EvidenceGapAdvisorCardProps {
  chat: Chat;
}

export function EvidenceGapAdvisorCard({ chat }: EvidenceGapAdvisorCardProps) {
  const tkLang = chat.chatLanguage || 'en';
  const t = (key: string) => translateKey(key, tkLang);
  const caseCategory = detectCaseCategory(chat.checklist, chat.messages);
  const gaps = calculateEvidenceGaps(caseCategory, chat.checklist);
  
  const isFullyVerified = gaps.missingEvidence.length === 0;
  const nextActionInfo = generateNextActionRecommendation(caseCategory, isFullyVerified);

  return (
    <ToolkitCard title={t('gap_advisor')} icon={Sparkles}>
      <div className="space-y-4">
        {isFullyVerified ? (
          /* Success state */
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500 animate-bounce" />
            <div className="text-xs">
              <p className="font-bold">✅ {t('all_critical_collected')}</p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 leading-normal font-medium">
                {t('all_critical_desc')}
              </p>
            </div>
          </div>
        ) : (
          /* Missing evidence and gaps list */
          <div className="space-y-3">
            {/* Missing Evidence Section */}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">{t('missing_evidence')}</span>
              <ul className="space-y-1.5">
                {gaps.missingEvidence.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                    <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why It Matters & Recommendations */}
            <div className="space-y-2 border-t border-border/50 pt-2.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">{t('why_matters')}</span>
              <div className="space-y-2">
                {gaps.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-[11px] leading-normal bg-muted/30 p-2 rounded-md border border-border/40">
                    <p className="font-semibold text-foreground text-xs">{t(rec.evidenceType)}</p>
                    <p className="text-muted-foreground mt-0.5">{t(rec.whyItMatters)}</p>
                    <div className="mt-1.5 flex items-start gap-1">
                      <span className="font-bold text-amber-500 shrink-0">{t('next_upload')}</span>
                      <span className="text-foreground font-medium">{t(rec.nextUpload)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expected Impact (if not fully verified) */}
        {!isFullyVerified && (
          <div className="border-t border-border/50 pt-3 flex items-center justify-between text-xs font-semibold bg-gradient-to-r from-amber-500/5 to-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t('current_score')}</span>
              <span className="text-base font-extrabold text-foreground">{chat.caseStrength.score}%</span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t('potential_score')}</span>
              <span className="text-base font-extrabold text-indigo-500 dark:text-amber-400 animate-pulse">{gaps.estimatedImprovedScore}%</span>
            </div>
          </div>
        )}

        {/* Recommended Next Step / Intelligence */}
        <div className="border-t border-border/50 pt-3 space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t('next_step')}</span>
          <div className="bg-primary/5 dark:bg-amber-500/10 border border-primary/20 dark:border-amber-500/20 rounded-lg p-3 space-y-1 hover:bg-primary/8 dark:hover:bg-amber-500/15 transition-all duration-300">
            <div className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 text-primary dark:text-amber-400 shrink-0 animate-ping" />
              <p className="text-xs font-bold text-primary dark:text-amber-400 leading-tight">
                {t(nextActionInfo.action)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal mt-0.5 font-medium">
              {t(nextActionInfo.reason)}
            </p>
          </div>
        </div>

      </div>
    </ToolkitCard>
  );
}
