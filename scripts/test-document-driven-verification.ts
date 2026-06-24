import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';
import { DocumentAnalyzerResponse } from '../types/agents';

console.log("==================================================");
console.log("   DOCUMENT-DRIVEN VERIFICATION RULE PROOF SUITE   ");
console.log("==================================================\n");

let allPassed = true;

// Helper to check what is checked
function getCheckedItems(checklist: CaseChecklistItem[]): string[] {
  return checklist.filter(item => item.checked).map(item => item.label);
}

// -----------------------------------------------------------------------------
// Test 1: Rent Agreement only verifies Rent Agreement.
// -----------------------------------------------------------------------------
console.log("Test 1: Rent Agreement only verifies Rent Agreement...");
const landlordChecklist: CaseChecklistItem[] = [
  { id: 'l1', label: 'Rent Agreement', checked: false },
  { id: 'l2', label: 'Bank Transfer Proof', checked: false },
  { id: 'l3', label: 'WhatsApp Messages', checked: false }
];
const rentDoc = {
  name: 'my_agreement.pdf',
  type: 'application/pdf',
  text: 'Text mentioning rent, bank transfer, email',
  analysis: {
    detectedDocType: 'Rent Agreement',
    summary: 'Rent agreement doc',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};

// 1a. In Landlord case, Rent Agreement should verify only Rent Agreement
const res1a = autoVerifyChecklistAndScore([], landlordChecklist, rentDoc);
const checked1a = getCheckedItems(res1a.checklist);
if (checked1a.length === 1 && checked1a[0] === 'Rent Agreement') {
  console.log("  ✔ Landlord case: Checked only Rent Agreement.");
} else {
  console.error("  ✘ Landlord case failed! Checked:", checked1a);
  allPassed = false;
}

// 1b. In Employment case, Rent Agreement should verify nothing (does not verify Offer Letter)
const employmentChecklist: CaseChecklistItem[] = [
  { id: 'e1', label: 'Employment Offer Letter', checked: false },
  { id: 'e2', label: 'Salary Slips', checked: false }
];
const res1b = autoVerifyChecklistAndScore([], employmentChecklist, rentDoc);
const checked1b = getCheckedItems(res1b.checklist);
if (checked1b.length === 0) {
  console.log("  ✔ Employment case: Rent Agreement checked nothing.");
} else {
  console.error("  ✘ Employment case failed! Checked:", checked1b);
  allPassed = false;
}


// -----------------------------------------------------------------------------
// Test 2: Bank Receipt / Bank Statement only verifies Bank Proof.
// -----------------------------------------------------------------------------
console.log("\nTest 2: Bank Receipt only verifies Bank Proof...");
const bankDoc = {
  name: 'receipt.pdf',
  type: 'application/pdf',
  text: 'Text mentioning rent agreement, whatsapp, email',
  analysis: {
    detectedDocType: 'Bank Receipt',
    summary: 'Bank Receipt doc',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};

// 2a. In Landlord case, Bank Receipt should verify only Bank Transfer Proof
const res2a = autoVerifyChecklistAndScore([], landlordChecklist, bankDoc);
const checked2a = getCheckedItems(res2a.checklist);
if (checked2a.length === 1 && checked2a[0] === 'Bank Transfer Proof') {
  console.log("  ✔ Landlord case: Checked only Bank Transfer Proof.");
} else {
  console.error("  ✘ Landlord case failed! Checked:", checked2a);
  allPassed = false;
}

// 2b. In Employment case, Bank Receipt should verify only Salary Slips (Bank Proof)
const res2b = autoVerifyChecklistAndScore([], employmentChecklist, bankDoc);
const checked2b = getCheckedItems(res2b.checklist);
if (checked2b.length === 1 && checked2b[0] === 'Salary Slips') {
  console.log("  ✔ Employment case: Checked only Salary Slips.");
} else {
  console.error("  ✘ Employment case failed! Checked:", checked2b);
  allPassed = false;
}


// -----------------------------------------------------------------------------
// Test 3: WhatsApp Screenshot / Email / SMS only verifies Communication.
// -----------------------------------------------------------------------------
console.log("\nTest 3: WhatsApp Screenshot only verifies Communication...");
const chatDoc = {
  name: 'screenshot.png',
  type: 'image/png',
  text: 'Text mentioning rent agreement, bank transfer, email',
  analysis: {
    detectedDocType: 'WhatsApp Screenshot',
    summary: 'WhatsApp chat screenshot',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};

// 3a. In Landlord case, WhatsApp Screenshot should verify only WhatsApp Messages
const res3a = autoVerifyChecklistAndScore([], landlordChecklist, chatDoc);
const checked3a = getCheckedItems(res3a.checklist);
if (checked3a.length === 1 && checked3a[0] === 'WhatsApp Messages') {
  console.log("  ✔ Landlord case: Checked only WhatsApp Messages.");
} else {
  console.error("  ✘ Landlord case failed! Checked:", checked3a);
  allPassed = false;
}

// 3b. In Employment case, WhatsApp Screenshot should verify only HR Emails
const employmentChecklistHR: CaseChecklistItem[] = [
  { id: 'e1', label: 'Employment Offer Letter', checked: false },
  { id: 'e3', label: 'HR Emails', checked: false }
];
const res3b = autoVerifyChecklistAndScore([], employmentChecklistHR, chatDoc);
const checked3b = getCheckedItems(res3b.checklist);
if (checked3b.length === 1 && checked3b[0] === 'HR Emails') {
  console.log("  ✔ Employment case: Checked only HR Emails.");
} else {
  console.error("  ✘ Employment case failed! Checked:", checked3b);
  allPassed = false;
}


// -----------------------------------------------------------------------------
// Test 4: Non-legal documents verify nothing.
// -----------------------------------------------------------------------------
console.log("\nTest 4: Non-legal documents verify nothing...");
const nonLegalDoc = {
  name: 'cat.jpg',
  type: 'image/jpeg',
  text: 'Rent Agreement payment proof whatsapp chat HR email',
  analysis: {
    detectedDocType: 'Other',
    summary: 'Photo of a cat',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};
const res4 = autoVerifyChecklistAndScore([], landlordChecklist, nonLegalDoc);
const checked4 = getCheckedItems(res4.checklist);
if (checked4.length === 0) {
  console.log("  ✔ Landlord case: Other doc type verified nothing.");
} else {
  console.error("  ✘ Other doc type failed! Checked:", checked4);
  allPassed = false;
}

const noticeDoc = {
  name: 'notice.pdf',
  type: 'application/pdf',
  text: 'Rent Agreement bank transfer whatsapp chat HR email',
  analysis: {
    detectedDocType: 'Legal Notice',
    summary: 'Legal Notice document',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};
const res4b = autoVerifyChecklistAndScore([], landlordChecklist, noticeDoc);
const checked4b = getCheckedItems(res4b.checklist);
if (checked4b.length === 0) {
  console.log("  ✔ Landlord case: Legal Notice verified nothing.");
} else {
  console.error("  ✘ Legal Notice failed! Checked:", checked4b);
  allPassed = false;
}


// -----------------------------------------------------------------------------
// Test 5: Keyword Isolation / Lure Text Checks.
// -----------------------------------------------------------------------------
console.log("\nTest 5: Keyword Isolation / Lure Text Checks...");
const rentLureDoc = {
  name: 'rent_agreement_with_lures.pdf',
  type: 'application/pdf',
  text: 'This lease is a rent agreement. Payment is made by bank transfer. Communication was done on WhatsApp.',
  analysis: {
    detectedDocType: 'Rent Agreement',
    summary: 'Rent agreement mentioning bank transfer and WhatsApp',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};

const res5a = autoVerifyChecklistAndScore([], landlordChecklist, rentLureDoc);
const checked5a = getCheckedItems(res5a.checklist);
if (checked5a.length === 1 && checked5a[0] === 'Rent Agreement') {
  console.log("  ✔ Landlord case: Rent Agreement with bank transfer/WhatsApp keywords checked only Rent Agreement.");
} else {
  console.error("  ✘ Landlord case failed! Rent Agreement checked:", checked5a);
  allPassed = false;
}

const chatLureDoc = {
  name: 'chat_with_lures.png',
  type: 'image/png',
  text: 'Screenshot showing bank transfer details and rent agreement signature chat.',
  analysis: {
    detectedDocType: 'WhatsApp Screenshot',
    summary: 'WhatsApp screenshot mentioning bank transfer and rent agreement',
    clauses: [], obligations: [], deadlines: [], risks: [], text: 'content'
  } as unknown as DocumentAnalyzerResponse
};

const res5b = autoVerifyChecklistAndScore([], landlordChecklist, chatLureDoc);
const checked5b = getCheckedItems(res5b.checklist);
if (checked5b.length === 1 && checked5b[0] === 'WhatsApp Messages') {
  console.log("  ✔ Landlord case: WhatsApp Screenshot with bank transfer/rent agreement keywords checked only WhatsApp Messages.");
} else {
  console.error("  ✘ Landlord case failed! WhatsApp Screenshot checked:", checked5b);
  allPassed = false;
}


// -----------------------------------------------------------------------------
// Test 6: Checklist preservation checks (unchecked items remain).
// -----------------------------------------------------------------------------
console.log("\nTest 6: Checklist preservation checks (unchecked items remain)...");
const res6 = autoVerifyChecklistAndScore([], landlordChecklist, rentDoc);
if (res6.checklist.length === landlordChecklist.length) {
  console.log("  ✔ Landlord case: Checklist size is preserved.");
  const pending = res6.checklist.filter(item => !item.checked).map(item => item.label);
  if (pending.includes('Bank Transfer Proof') && pending.includes('WhatsApp Messages')) {
    console.log("  ✔ Landlord case: Unchecked items remain in the checklist card.");
  } else {
    console.error("  ✘ Landlord case failed! Missing pending items:", pending);
    allPassed = false;
  }
} else {
  console.error("  ✘ Landlord case failed! Checklist shrunk from", landlordChecklist.length, "to", res6.checklist.length);
  allPassed = false;
}


// -----------------------------------------------------------------------------
// Final Verdict
// -----------------------------------------------------------------------------
console.log("\n==================================================");
if (allPassed) {
  console.log("     ALL PROOF TESTS PASSED SUCCESSFULLY!         ");
  console.log("==================================================");
  process.exit(0);
} else {
  console.error("     SOME PROOF TESTS FAILED!                     ");
  console.log("==================================================");
  process.exit(1);
}
