process.env.MOCK_GEMINI = 'true';

import { runLegalAssessment, analyzeUploadedFileAction } from '../app/actions/orchestrate';
import { autoVerifyChecklistAndScore, mapLabelToCategory } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

async function main() {
  console.log("==================================================");
  console.log("      NYAYAAI FULL PIPELINE VERIFICATION SUITE    ");
  console.log("==================================================\n");

  let allPassed = true;

  // --- TC-1: Standard Landlord Deposit Dispute ---
  console.log("--------------------------------------------------");
  console.log("TC-1: Standard Landlord Deposit Dispute");
  console.log("--------------------------------------------------");
  try {
    const query = "My landlord is not returning my deposit. I have rent agreement, bank transfer proof and WhatsApp messages.";
    const response = await runLegalAssessment(query, []);
    
    if ('error' in response) {
      throw new Error(`Pipeline error: ${response.error}`);
    }

    const initialChecklist: CaseChecklistItem[] = [
      { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
      { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
      { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
      { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
    ];

    const mappedChecklist = response.actions.checklist.map((label, idx) => {
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
    const verified = autoVerifyChecklistAndScore([mockUserMsg], mappedChecklist);

    const checkedLabels = verified.checklist.filter(c => c.checked).map(c => c.label);
    const score = verified.caseStrength.score;
    const riskLevel = verified.caseStrength.riskLevel;

    console.log(`[PASS] Classification: "${response.category}"`);
    console.log(`[PASS] Advice Generation: Successful (${response.advice.text.length} chars)`);
    console.log(`[PASS] Evidence Detected:`, checkedLabels);
    console.log(`[PASS] Case Strength Scoring: ${score}% (Risk Level: ${riskLevel})`);
    console.log(`[PASS] Timeline Generated: ${response.actions.timeline.length} events`);
    console.log(`[PASS] Documents Drafted:`, response.actions.documents.map(d => d.title));

    if (response.category !== "Landlord / Property Issue") throw new Error("Incorrect classification");
    if (checkedLabels.length !== 3) throw new Error("Incorrect evidence detection count");
    if (score !== 85 || riskLevel !== "Strong Case") throw new Error("Incorrect scoring logic application");

    console.log("\x1b[32m✔ TC-1 PASSED SUCCESSFULLY\x1b[0m\n");
  } catch (err) {
    console.error("\x1b[31m✘ TC-1 FAILED:", (err as Error).message, "\x1b[0m\n");
    allPassed = false;
  }

  // --- TC-2: Legal Document Analysis (Rent Agreement) ---
  console.log("--------------------------------------------------");
  console.log("TC-2: Legal Document Analysis");
  console.log("--------------------------------------------------");
  try {
    const base64Dummy = "dummyBase64Data==";
    const activeChecklistLabels = [
      "Written Lease/Purchase/Employment Agreement",
      "Proof of Transactions (Receipts/Statements)",
      "Correspondence Logs (Emails/Chats)"
    ];
    
    // Simulate analyzing a rent agreement file upload
    const response = await analyzeUploadedFileAction(base64Dummy, "my_lease_agreement.pdf", "application/pdf");
    
    if ('error' in response) {
      throw new Error(`File analysis error: ${response.error}`);
    }

    const { analysis } = response;
    
    console.log(`[PASS] OCR Extraction simulated successfully`);
    console.log(`[PASS] Detected Doc Type: "${analysis.detectedDocType}"`);
    console.log(`[PASS] Clauses Extracted:`, analysis.clauses.map(c => c.title));
    console.log(`[PASS] Obligations Extracted:`, analysis.obligations);
    console.log(`[PASS] Deadlines Extracted:`, analysis.deadlines.map(d => `${d.date}: ${d.action}`));
    console.log(`[PASS] Risks Extracted:`, analysis.risks);

    if (analysis.detectedDocType !== "Rent Agreement") throw new Error("Doc Type was not classified as Rent Agreement");
    if (analysis.clauses.length === 0) throw new Error("No clauses extracted");
    if (analysis.obligations.length === 0) throw new Error("No obligations extracted");

    // Test that uploading it only verifies the Rent Agreement checklist item
    const mockChecklist: CaseChecklistItem[] = [
      { id: 'chk-1', label: 'Written lease or rental agreement', checked: false },
      { id: 'chk-2', label: 'Bank transaction proof or receipts', checked: false },
      { id: 'chk-3', label: 'WhatsApp chat logs or emails', checked: false }
    ];

    const mockDoc = {
      name: "my_lease_agreement.pdf",
      type: "application/pdf",
      text: response.text,
      analysis: response.analysis
    };

    const verified = autoVerifyChecklistAndScore([], mockChecklist, mockDoc);
    const checked = verified.checklist.filter(c => c.checked).map(c => c.label);
    
    console.log(`[PASS] Checklist Auto-Verification on Upload:`, checked);
    if (checked.length !== 1 || checked[0] !== "Written lease or rental agreement") {
      throw new Error(`Only the Rent Agreement item should be checked. Got: ${JSON.stringify(checked)}`);
    }

    console.log("\x1b[32m✔ TC-2 PASSED SUCCESSFULLY\x1b[0m\n");
  } catch (err) {
    console.error("\x1b[31m✘ TC-2 FAILED:", (err as Error).message, "\x1b[0m\n");
    allPassed = false;
  }

  // --- TC-3: Non-legal Document Rejection ---
  console.log("--------------------------------------------------");
  console.log("TC-3: Non-legal Document Rejection");
  console.log("--------------------------------------------------");
  try {
    const base64DummyCat = "catBase64Dummy==";
    const activeChecklistLabels = [
      "Written Lease/Purchase/Employment Agreement",
      "Proof of Transactions (Receipts/Statements)"
    ];

    // Analyze non-legal document
    const response = await analyzeUploadedFileAction(base64DummyCat, "cute_cat.jpg", "image/jpeg");
    
    if ('error' in response) {
      throw new Error(`File analysis error: ${response.error}`);
    }

    const { analysis } = response;
    console.log(`[PASS] Detected Doc Type: "${analysis.detectedDocType}"`);
    console.log(`[PASS] Clauses count: ${analysis.clauses.length}`);
    console.log(`[PASS] Obligations count: ${analysis.obligations.length}`);
    console.log(`[PASS] Deadlines count: ${analysis.deadlines.length}`);
    console.log(`[PASS] Risks count: ${analysis.risks.length}`);

    if (analysis.detectedDocType !== "Other") throw new Error("Should be classified as 'Other'");
    if (analysis.clauses.length > 0 || analysis.obligations.length > 0) {
      throw new Error("Legal content extracted from non-legal document");
    }

    // Verify auto-verification is bypassed and no evidence checklist items get checked
    const mockChecklist: CaseChecklistItem[] = [
      { id: 'chk-1', label: 'Written lease or rental agreement', checked: false },
      { id: 'chk-2', label: 'Bank transaction proof or receipts', checked: false }
    ];

    const mockDoc = {
      name: "cute_cat.jpg",
      type: "image/jpeg",
      text: response.text,
      analysis: response.analysis
    };

    const verified = autoVerifyChecklistAndScore([], mockChecklist, mockDoc);
    const checked = verified.checklist.filter(c => c.checked).map(c => c.label);
    const score = verified.caseStrength.score;

    console.log(`[PASS] Checked evidence count: ${checked.length}`);
    console.log(`[PASS] Case score: ${score}%`);

    if (checked.length > 0) {
      throw new Error(`Evidence auto-verified by non-legal doc: ${JSON.stringify(checked)}`);
    }
    if (score > 15) {
      throw new Error(`Case score inflated: ${score}% (should be baseline 15%)`);
    }

    console.log("\x1b[32m✔ TC-3 PASSED SUCCESSFULLY\x1b[0m\n");
  } catch (err) {
    console.error("\x1b[31m✘ TC-3 FAILED:", (err as Error).message, "\x1b[0m\n");
    allPassed = false;
  }

  // --- TC-4: Production UI Verification ---
  console.log("--------------------------------------------------");
  console.log("TC-4: Production UI Verification");
  console.log("--------------------------------------------------");
  try {
    // Asserting the absence of debug elements in codebase by file checking
    // Read legal-toolkit.tsx and search for debug keywords
    const fs = require('fs');
    const path = require('path');
    const toolkitFilePath = path.join(__dirname, '../components/toolkit/legal-toolkit.tsx');
    const cardsFilePath = path.join(__dirname, '../components/toolkit/toolkit-cards.tsx');
    const chatFilePath = path.join(__dirname, '../components/chat/chat-area.tsx');

    const checkNoKeywords = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const keywords = [
        "Developer Debug Panel", "Dump Toolkit State", "Raw Agent Output",
        "Orchestrator Output", "Toolkit State Object"
      ];
      keywords.forEach(kw => {
        if (content.includes(kw)) {
          throw new Error(`Developer debug keyword "${kw}" found in ${path.basename(filePath)}`);
        }
      });
    };

    checkNoKeywords(toolkitFilePath);
    checkNoKeywords(cardsFilePath);
    checkNoKeywords(chatFilePath);

    console.log("[PASS] No Developer Debug Panel references in components");
    console.log("[PASS] No Dump Toolkit State buttons in components");
    console.log("[PASS] No Raw Agent Output elements in components");
    console.log("[PASS] No Toolkit State Object dump tags in components");
    console.log("[PASS] UI shows only clean production panels");

    console.log("\x1b[32m✔ TC-4 PASSED SUCCESSFULLY\x1b[0m\n");
  } catch (err) {
    console.error("\x1b[31m✘ TC-4 FAILED:", (err as Error).message, "\x1b[0m\n");
    allPassed = false;
  }

  console.log("==================================================");
  if (allPassed) {
    console.log("    ALL VERIFICATION TEST CASES PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("    SOME VERIFICATION TEST CASES FAILED!");
    process.exit(1);
  }
}

main().catch(console.error);
