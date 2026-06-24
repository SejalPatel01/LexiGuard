import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { CaseChecklistItem, Chat } from '../types';
import { DocumentAnalyzerResponse } from '../types/agents';

console.log("==================================================");
console.log("    SIMULATED END-TO-END UI WORKFLOW TEST RUN     ");
console.log("==================================================\n");

const landlordChecklist: CaseChecklistItem[] = [
  { id: 'chk-l-1', label: 'Rent Agreement', checked: false },
  { id: 'chk-l-2', label: 'Bank Transfer Proof', checked: false },
  { id: 'chk-l-3', label: 'WhatsApp Messages', checked: false },
  { id: 'chk-l-4', label: 'Property Handover Document', checked: false },
  { id: 'chk-l-5', label: 'Witness statement/declaration', checked: false },
  { id: 'chk-l-6', label: 'Screenshots / Visual Evidence', checked: false }
];

function printUIState(stepTitle: string, uploadFile: string, checklist: CaseChecklistItem[], score: number, riskLevel: string) {
  console.log(`\n[UI STEP] ${stepTitle}`);
  console.log(`[UI] Staged Composer Attached: 📎 ${uploadFile}`);
  console.log("--------------------------------------------------");
  console.log("   EVIDENCE CHECKLIST STATUS IN UI CARD           ");
  console.log("--------------------------------------------------");
  checklist.forEach(item => {
    const status = item.checked ? "✓ [VERIFIED]" : "  [PENDING] ";
    console.log(`  ${status} ${item.label}`);
  });
  console.log("--------------------------------------------------");
  console.log(`[UI] Case Score: ${score}% | Risk Level: ${riskLevel}`);
  console.log("==================================================");
}

