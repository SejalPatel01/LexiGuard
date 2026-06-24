import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { analyzeDocument } from '../services/document-analysis';
import { CaseChecklistItem, Chat } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// 1. Manually load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

console.log("==================================================");
console.log("    REAL END-TO-END LIVE UI WORKFLOW VERIFICATION  ");
console.log("==================================================\n");
console.log("Gemini API Key Loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

const landlordChecklist: CaseChecklistItem[] = [
  { id: 'chk-l-1', label: 'Rent Agreement', checked: false },
  { id: 'chk-l-2', label: 'Bank Transfer Proof', checked: false },
  { id: 'chk-l-3', label: 'WhatsApp Messages', checked: false },
  { id: 'chk-l-4', label: 'Property Handover Document', checked: false },
  { id: 'chk-l-5', label: 'Witness statement/declaration', checked: false },
  { id: 'chk-l-6', label: 'Screenshots / Visual Evidence', checked: false }
];

async function runTestScenario() {
  let allPassed = true;

  // -----------------------------------------------------------------------------
  // Scenario 1: Upload a Rent Agreement containing "bank transfer", "WhatsApp", and "email".
  // -----------------------------------------------------------------------------
  console.log("\n--- Scenario 1: Rent Agreement with lure keywords ---");
  const rentText = `LEASE AGREEMENT
This agreement is entered into Rajesh Landlord (Lessor) and Suresh Tenant (Lessee) on 01-June-2026.
Premises: Mumbai House.
Security Deposit: Rs. 45,000. Rent: Rs. 15,000 per month.
Under the lease rules, the monthly rent and deposit payment must be done via bank transfer.
All landlord-tenant communication, issues, and notice history must be maintained over email or WhatsApp chat logs.`;

  console.log("Analyzing rent agreement via live Gemini model...");
  const rentAnalysis = await analyzeDocument(rentText);
  console.log(" -> Detected Document Type:", rentAnalysis.detectedDocType);
  console.log(" -> Extracted Entities:", JSON.stringify(rentAnalysis.entities));

  const rentDocObj = {
    id: 'rent-doc',
    name: 'rent_agreement_lured.pdf',
    type: 'application/pdf',
    text: rentText,
    analysis: rentAnalysis
  };

  const result1 = autoVerifyChecklistAndScore([], landlordChecklist, rentDocObj);
  const checked1 = result1.checklist.filter(i => i.checked).map(i => i.label);
  console.log(" -> Mapped Checklist Items Checked:", checked1);
  console.log(" -> Case Strength Score:", result1.caseStrength.score);

  if (checked1.length === 1 && checked1[0] === 'Rent Agreement') {
    console.log(" -> \x1b[32m✔ Scenario 1 PASSED: Only Rent Agreement was verified. Bank Proof and Communication remain unchecked.\x1b[0m");
  } else {
    console.error(" -> \x1b[31m✘ Scenario 1 FAILED! Checked items:\x1b[0m", checked1);
    allPassed = false;
  }

  // -----------------------------------------------------------------------------
  // Scenario 2: Upload a Bank Receipt.
  // -----------------------------------------------------------------------------
  console.log("\n--- Scenario 2: Bank Receipt ---");
  const bankText = `HDFC BANK TRANSACTION RECEIPT
Date: 20-June-2026
Transaction ID: TXN-9988776655
Transfer of Rs. 45,000 from Suresh Tenant to Rajesh Landlord.
Description: Security deposit payment for Mumbai House.`;

  console.log("Analyzing bank receipt via live Gemini model...");
  const bankAnalysis = await analyzeDocument(bankText);
  console.log(" -> Detected Document Type:", bankAnalysis.detectedDocType);
  console.log(" -> Extracted Entities:", JSON.stringify(bankAnalysis.entities));

  const bankDocObj = {
    id: 'bank-doc',
    name: 'bank_transfer_receipt.pdf',
    type: 'application/pdf',
    text: bankText,
    analysis: bankAnalysis
  };

  const result2 = autoVerifyChecklistAndScore([], landlordChecklist, bankDocObj);
  const checked2 = result2.checklist.filter(i => i.checked).map(i => i.label);
  console.log(" -> Mapped Checklist Items Checked:", checked2);
  console.log(" -> Case Strength Score:", result2.caseStrength.score);

  if (checked2.length === 1 && checked2[0] === 'Bank Transfer Proof') {
    console.log(" -> \x1b[32m✔ Scenario 2 PASSED: Only Bank Proof is verified.\x1b[0m");
  } else {
    console.error(" -> \x1b[31m✘ Scenario 2 FAILED! Checked items:\x1b[0m", checked2);
    allPassed = false;
  }

  // -----------------------------------------------------------------------------
  // Scenario 3: Upload a WhatsApp Screenshot.
  // -----------------------------------------------------------------------------
  console.log("\n--- Scenario 3: WhatsApp Screenshot ---");
  const whatsappText = `WhatsApp Chat - Rajesh Landlord & Suresh Tenant
[20-June-2026, 11:30 AM] Suresh: Hi Rajesh, I have transferred the security deposit.
[20-June-2026, 11:32 AM] Rajesh: Yes Suresh, I received the bank transfer of Rs 45000. I will share the keys tomorrow.`;

  console.log("Analyzing WhatsApp screenshot via live Gemini model...");
  const whatsappAnalysis = await analyzeDocument(whatsappText);
  console.log(" -> Detected Document Type:", whatsappAnalysis.detectedDocType);
  console.log(" -> Extracted Entities:", JSON.stringify(whatsappAnalysis.entities));

  const chatDocObj = {
    id: 'chat-doc',
    name: 'whatsapp_keys_chat.png',
    type: 'image/png',
    text: whatsappText,
    analysis: whatsappAnalysis
  };

  const result3 = autoVerifyChecklistAndScore([], landlordChecklist, chatDocObj);
  const checked3 = result3.checklist.filter(i => i.checked).map(i => i.label);
  console.log(" -> Mapped Checklist Items Checked:", checked3);
  console.log(" -> Case Strength Score:", result3.caseStrength.score);

  if (checked3.length === 1 && checked3[0] === 'WhatsApp Messages') {
    console.log(" -> \x1b[32m✔ Scenario 3 PASSED: Only Communication is verified.\x1b[0m");
  } else {
    console.error(" -> \x1b[31m✘ Scenario 3 FAILED! Checked items:\x1b[0m", checked3);
    allPassed = false;
  }

  // -----------------------------------------------------------------------------
  // Scenario 4: Upload a non-legal document (chart/image/dashboard screenshot).
  // -----------------------------------------------------------------------------
  console.log("\n--- Scenario 4: Non-legal Document ---");
  const chartText = `REVENUE PERFORMANCE DASHBOARD
Month: May 2026
Product A sales: $5,000
Product B sales: $12,000
Pageviews: 145,000
Conversion Rate: 2.3%
Rent: $0 (unrelated statistics data)`;

  console.log("Analyzing non-legal chart via live Gemini model...");
  const chartAnalysis = await analyzeDocument(chartText);
  console.log(" -> Detected Document Type:", chartAnalysis.detectedDocType);

  const chartDocObj = {
    id: 'chart-doc',
    name: 'revenue_dashboard.png',
    type: 'image/png',
    text: chartText,
    analysis: chartAnalysis
  };

  const result4 = autoVerifyChecklistAndScore([], landlordChecklist, chartDocObj);
  const checked4 = result4.checklist.filter(i => i.checked).map(i => i.label);
  console.log(" -> Mapped Checklist Items Checked:", checked4);
  console.log(" -> Case Strength Score:", result4.caseStrength.score);

  if (checked4.length === 0 && result4.caseStrength.score === 15) {
    console.log(" -> \x1b[32m✔ Scenario 4 PASSED: No checklist items verified, score remains at default (15).\x1b[0m");
  } else {
    console.error(" -> \x1b[31m✘ Scenario 4 FAILED! Checked items:\x1b[0m", checked4, "Score:", result4.caseStrength.score);
    allPassed = false;
  }

  // -----------------------------------------------------------------------------
  // Scenario 5: Upload multiple documents from different categories.
  // -----------------------------------------------------------------------------
  console.log("\n--- Scenario 5: Multiple Uploads (Rent Agreement + Bank Receipt) ---");
  const uploadedDocs = [rentDocObj, bankDocObj];
  
  const result5 = autoVerifyChecklistAndScore([], landlordChecklist, undefined, uploadedDocs);
  const checked5 = result5.checklist.filter(i => i.checked).map(i => i.label);
  console.log(" -> Mapped Checklist Items Checked:", checked5);
  console.log(" -> Case Strength Score:", result5.caseStrength.score);

  if (checked5.length === 2 && checked5.includes('Rent Agreement') && checked5.includes('Bank Transfer Proof')) {
    console.log(" -> \x1b[32m✔ Scenario 5 PASSED: Each document verifies only its own mapped checklist item. No cross-leakage.\x1b[0m");
  } else {
    console.error(" -> \x1b[31m✘ Scenario 5 FAILED! Checked items:\x1b[0m", checked5);
    allPassed = false;
  }

  console.log("\n==================================================");
  if (allPassed) {
    console.log("      ALL E2E WORKFLOW SCENARIOS PASSED!          ");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error("      SOME E2E WORKFLOW SCENARIOS FAILED!         ");
    console.log("==================================================");
    process.exit(1);
  }
}

runTestScenario().catch(err => {
  console.error("Critical error in E2E simulation run:", err);
  process.exit(1);
});
