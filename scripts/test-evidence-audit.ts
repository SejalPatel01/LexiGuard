import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

console.log("==================================================");
console.log("        EVIDENCE VERIFICATION AUDIT TESTS         ");
console.log("==================================================\n");

let allPassed = true;

const initialChecklist: CaseChecklistItem[] = [
  { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
  { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
  { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
  { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
];

interface TestCase {
  name: string;
  chatText: string;
  expectedChecklistCount: number;
  expectedVerifiedCount: number;
  expectedScore: number;
}

const TEST_CASES: TestCase[] = [
  {
    name: "Case A: Rent Agreement only",
    chatText: "I have rent agreement",
    expectedChecklistCount: 4,
    expectedVerifiedCount: 1,
    expectedScore: 55
  },
  {
    name: "Case B: Rent Agreement + Bank Transfer Proof",
    chatText: "I have rent agreement and bank transfer proof",
    expectedChecklistCount: 4,
    expectedVerifiedCount: 2,
    expectedScore: 85
  },
  {
    name: "Case C: Rent Agreement + Bank Transfer Proof + WhatsApp Messages",
    chatText: "I have rent agreement, bank transfer proof and WhatsApp messages",
    expectedChecklistCount: 4,
    expectedVerifiedCount: 3,
    expectedScore: 95
  },
  {
    name: "Case D: Offer Letter + Salary Slips + Bank Statements + HR Emails",
    chatText: "I have an offer letter, salary slips, bank statements, and HR emails",
    expectedChecklistCount: 4,
    expectedVerifiedCount: 3,
    expectedScore: 95
  },
  {
    name: "Case E: FIR + Bank Transaction Records + Screenshots + Call Logs + Email Evidence + Identity Documents",
    chatText: "I have FIR, bank transaction records, screenshots, call logs, email evidence, and identity documents",
    expectedChecklistCount: 4,
    expectedVerifiedCount: 3,
    expectedScore: 95
  }
];

for (const tc of TEST_CASES) {
  console.log(`Running: ${tc.name}`);
  console.log(` -> Input: "${tc.chatText}"`);
  
  const mockUserMsg: Message = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: tc.chatText,
    timestamp: '10:00 AM'
  };

  const result = autoVerifyChecklistAndScore([mockUserMsg], initialChecklist);
  const checklistCount = result.checklist.length;
  const verifiedCount = result.checklist.filter(i => i.checked).length;
  const score = result.caseStrength.score;

  console.log(` -> Checklist Count: ${checklistCount}`);
  console.log(` -> Verified Count: ${verifiedCount}`);
  console.log(` -> Score: ${score}%`);
  console.log(` -> Verified Items:`, result.checklist.filter(i => i.checked).map(i => i.label));

  let passed = true;
  if (checklistCount !== tc.expectedChecklistCount) {
    console.error(`  [FAIL] Checklist count mismatch: Expected ${tc.expectedChecklistCount}, got ${checklistCount}`);
    passed = false;
  }
  if (verifiedCount !== tc.expectedVerifiedCount) {
    console.error(`  [FAIL] Verified count mismatch: Expected ${tc.expectedVerifiedCount}, got ${verifiedCount}`);
    passed = false;
  }
  if (score !== tc.expectedScore) {
    console.error(`  [FAIL] Score mismatch: Expected ${tc.expectedScore}%, got ${score}%`);
    passed = false;
  }

  if (passed) {
    console.log(` -> \x1b[32m✔ PASSED\x1b[0m\n`);
  } else {
    console.log(` -> \x1b[31m✘ FAILED\x1b[0m\n`);
    allPassed = false;
  }
}

console.log("==================================================");
if (allPassed) {
  console.log("    ALL AUDIT TEST CASES PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("    SOME AUDIT TEST CASES FAILED!");
  process.exit(1);
}