function runSimulations() {
  let allPassed = true;

  // 1. Scenario 1: Upload a Rent Agreement containing "bank transfer", "WhatsApp", and "email".
  // Rent Agreement is Lease Agreement -> Rent Agreement checklist item only
  const rentAnalysis: DocumentAnalyzerResponse = {
    summary: "Rent agreement between Suresh (Tenant) and Rajesh (Landlord)",
    clauses: [], obligations: [], deadlines: [], risks: [], text: "Rent agreement...",
    detectedDocType: "Rent Agreement",
    entities: {
      names: ["Suresh", "Rajesh"],
      depositValues: ["Rs. 45,000"],
      agreementNumbers: ["RA-2026-9988"],
      phoneNumbers: [],
      emailAddresses: []
    }
  };
  const rentDocObj = {
    id: 'rent-doc',
    name: 'rent_agreement_lured.pdf',
    type: 'application/pdf',
    text: 'This lease is a rent agreement. Payment is made by bank transfer. Communication was done on WhatsApp.',
    analysis: rentAnalysis
  };
  
  const res1 = autoVerifyChecklistAndScore([], landlordChecklist, rentDocObj);
  const checked1 = res1.checklist.filter(i => i.checked).map(i => i.label);
  printUIState("Upload 1: Rent Agreement with lures", rentDocObj.name, res1.checklist, res1.caseStrength.score, res1.caseStrength.riskLevel);
  
  if (checked1.length === 1 && checked1[0] === 'Rent Agreement' && res1.caseStrength.score === 40) {
    console.log(" -> RESULT: PASS (Only Rent Agreement checked, Bank Proof and Communication are unchecked)");
  } else {
    console.error(" -> RESULT: FAIL!");
    allPassed = false;
  }

  // 2. Scenario 2: Upload a Bank Receipt.
  // Bank Receipt -> Bank Proof checklist item only
  const bankAnalysis: DocumentAnalyzerResponse = {
    summary: "HDFC bank receipt of deposit payment",
    clauses: [], obligations: [], deadlines: [], risks: [], text: "HDFC transaction details...",
    detectedDocType: "Bank Receipt",
    entities: {
      names: ["Suresh", "Rajesh"],
      amounts: ["Rs. 45,000"],
      depositValues: ["Rs. 45,000"],
      agreementNumbers: ["TXN-12345"]
    }
  };
  const bankDocObj = {
    id: 'bank-doc',
    name: 'deposit_receipt.pdf',
    type: 'application/pdf',
    text: 'Receipt of deposit payment via bank transfer.',
    analysis: bankAnalysis
  };
  
  const res2 = autoVerifyChecklistAndScore([], landlordChecklist, bankDocObj);
  const checked2 = res2.checklist.filter(i => i.checked).map(i => i.label);
  printUIState("Upload 2: Bank Receipt", bankDocObj.name, res2.checklist, res2.caseStrength.score, res2.caseStrength.riskLevel);

  if (checked2.length === 1 && checked2[0] === 'Bank Transfer Proof' && res2.caseStrength.score === 40) {
    console.log(" -> RESULT: PASS (Only Bank Proof checked)");
  } else {
    console.error(" -> RESULT: FAIL!");
    allPassed = false;
  }

  // 3. Scenario 3: Upload a WhatsApp Screenshot.
  // WhatsApp Screenshot -> Communication checklist item only
  const chatAnalysis: DocumentAnalyzerResponse = {
    summary: "WhatsApp keys handover conversation",
    clauses: [], obligations: [], deadlines: [], risks: [], text: "WhatsApp chat text...",
    detectedDocType: "WhatsApp Screenshot",
    entities: {
      names: ["Suresh", "Rajesh"],
      dates: ["20-June-2026"]
    }
  };
  const chatDocObj = {
    id: 'chat-doc',
    name: 'whatsapp_keys_chat.png',
    type: 'image/png',
    text: 'Suresh sent bank transfer proof screenshot.',
    analysis: chatAnalysis
  };

  const res3 = autoVerifyChecklistAndScore([], landlordChecklist, chatDocObj);
  const checked3 = res3.checklist.filter(i => i.checked).map(i => i.label);
  printUIState("Upload 3: WhatsApp Screenshot", chatDocObj.name, res3.checklist, res3.caseStrength.score, res3.caseStrength.riskLevel);

  if (checked3.length === 1 && checked3[0] === 'WhatsApp Messages' && res3.caseStrength.score === 40) {
    console.log(" -> RESULT: PASS (Only Communication checked)");
  } else {
    console.error(" -> RESULT: FAIL!");
    allPassed = false;
  }

  // 4. Scenario 4: Upload a non-legal document (chart/image/dashboard screenshot).
  // Non-legal -> verifies nothing, score is default (15)
  const chartAnalysis: DocumentAnalyzerResponse = {
    summary: "Chart performance",
    clauses: [], obligations: [], deadlines: [], risks: [], text: "Dashboard text...",
    detectedDocType: "Other"
  };
  const chartDocObj = {
    id: 'chart-doc',
    name: 'sales_dashboard.jpg',
    type: 'image/jpeg',
    text: 'Monthly performance chart.',
    analysis: chartAnalysis
  };

  const res4 = autoVerifyChecklistAndScore([], landlordChecklist, chartDocObj);
  const checked4 = res4.checklist.filter(i => i.checked).map(i => i.label);
  printUIState("Upload 4: Non-legal Document", chartDocObj.name, res4.checklist, res4.caseStrength.score, res4.caseStrength.riskLevel);

  if (checked4.length === 0 && res4.caseStrength.score === 15) {
    console.log(" -> RESULT: PASS (No checklist items checked, score remains at default baseline 15)");
  } else {
    console.error(" -> RESULT: FAIL!");
    allPassed = false;
  }

  // 5. Scenario 5: Upload multiple documents from different categories.
  // Multiple uploads: Rent + Bank -> Rent Agreement and Bank Transfer Proof checked
  const res5 = autoVerifyChecklistAndScore([], landlordChecklist, undefined, [rentDocObj, bankDocObj]);
  const checked5 = res5.checklist.filter(i => i.checked).map(i => i.label);
  printUIState("Upload 5: Multiple Docs (Rent Agreement + Bank Receipt)", "rent_agreement_lured.pdf, deposit_receipt.pdf", res5.checklist, res5.caseStrength.score, res5.caseStrength.riskLevel);

  if (checked5.length === 2 && checked5.includes('Rent Agreement') && checked5.includes('Bank Transfer Proof') && res5.caseStrength.score === 65) {
    console.log(" -> RESULT: PASS (Each document verifies only its own checklist item, score is 65)");
  } else {
    console.error(" -> RESULT: FAIL!");
    allPassed = false;
  }

  console.log("\n==================================================");
  if (allPassed) {
    console.log("      ALL E2E MOCKED SCENARIOS PASSED!            ");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error("      SOME E2E MOCKED SCENARIOS FAILED!           ");
    console.log("==================================================");
    process.exit(1);
  }
}

runSimulations();
