import { runClassifierAgent } from '../agents/issue-classifier';
import { runAdvisorAgent } from '../agents/legal-advisor';
import { runDocumentAnalyzerAgent } from '../agents/document-analyzer';
import { runActionGeneratorAgent } from '../agents/action-generator';
import { OrchestratorResult, LegalAdvisorResponse, CaseContext, DocumentAnalyzerResponse } from '../types/agents';
import { resolveEntities, determineRoleSemantically, validateName } from './entity-resolver';
import {
  detectCaseCategory,
  getDefaultChecklist,
  verifyChecklist,
  calculateWeightedScoreAndRisks,
  generateNextActionRecommendation,
  mapToUniversalEvidenceCategory
} from './evaluation';

// Helper to map LegalCategory to evaluation key
function mapCategoryToEvalKey(cat: string): 'landlord' | 'employment' | 'consumer' | 'cyber' | 'general' {
  if (cat === 'Landlord / Property Issue') return 'landlord';
  if (cat === 'Employment Dispute' || cat === 'Employment / Wage Issue') return 'employment';
  if (cat === 'Consumer Complaint') return 'consumer';
  if (cat === 'Cybercrime' || cat === 'Cyber Fraud') return 'cyber';
  return 'general';
}

/**
 * Checks if the user query is explicitly requesting a legal document draft or template generation.
 */
function isDocumentGenerationRequest(query: string): boolean {
  const normalized = query.toLowerCase();
  
  const genKeywords = ['generate', 'create', 'draft', 'write', 'prepare'];
  const docKeywords = ['complaint letter', 'legal notice', 'notice', 'email draft', 'complaint', 'fir draft'];
  
  const hasGen = genKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(normalized));
  const hasDoc = docKeywords.some(kw => normalized.includes(kw));
  
  return hasGen && hasDoc;
}

/**
 * Output Validation Layer: Resolves contradictions and fills placeholders cleanly.
 */
