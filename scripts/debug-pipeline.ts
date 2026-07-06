import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runLegalAssessment } from '../app/actions/orchestrate';
import { autoVerifyChecklistAndScore, mapLabelToCategory } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

async function main() {
  const query = "My landlord is not returning my deposit. I only have the rent agreement and WhatsApp messages.";
  console.log("Running orchestrator for query:", query);

  const response = await runLegalAssessment(query, []);
  if ('isBlocked' in response && response.isBlocked) {
    console.error("Blocked by Security Gateway:", response.reason);
    return;
  }
  if ('error' in response) {
    console.error("Error from pipeline:", response.error);
    return;
  }

  const success = response as any;
  console.log("\n--- Pipeline Response Actions Checklist ---");
  console.log(success.actions.checklist);

  const initialChecklist: CaseChecklistItem[] = [
    { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
    { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
    { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
    { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
  ];

  // Simulate how mappedChecklist is built in hooks/use-chats.tsx
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

  console.log("\n--- Mapped Checklist ---");
  console.log(mappedChecklist);

  const mockUserMsg: Message = { id: '1', role: 'user', content: query, timestamp: '10:00 AM' };
  const mockAssistantMsg: Message = { id: '2', role: 'assistant', content: success.advice.text, timestamp: '10:01 AM' };
  const allMsgs = [mockUserMsg, mockAssistantMsg];

  const verified = autoVerifyChecklistAndScore(allMsgs, mappedChecklist);

  console.log("\n--- Final Verified Checklist ---");
  console.log(verified.checklist);
  console.log("Checked items count:", verified.checklist.filter(i => i.checked).length);
  console.log("Score:", verified.caseStrength.score);
  console.log("Risk Level:", verified.caseStrength.riskLevel);
}

main().catch(console.error);
