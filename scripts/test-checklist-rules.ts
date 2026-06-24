import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';
import { DocumentAnalyzerResponse } from '../types/agents';

console.log("Starting Checklist Rules verification tests...\n");

const baseChecklist: CaseChecklistItem[] = [
  { id: 'chk-1', label: 'Written lease or rental agreement', checked: false },
  { id: 'chk-2', label: 'Bank transaction proof or receipts', checked: false },
  { id: 'chk-3', label: 'WhatsApp chat logs or emails', checked: false },
  { id: 'chk-4', label: 'Property handover document', checked: false },
  { id: 'chk-5', label: 'Witness statement/declaration', checked: false }
];

const mockEmptyMessages: Message[] = [];

// Helper to check which checklist items are verified
function getCheckedLabels(checklist: CaseChecklistItem[]): string[] {
  return checklist.filter(item => item.checked).map(item => item.label);
}

interface TestConfig {
  name: string;
  docName: string;
  docType: string;
  expectedChecked: string[];
}

const TESTS: TestConfig[] = [
  {
    name: "Rent Agreement",
    docName: "lease.pdf",
    docType: "Rent Agreement",
    expectedChecked: ["Written lease or rental agreement"]
  },
  {
    name: "Bank Receipt",
    docName: "receipt.pdf",
    docType: "Bank Receipt",
    expectedChecked: ["Bank transaction proof or receipts"]
  },
  {
    name: "Bank Statement",
    docName: "stmt.pdf",
    docType: "Bank Statement",
    expectedChecked: ["Bank transaction proof or receipts"]
  },
  {
    name: "WhatsApp Screenshot",
    docName: "chat.png",
    docType: "WhatsApp Screenshot",
    expectedChecked: ["WhatsApp chat logs or emails"]
  },
  {
    name: "Email",
    docName: "email.pdf",
    docType: "Email",
    expectedChecked: ["WhatsApp chat logs or emails"]
  },
  {
    name: "SMS",
    docName: "sms.png",
    docType: "SMS",
    expectedChecked: ["WhatsApp chat logs or emails"]
  },
  {
    name: "Property Handover",
    docName: "handover.pdf",
    docType: "Property Handover",
    expectedChecked: ["Property handover document"]
  },
  {
    name: "Witness Statement",
    docName: "witness.pdf",
    docType: "Witness Statement",
    expectedChecked: ["Witness statement/declaration"]
  },
  {
    name: "Legal Notice",
    docName: "notice.pdf",
    docType: "Legal Notice",
    expectedChecked: []
  },
  {
    name: "Other (Non-legal)",
    docName: "cat.jpg",
    docType: "Other",
    expectedChecked: []
  }
];

let failed = false;

for (const t of TESTS) {
  console.log(`Running Test: ${t.name} (Type: ${t.docType}, File: ${t.docName})`);
  
  const mockDoc = {
    name: t.docName,
    type: "application/pdf",
    text: "Some random document text content containing keywords like rent, bank, statement, witness, handover, etc. to ensure only the category filters it.",
    analysis: {
      summary: `This is a ${t.docType}`,
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: `Text of ${t.docType}`,
      detectedDocType: t.docType,
      entities: {
        names: [],
        dates: [],
        addresses: [],
        amounts: [],
        depositValues: [],
        agreementNumbers: [],
        phoneNumbers: [],
        emailAddresses: []
      }
    } as DocumentAnalyzerResponse
  };

  const result = autoVerifyChecklistAndScore(mockEmptyMessages, baseChecklist, mockDoc);
  const checked = getCheckedLabels(result.checklist);
  
  console.log(` -> Checked items:`, checked);
  
  const isMatch = checked.length === t.expectedChecked.length &&
                  checked.every(val => t.expectedChecked.includes(val));
                  
  if (isMatch) {
    console.log(`\x1b[32m✔ PASSED\x1b[0m\n`);
  } else {
    console.error(`\x1b[31m✘ FAILED! Expected checked: ${JSON.stringify(t.expectedChecked)}, but got: ${JSON.stringify(checked)}\x1b[0m\n`);
    failed = true;
  }
}

// Test 11: File name fallback tests (when detectedDocType is missing)
console.log("Running Test: File name fallback for witness_statement.pdf (should verify nothing without detectedDocType)");
const mockFallbackDoc = {
  name: "witness_statement.pdf",
  type: "application/pdf",
  text: "Statement content",
  // analysis is missing detectedDocType
  analysis: {
    summary: "A witness statement",
    clauses: [],
    obligations: [],
    deadlines: [],
    risks: [],
    text: "Statement text",
    entities: {
      names: [],
      dates: [],
      addresses: [],
      amounts: [],
      depositValues: [],
      agreementNumbers: [],
      phoneNumbers: [],
      emailAddresses: []
    }
  } as unknown as DocumentAnalyzerResponse
};

const resultFallback = autoVerifyChecklistAndScore(mockEmptyMessages, baseChecklist, mockFallbackDoc);
const checkedFallback = getCheckedLabels(resultFallback.checklist);
console.log(" -> Checked items:", checkedFallback);
if (checkedFallback.length === 0) {
  console.log(`\x1b[32m✔ PASSED: Filename alone did not trigger verification (strict analyzer type check enforced)\x1b[0m\n`);
} else {
  console.error(`\x1b[31m✘ FAILED! Expected 0 checked items, got: ${JSON.stringify(checkedFallback)}\x1b[0m\n`);
  failed = true;
}

if (failed) {
  console.error("Some checklist rules tests failed!");
  process.exit(1);
} else {
  console.log("All checklist rules tests passed successfully!");
  process.exit(0);
}