function validateAndCorrectOutput(
  rawResult: OrchestratorResult,
  caseContext: CaseContext
): OrchestratorResult {
  const result = { ...rawResult };
  const evalKey = mapCategoryToEvalKey(caseContext.category);

  if (result.actions && result.actions.documents) {
    const resolved = caseContext.resolvedEntities || [];
    
    const isValidAmount = (val: string): boolean => {
      if (!val) return false;
      const hasDigits = /\d+/.test(val);
      const hasDateWord = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|road|street|flat|building|dated/i.test(val);
      const hasSlashOrHyphenDate = /\d{1,4}[-/]\d{1,4}[-/]\d{1,4}/.test(val);
      return hasDigits && !hasDateWord && !hasSlashOrHyphenDate;
    };

    const isValidDate = (val: string): boolean => {
      if (!val) return false;
      const hasCurrencySymbol = /[₹$]/.test(val) || /\brs\b|\binr\b/i.test(val);
      const hasDigits = /\d+/.test(val);
      const hasMonth = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(val);
      const hasSlashesOrHyphens = /[-/]/.test(val);
      return hasDigits && !hasCurrencySymbol && (hasMonth || hasSlashesOrHyphens || val.includes('202'));
    };

    const isValidAddress = (val: string): boolean => {
      if (!val) return false;
      const addressKeywords = /flat|apartment|house|plot|street|road|lane|society|sector|block|village|city|state|pin|country|nagar|heights|floor|building|bldg|hno|st|rd/i;
      return addressKeywords.test(val);
    };

    const isValidName = (name: string): boolean => {
      if (!name) return false;
      if (isValidAddress(name)) return false;
      if (isValidDate(name)) return false;
      if (isValidAmount(name)) return false;
      if (/^(my landlord|my employer|my company|my manager|my bank|the landlord|the employer|the company|the manager|the bank|my|the)$/i.test(name.trim())) {
        return false;
      }
      return name.trim().length > 1;
    };

    const senderRoles = ['tenant', 'lessee', 'occupant', 'employee', 'staff', 'worker', 'buyer', 'consumer', 'customer', 'victim', 'complainant', 'plaintiff'];
    const recipientRoles = ['landlord', 'lessor', 'owner', 'employer', 'company', 'management', 'seller', 'merchant', 'retailer', 'dealer', 'accused', 'respondent', 'defendant'];

    const senderEntity = resolved.find(e => 
      e.entityType === 'Person' && 
      e.confidence >= 0.85 && 
      e.legalRole && senderRoles.includes(e.legalRole.toLowerCase())
    );

    const recipientEntity = resolved.find(e => 
      e.entityType === 'Person' && 
      e.confidence >= 0.85 && 
      e.legalRole && recipientRoles.includes(e.legalRole.toLowerCase())
    );

    const fallbackSender = caseContext.parties.find(p => p.role && senderRoles.includes(p.role.toLowerCase()));
    const fallbackRecipient = caseContext.parties.find(p => p.role && recipientRoles.includes(p.role.toLowerCase()));

    const senderName = validateName(senderEntity?.value || fallbackSender?.name || '');
    const recipientName = validateName(recipientEntity?.value || fallbackRecipient?.name || '');

    const addresses = resolved.filter(e => e.entityType === 'Address' && e.confidence >= 0.85).map(e => e.value);
    
    let landlordAddress = "";
    let tenantAddress = "";
    let propertyAddress = "";
    const docText = caseContext.uploadedDocs?.[0]?.text || "";
    const normalizedDoc = docText.replace(/\s+/g, ' ');

    for (const addr of addresses) {
      if (!isValidAddress(addr)) continue;
      const normalizedAddr = addr.replace(/\s+/g, ' ');
      const idx = normalizedDoc.indexOf(normalizedAddr);
      if (idx !== -1) {
        const precedingText = normalizedDoc.substring(Math.max(0, idx - 150), idx).toLowerCase();
        if (precedingText.includes("landlord") || precedingText.includes("lessor") || precedingText.includes("sharma") || precedingText.includes("vashi") || precedingText.includes("employer") || precedingText.includes("seller")) {
          landlordAddress = addr;
        } else if (precedingText.includes("tenant") || precedingText.includes("lessee") || precedingText.includes("kumar") || precedingText.includes("bandra") || precedingText.includes("employee") || precedingText.includes("buyer")) {
          tenantAddress = addr;
        }
        if (precedingText.includes("premises") || precedingText.includes("property")) {
          propertyAddress = addr;
        }
      }
    }

    if (!propertyAddress && addresses.length > 0) {
      const fallbackAddr = addresses.find(a => a.toLowerCase().includes("flat") || a.toLowerCase().includes("house") || a.toLowerCase().includes("plot") || a.toLowerCase().includes("street")) || addresses[addresses.length - 1];
      if (isValidAddress(fallbackAddr)) {
        propertyAddress = fallbackAddr;
      }
    }
    if (landlordAddress === propertyAddress) landlordAddress = "";
    if (tenantAddress === propertyAddress) tenantAddress = "";

    const depositEntity = resolved.find(e => e.entityType === 'Amount' && e.legalRole === 'Deposit');
    const amountEntity = resolved.find(e => e.entityType === 'Amount' && e.legalRole !== 'Deposit');
    
    let depositVal = depositEntity?.value || caseContext.entities.depositValues?.[0] || "";
    let amountVal = amountEntity?.value || caseContext.entities.amounts?.[0] || "";

    if (!isValidAmount(depositVal)) depositVal = "";
    if (!isValidAmount(amountVal)) amountVal = "";

    let dateVal = "";
    if (caseContext.entities.legalDates && caseContext.entities.legalDates.length > 0) {
      dateVal = caseContext.entities.legalDates[0];
    } else if (caseContext.entities.dates && caseContext.entities.dates.length > 0) {
      dateVal = caseContext.entities.dates[0];
    }
    if (!isValidDate(dateVal)) dateVal = "";

    // Semantic vacation date resolver
    let vacationDateVal = "";
    const docLower = docText.toLowerCase();
    const queryLower = (caseContext.facts || "").toLowerCase();
    const datesPool = [...(caseContext.entities.legalDates || []), ...(caseContext.entities.dates || [])];
    for (const dt of datesPool) {
      if (!isValidDate(dt)) continue;
      const qIdx = queryLower.indexOf(dt.toLowerCase());
      if (qIdx !== -1) {
        const context = queryLower.substring(Math.max(0, qIdx - 40), Math.min(queryLower.length, qIdx + dt.length + 40));
        if (/vacat|move|handover|leave|left/i.test(context)) {
          vacationDateVal = dt;
          break;
        }
      }
      const dIdx = docLower.indexOf(dt.toLowerCase());
      if (dIdx !== -1) {
        const context = docLower.substring(Math.max(0, dIdx - 50), Math.min(docLower.length, dIdx + dt.length + 50));
        if (/vacat|move|handover|leave|left/i.test(context)) {
          vacationDateVal = dt;
          break;
        }
      }
    }

    const activeConflicts = caseContext.riskFactors.filter(rf => 
      rf.toLowerCase().includes("mismatch") || 
      rf.toLowerCase().includes("conflict")
    );

    result.actions.documents = result.actions.documents.map(doc => {
      let previewText = doc.previewText;

      if (activeConflicts.length > 0) {
        const warningBlock = `[DISCREPANCY WARNING: Conflicting information was detected between the verified documents and user prompt. NyayaAI has used the verified document values as the source of truth. Details:\n` +
          activeConflicts.map(c => ` - ${c}`).join('\n') + 
          `\nPlease review and edit if required.]\n\n`;
        previewText = warningBlock + previewText;
      }

      if (senderName && isValidName(senderName)) {
        previewText = previewText.replace(/\[Tenant Name\]|\[Tenant's Name\]|\[Employee Name\]|\[Employee's Name\]|\[Buyer Name\]|\[Buyer's Name\]|\[Plaintiff Name\]|\[Plaintiff's Name\]|\[Complainant Name\]|\[Complainant's Name\]|\[Your Name\]|\[Sender Name\]/g, senderName);
        previewText = previewText.replace(/\[Your Signature\]|\[Signature\]|\[Tenant's Signature\]|\[Employee's Signature\]|\[Sender's Signature\]/g, senderName);
        previewText = previewText.replace(/\[Bank Account Holder\]|\[Account Name\]/g, senderName);
      }

      if (recipientName && isValidName(recipientName) && recipientName.toLowerCase() !== senderName?.toLowerCase()) {
        previewText = previewText.replace(/\[Landlord Name\]|\[Landlord's Name\]|\[Employer Name\]|\[Employer's Name\]|\[Seller Name\]|\[Seller's Name\]|\[Defendant Name\]|\[Defendant's Name\]|\[Respondent Name\]|\[Respondent's Name\]|\[Recipient Name\]/g, recipientName);
      }

      if (landlordAddress && isValidAddress(landlordAddress)) {
        previewText = previewText.replace(/\[Landlord's Address\]|\[Landlord Address\]|\[Employer's Address\]|\[Employer Address\]|\[Seller's Address\]|\[Seller Address\]|\[Respondent's Address\]|\[Respondent Address\]|\[Opposing Party's Address\]|\[Opposing Party Address\]|\[Recipient Address\]/g, landlordAddress);
      }
      if (tenantAddress && isValidAddress(tenantAddress)) {
        previewText = previewText.replace(/\[Your Address\]|\[Tenant's Address\]|\[Tenant Address\]|\[Employee's Address\]|\[Employee Address\]|\[Buyer's Address\]|\[Buyer Address\]|\[Complainant's Address\]|\[Complainant Address\]|\[Sender's Address\]|\[Sender Address\]/g, tenantAddress);
      }
      if (propertyAddress && isValidAddress(propertyAddress)) {
        previewText = previewText.replace(/\[Property Address\]|\[Address\]|\[Premises Address\]|\[Rental Property Address\]/g, propertyAddress);
      }

      if (depositVal && isValidAmount(depositVal)) {
        previewText = previewText.replace(/\[Deposit Amount\]|\[Security Deposit\]/g, depositVal);
      }
      if (amountVal && isValidAmount(amountVal)) {
        previewText = previewText.replace(/\[Rent Amount\]|\[Claim Amount\]|\[Amount\]|\[Salary Amount\]|\[Rent\]/g, amountVal);
      }

      if (dateVal && isValidDate(dateVal)) {
        previewText = previewText.replace(/\[Date of Rent Agreement\]|\[Agreement Date\]|\[Contract Date\]/g, dateVal);
      }

      if (vacationDateVal && isValidDate(vacationDateVal)) {
        previewText = previewText.replace(/\[Date of Vacating\]|\[Vacating Date\]|\[Vacation Date\]|\[Date of Vacation\]/g, vacationDateVal);
      }

      previewText = previewText.replace(/\[Current Date\]|\[Today\]/g, new Date().toLocaleDateString());

      return {
        ...doc,
        previewText
      };
    });
  }

  const isFullyVerified = caseContext.checklist.filter(item => {
    const cat = item.evidenceCategory || mapToUniversalEvidenceCategory(item.label);
    return cat === 'Contract Evidence' || cat === 'Payment Proof' || cat === 'Communication Evidence';
  }).every(item => item.checked);

  const nextRec = generateNextActionRecommendation(evalKey, isFullyVerified);
  if (result.actions) {
    result.actions.nextAction = nextRec.action;
    result.actions.score = caseContext.score;
    result.actions.riskLevel = caseContext.riskLevel;
    result.actions.riskFactors = caseContext.riskFactors;
    result.actions.checklist = caseContext.checklist.map(item => item.label);
  }

  return result;
}



/**
 * Main agent orchestration controller.
 * Executes classification, conditional document analysis, advice generation,
 * and document/action item compilation in a unified pipeline.
 */
export async function runOrchestrationPipeline(
  userQuery: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  language: 'en' | 'hi' | 'gu' = 'en',
  uploadedDocs?: any[]
): Promise<OrchestratorResult> {
  console.log('[services/orchestrator] runOrchestrationPipeline controller invoked. Language parameter:', language);
  console.log(`[runOrchestrationPipeline] uploadedDocs received: length=${uploadedDocs?.length || 0}, contents=${JSON.stringify(uploadedDocs?.map(d => ({ name: d.name, hasAnalysis: !!d.analysis }))) || 'undefined'}`);

  // 1. Run Issue Classifier Agent
  const classification = await runClassifierAgent(userQuery);
  console.log(`[Orchestrator] Classification: ${classification.category} (Confidence: ${classification.confidence}%)`);
  
  const evalKey = mapCategoryToEvalKey(classification.category);
  const isDocAnalysisRequired = classification.isDocumentAnalysisRequired || classification.category === 'Contract Issue';
  
  // 2. Conditionally Run Document Analyzer Agent
  let analysisResult: DocumentAnalyzerResponse | undefined;
  let isDocAnalysisRun = false;

  if (uploadedDocs && uploadedDocs.length > 0) {
    console.log(`[Orchestrator] Using existing uploaded documents context (${uploadedDocs.length} file(s)).`);
    isDocAnalysisRun = true;
    analysisResult = uploadedDocs[0].analysis;
  } else if (isDocAnalysisRequired) {
    console.log(`[Orchestrator] Document analysis fallback triggered on user query...`);
    isDocAnalysisRun = true;
    analysisResult = await runDocumentAnalyzerAgent(userQuery, language);
  }

  // 3. Build Immutable CaseContext (Single Source of Truth)
  const defaultChecklist = getDefaultChecklist(evalKey);
  const checklist = verifyChecklist(evalKey, defaultChecklist, chatHistory.map(h => ({ ...h, id: '', timestamp: '' })), uploadedDocs || []);
  const evaluationResult = calculateWeightedScoreAndRisks(evalKey, checklist, uploadedDocs || (analysisResult ? [{ name: 'Input Text', type: 'text', text: userQuery, analysis: analysisResult }] : []), userQuery);

  // Dynamic parties extraction fallback if empty
  let parties = analysisResult?.entities?.parties || [];
  
  const docTextText = uploadedDocs?.[0]?.text || analysisResult?.text || userQuery || "";
  const resolved = resolveEntities(
    analysisResult?.entities?.names || [],
    analysisResult?.entities?.addresses || [],
    analysisResult?.entities?.phoneNumbers || [],
    analysisResult?.entities?.emailAddresses || [],
    docTextText,
    classification.category,
    parties
  );

  const resolvedParties = resolved
    .filter(e => e.entityType === 'Person' && e.legalRole !== 'Other')
    .map(e => ({ name: e.value, role: e.legalRole }));
  
  if (resolvedParties.length > 0) {
    parties = resolvedParties;
  } else if (parties.length === 0 && analysisResult?.entities?.names && analysisResult.entities.names.length > 0) {
    // Low-confidence fallback based on extraction order
    const names = analysisResult.entities.names;
    const isLandlordCase = classification.category === 'Landlord / Property Issue';
    const isEmployment = classification.category === 'Employment Dispute';
    const isConsumer = classification.category === 'Consumer Complaint';
    if (names[0]) {
      parties.push({
        name: names[0],
        role: isLandlordCase ? 'Landlord' : isEmployment ? 'Employer' : isConsumer ? 'Seller' : 'Respondent'
      });
    }
    if (names[1]) {
      parties.push({
        name: names[1],
        role: isLandlordCase ? 'Tenant' : isEmployment ? 'Employee' : isConsumer ? 'Buyer' : 'Complainant'
      });
    }
  }

  const caseContext: CaseContext = {
    category: classification.category,
    parties: parties,
    uploadedDocs: uploadedDocs || [],
    facts: chatHistory.filter(m => m.role === 'user').map(m => m.content).join('\n') || userQuery,
    entities: analysisResult?.entities || {},
    checklist,
    timeline: [], // Generator will build detailed events
    score: evaluationResult.score,
    riskLevel: evaluationResult.riskLevel,
    riskFactors: evaluationResult.riskFactors,
    nextAction: generateNextActionRecommendation(evalKey, evaluationResult.score > 70).action,
    resolvedEntities: resolved
  };

  // Compile shared context text for downstream agents
  const analysisContext = analysisResult 
    ? `Document Summary: ${analysisResult.summary || ''}
Key Risks: ${analysisResult.risks ? analysisResult.risks.join(', ') : ''}
Extracted Entities: ${JSON.stringify(analysisResult.entities || {})}
Lessor/Landlord/Employer Parties: ${JSON.stringify(caseContext.parties || [])}`
    : undefined;

  let advice: LegalAdvisorResponse;
  let actions;

  // Check if it's a document generation request
  const isDocGen = isDocumentGenerationRequest(userQuery);

  if (isDocGen) {
    console.log(`[Orchestrator] Document generation request detected. Bypassing normal Legal Advisor Agent...`);
    
    actions = await runActionGeneratorAgent(
      userQuery,
      classification.category,
      `Draft the requested document matching the user's specific query: "${userQuery}". Ensure it contains: Date, Subject, Facts, Request, and Signature sections.`,
      analysisContext,
      analysisResult?.detectedDocType,
      language
    );

    const noteText = language === 'hi' 
      ? "दस्तावेज़ सफलतापूर्वक उत्पन्न हुआ।" 
      : language === 'gu' 
        ? "દસ્તાવેજ સફળતાપૂર્વક જનરેટ થયો." 
        : "Document generated successfully as requested.";

    const failedText = language === 'hi'
      ? "दस्तावेज़ प्रारूप उत्पन्न करने में विफल।"
      : language === 'gu'
        ? "દસ્તાવેજ ડ્રાફ્ટ જનરેટ કરવામાં નિષ્ફળ."
        : "Failed to generate document draft.";

    advice = {
      rights: [],
      actions: [],
      notes: [noteText],
      text: actions.documents[0]?.previewText || failedText
    };
  } else {
    // 3. Run Legal Advisor Agent (Normal Flow)
    console.log(`[Orchestrator] Generating legal advice...`);
    advice = await runAdvisorAgent(userQuery, classification.category, analysisContext, language);

    // 4. Run Action & Document Generator Agent (Normal Flow)
    console.log(`[Orchestrator] Generating action plans and drafts...`);
    actions = await runActionGeneratorAgent(
      userQuery,
      classification.category,
      advice.text,
      analysisContext,
      analysisResult?.detectedDocType,
      language
    );
  }

  console.log(`[Orchestrator] Pipeline executed. Running Output Validation Layer...`);

  // Assemble initial orchestrator result
  const rawResult: OrchestratorResult = {
    category: classification.category,
    isDocumentAnalysisRun: isDocAnalysisRun,
    classification,
    analysis: analysisResult,
    advice,
    actions,
    caseContext
  };

  // Run validation checks and apply corrections
  const validatedResult = validateAndCorrectOutput(rawResult, caseContext);

  return validatedResult;
}
