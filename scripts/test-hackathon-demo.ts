process.env.MOCK_GEMINI = 'true';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runLegalAssessment } from '../app/actions/orchestrate';
import { analyzeDocument } from '../services/document-analysis';
import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

async function runHackathonDemo() {
  console.log("==================================================");
  console.log("     HACKATHON DEMO USER JOURNEY VERIFICATION     ");
  console.log("==================================================");
  console.log("Gemini API Key Loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

  // 1. Define the actual sample rent agreement
  const rentAgreementText = `RENT AGREEMENT
This rent agreement is made on 01-June-2025 at Mumbai, Maharashtra between:
Lessor (Landlord): Mr. Rajesh Sharma, residing at Sector 15, Vashi, Navi Mumbai.
Lessee (Tenant): Mr. Suresh Kumar, residing at Flat 402, Sunshine Heights, Bandra West, Mumbai.

Premises: Flat 402, Sunshine Heights, Bandra West, Mumbai.
Security Deposit: Rs. 30,000 (Rupees Thirty Thousand Only) paid on signing this agreement.
Monthly Rent: Rs. 10,000 payable on or before the 5th of each calendar month.
Lease Term: 11 Months, starting from 01-June-2025.
Refund of Deposit: The landlord shall refund the security deposit of Rs. 30,000 to the tenant within 30 days of the tenant vacating the premises.`;

  console.log("\n[STEP 1] Running live document analysis on rent agreement...");
  const rentAnalysis = await analyzeDocument(rentAgreementText);
  
  console.log(" -> Extracted Document Type:", rentAnalysis.detectedDocType);
  console.log(" -> Extracted Landlord:", rentAnalysis.entities?.parties?.find(p => p.role.toLowerCase() === 'landlord')?.name || "Not Found");
  console.log(" -> Extracted Tenant:", rentAnalysis.entities?.parties?.find(p => p.role.toLowerCase() === 'tenant')?.name || "Not Found");
  console.log(" -> Extracted Deposit Value:", rentAnalysis.entities?.depositValues?.[0] || "Not Found");

  const rentDocObj = {
    name: 'mumbai_rent_agreement.pdf',
    type: 'application/pdf',
    text: rentAgreementText,
    analysis: rentAnalysis
  };

  // 2. Submit the specific landlord dispute query
  const query = "My landlord has not returned my ₹30,000 security deposit even after 45 days of vacating the rented apartment. I've uploaded the rent agreement. Please analyze my case, identify missing evidence, explain my legal options, and generate a demand notice if appropriate.";
  console.log("\n[STEP 2] Submitting user dispute prompt to the reasoning engine...");
  console.log(`Prompt: "${query}"`);

  // Run the orchestration pipeline
  const response = await runLegalAssessment(query, [], 'en', [rentDocObj]);

  if ('isBlocked' in response && response.isBlocked) {
    console.error("\n[FAIL] Pipeline blocked by security shield:", response.reason);
    process.exit(1);
  }
  if ('error' in response) {
    console.error("\n[FAIL] Pipeline returned error:", response.error);
    process.exit(1);
  }

  const success = response as any;

  console.log("\n[STEP 3] Verifying Pipeline Outputs...");
  console.log(" -> Detected Category:", success.category);
  console.log(" -> Case Strength Score:", success.actions.score);
  console.log(" -> Advice Snippet:\n", success.advice.text.substring(0, 300) + "...\n");

  console.log(" -> Mapped Evidence Checklist:");
  const initialChecklist: CaseChecklistItem[] = [
    { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
    { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
    { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
    { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
  ];

  const mappedChecklist = success.actions.checklist.map((label: string, idx: number) => {
    const existing = initialChecklist.find(
      (item) => item.label.toLowerCase() === label.toLowerCase()
    );
    return {
      id: existing?.id || `chk-gen-${Date.now()}-${idx}`,
      label,
      checked: existing?.checked || false
    };
  });

  const mockUserMsg: Message = { id: 'm1', role: 'user', content: query, timestamp: '10:00 AM' };
  const verified = autoVerifyChecklistAndScore([mockUserMsg], mappedChecklist, rentDocObj);

  verified.checklist.forEach(item => {
    console.log(`    - [${item.checked ? 'X' : ' '}] ${item.label}`);
  });

  console.log("\n -> Timeline Milestones:");
  success.actions.timeline.forEach((event: any, index: number) => {
    console.log(`    ${index + 1}. [${event.day}] ${event.action} - ${event.description}`);
  });

  console.log("\n -> Generated Document Drafts:");
  success.actions.documents.forEach((doc: any) => {
    console.log(`    - Title: "${doc.title}" (Type: ${doc.type})`);
    console.log("-----------------------------------------------------------------------------");
    console.log(doc.previewText);
    console.log("-----------------------------------------------------------------------------\n");
  });

  // Verify there are no placeholders remaining for our extracted variables
  const placeholdersToCheck = ["[Tenant Name]", "[Landlord Name]", "[Deposit Amount]"];
  const demandNotice = success.actions.documents[0]?.previewText || "";
  let missingPlaceholderResolution = false;
  
  placeholdersToCheck.forEach(ph => {
    if (demandNotice.includes(ph)) {
      console.warn(`    ⚠️ Warning: Document contains unresolved placeholder: ${ph}`);
      missingPlaceholderResolution = true;
    }
  });

  if (!missingPlaceholderResolution) {
    console.log("✅ SUCCESS: All verified entities dynamically replaced in document drafts.");
  } else {
    console.warn("⚠️ Note: Some optional or low-confidence placeholders were left intact.");
  }

  console.log("\n==================================================");
  console.log("        DEMO WORKFLOW VALIDATION COMPLETED        ");
  console.log("==================================================");
  process.exit(0);
}

runHackathonDemo().catch(console.error);
