import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

console.log("Starting Evidence Engine tests...");

// Base mock checklist (contains generic items corresponding to our categories)
const mockChecklist: CaseChecklistItem[] = [
  { id: 'chk-1', label: 'Written lease or rental agreement', checked: false },
  { id: 'chk-2', label: 'Bank transaction proof or receipts', checked: false },
  { id: 'chk-3', label: 'WhatsApp chat logs or emails', checked: false },
  { id: 'chk-4', label: 'Property handover document', checked: false }
];

// Test Case 1: Partial Evidence (2 items)
console.log("\n--- Test Case 1: Partial Evidence (2 items) ---");
const messages1: Message[] = [
  { id: 'm1', role: 'user', content: 'I have a rent agreement and WhatsApp messages.', timestamp: '10:00 AM' }
];
const result1 = autoVerifyChecklistAndScore(messages1, mockChecklist);
const checked1 = result1.checklist.filter(i => i.checked);
console.log("Checked items:", checked1.map(i => i.label));
console.log("Score:", result1.caseStrength.score);
console.log("Risk Level:", result1.caseStrength.riskLevel);

if (checked1.length !== 2 || result1.caseStrength.score !== 65 || result1.caseStrength.riskLevel !== 'Medium') {
  console.error("Test Case 1 Failed!");
  process.exit(1);
}
console.log("Test Case 1 Passed!");

// Test Case 2: Single Evidence (1 item)
console.log("\n--- Test Case 2: Single Evidence (1 item) ---");
const messages2: Message[] = [
  { id: 'm2', role: 'user', content: 'I only have bank transfer proof.', timestamp: '10:00 AM' }
];
const result2 = autoVerifyChecklistAndScore(messages2, mockChecklist);
const checked2 = result2.checklist.filter(i => i.checked);
console.log("Checked items:", checked2.map(i => i.label));
console.log("Score:", result2.caseStrength.score);
console.log("Risk Level:", result2.caseStrength.riskLevel);

if (checked2.length !== 1 || result2.caseStrength.score !== 40 || result2.caseStrength.riskLevel !== 'High') {
  console.error("Test Case 2 Failed!");
  process.exit(1);
}
console.log("Test Case 2 Passed!");

// Test Case 3: No Evidence (0 items)
console.log("\n--- Test Case 3: No Evidence (0 items) ---");
const messages3: Message[] = [
  { id: 'm3', role: 'user', content: 'I have no documents or proof.', timestamp: '10:00 AM' }
];
const result3 = autoVerifyChecklistAndScore(messages3, mockChecklist);
const checked3 = result3.checklist.filter(i => i.checked);
console.log("Checked items:", checked3.map(i => i.label));
console.log("Score:", result3.caseStrength.score);
console.log("Risk Level:", result3.caseStrength.riskLevel);

if (checked3.length !== 0 || result3.caseStrength.score !== 15 || result3.caseStrength.riskLevel !== 'High') {
  console.error("Test Case 3 Failed!");
  process.exit(1);
}
console.log("Test Case 3 Passed!");

// Test Case 4: No Carry-over assumptions (recalculate every run)
console.log("\n--- Test Case 4: Resetting Assumptions ---");
// Start with rent agreement checked from previous run
const previousChecklist = result1.checklist; // Has 2 checked items
console.log("Before new run (from result1):", previousChecklist.filter(i => i.checked).map(i => i.label));

// Run with message that only contains bank proof
const result4 = autoVerifyChecklistAndScore(messages2, previousChecklist);
const checked4 = result4.checklist.filter(i => i.checked);
console.log("After new run:", checked4.map(i => i.label));
console.log("Score:", result4.caseStrength.score);

if (checked4.length !== 1 || (checked4[0].label !== 'Bank transaction proof or receipts' && checked4[0].label !== 'Proof of Transactions (Receipts/Statements)') || result4.caseStrength.score !== 40) {
  console.error("Test Case 4 Failed! Carry-over assumptions were not reset.");
  process.exit(1);
}
console.log("Test Case 4 Passed! Assumptions correctly reset on new run.");

console.log("\nAll Evidence Engine tests passed successfully!");
process.exit(0);
