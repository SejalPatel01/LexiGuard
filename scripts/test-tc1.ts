import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runLegalAssessment } from '../app/actions/orchestrate';
import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

async function testTC1() {
  const query = "My landlord is not returning my deposit. I have rent agreement, bank transfer proof and WhatsApp messages.";
  console.log("=== TC-1: Standard landlord deposit dispute ===");
  console.log("Input Query:", query);

  const response = await runLegalAssessment(query, []);
  if ('error' in response) {
    console.error("Pipeline failed with error:", response.error);
    process.exit(1);
  }

  console.log("\n--- 1. Classification ---");
  console.log("Category:", response.category);

  console.log("\n--- 2. Advice Generation ---");
  console.log("Advice Text Summary:\n", response.advice.text.substring(0, 400) + "...");

  console.log("\n--- 3. Evidence Detection & 4. Checklist Generation ---");
  console.log("Suggested Checklist from Orchestrator:", response.actions.checklist);

  // Map checklist to standard checklist layout
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

  const mockUserMsg: Message = { id: '1', role: 'user', content: query, timestamp: '10:00 AM' };
  const verified = autoVerifyChecklistAndScore([mockUserMsg], mappedChecklist);

  console.log("Mapped & Verified Checklist:");
  verified.checklist.forEach(item => {
    console.log(`- [${item.checked ? 'X' : ' '}] ${item.label}`);
  });

  console.log("\n--- 5. Case Strength Scoring ---");
  console.log("Score:", verified.caseStrength.score + "%");
  console.log("Risk Level:", verified.caseStrength.riskLevel);
  console.log("Risk Factors:", verified.caseStrength.riskFactors);

  console.log("\n--- 6. Timeline Generation ---");
  console.log("Timeline Events:", response.actions.timeline);

  console.log("\n--- 7. Generated Documents ---");
  console.log("Draft Documents:", response.actions.documents.map(d => ({
    title: d.title,
    type: d.type,
    previewLength: d.previewText.length
  })));

  process.exit(0);
}

testTC1().catch(console.error);
