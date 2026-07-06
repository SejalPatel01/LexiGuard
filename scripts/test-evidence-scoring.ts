import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

console.log("Starting Evidence Scoring Auto-Verification tests...");

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'My landlord is not returning my ₹25,000 deposit. I have the rent agreement, bank transfer proof, and WhatsApp messages.',
    timestamp: '10:00 AM'
  }
];

const mockChecklist: CaseChecklistItem[] = [
  { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
  { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
  { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
  { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
];

const result = autoVerifyChecklistAndScore(mockMessages, mockChecklist);

console.log("Calculated Score:", result.caseStrength.score);
console.log("Risk Level:", result.caseStrength.riskLevel);
console.log("Checked items count:", result.checklist.filter(item => item.checked).length);

// Assertions
if (result.caseStrength.score !== 95) {
  console.error("Test failed: Score should be 95%, got", result.caseStrength.score);
  process.exit(1);
}

if (result.caseStrength.riskLevel !== 'Strong Case') {
  console.error("Test failed: Risk Level should be 'Strong Case', got", result.caseStrength.riskLevel);
  process.exit(1);
}

const checkedCount = result.checklist.filter(item => item.checked).length;
if (checkedCount !== 3) {
  console.error("Test failed: Expected 3 checked items, got", checkedCount);
  process.exit(1);
}

console.log("All tests passed successfully!");
process.exit(0);
