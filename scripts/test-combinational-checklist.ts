import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem, Chat } from '../types';
import { DocumentAnalyzerResponse } from '../types/agents';

console.log("==================================================");
console.log("    COMBINATIONAL CHECKLIST VERIFICATION SUITE    ");
console.log("==================================================\n");

// 1. Define evidence universes for major categories
interface CategoryUniverse {
  name: 'landlord' | 'employment' | 'consumer' | 'cyber';
  checklist: CaseChecklistItem[];
}

const UNIVERSES: CategoryUniverse[] = [
  {
    name: 'landlord',
    checklist: [
      { id: 'chk-l-1', label: 'Rent Agreement', checked: false },
      { id: 'chk-l-2', label: 'Bank Transfer Proof', checked: false },
      { id: 'chk-l-3', label: 'WhatsApp Messages', checked: false },
      { id: 'chk-l-4', label: 'Property Handover Document', checked: false },
      { id: 'chk-l-5', label: 'Witness statement/declaration', checked: false },
      { id: 'chk-l-6', label: 'Screenshots / Visual Evidence', checked: false }
    ]
  },
  {
    name: 'employment',
    checklist: [
      { id: 'chk-e-1', label: 'Employment Offer Letter', checked: false },
      { id: 'chk-e-2', label: 'Salary Slips', checked: false },
      { id: 'chk-e-3', label: 'HR Emails', checked: false },
      { id: 'chk-e-4', label: 'Discharge / Handover Proof', checked: false },
      { id: 'chk-e-5', label: 'Witness statement/declaration', checked: false },
      { id: 'chk-e-6', label: 'Screenshots / Visual Evidence', checked: false }
    ]
  },
  {
    name: 'consumer',
    checklist: [
      { id: 'chk-c-1', label: 'Invoice', checked: false },
      { id: 'chk-c-2', label: 'Receipt', checked: false },
      { id: 'chk-c-3', label: 'Complaint Communication', checked: false },
      { id: 'chk-c-4', label: 'Product Return Proof', checked: false },
      { id: 'chk-c-5', label: 'Witness statement/declaration', checked: false },
      { id: 'chk-c-6', label: 'Screenshots / Visual Evidence', checked: false }
    ]
  },
  {
    name: 'cyber',
    checklist: [
      { id: 'chk-cy-1', label: 'FIR', checked: false },
      { id: 'chk-cy-2', label: 'Transaction Records', checked: false },
      { id: 'chk-cy-3', label: 'Chat Logs', checked: false },
      { id: 'chk-cy-4', label: 'Discharge / Handover Proof', checked: false },
      { id: 'chk-cy-5', label: 'Witness statement/declaration', checked: false },
      { id: 'chk-cy-6', label: 'Screenshots', checked: false }
    ]
  }
];

// Helper to generate all combinations of an array
function getCombinations<T>(array: T[]): T[][] {
  const result: T[][] = [[]];
  for (const element of array) {
    const length = result.length;
    for (let i = 0; i < length; i++) {
      result.push([...result[i], element]);
    }
  }
  return result;
}

// Generate the 6 primary document types for combinational testing
const primaryDocTypes = [
  'Rent Agreement',
  'Bank Statement',
  'WhatsApp Screenshot',
  'Property Handover',
  'Witness Statement',
  'Photos'
];

const docCombinations = getCombinations(primaryDocTypes);
console.log(`Generated ${docCombinations.length} combinational document upload scenarios for each legal category.\n`);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const universe of UNIVERSES) {
  console.log(`--- Testing Category: ${universe.name.toUpperCase()} ---`);
  
  for (const combo of docCombinations) {
    totalTests++;
    
    // Create mock docs for the combo, including "lure" text containing keywords for other categories
    const uploadedDocs = combo.map((docType, idx) => ({
      id: `doc_${idx}`,
      name: `document_${idx}.pdf`,
      type: 'application/pdf',
      text: 'Lure content mentioning bank transfer, email, WhatsApp, rent agreement, property handover, witness, screenshots to test keyword isolation.',
      analysis: {
        summary: `Analysis of ${docType}`,
        clauses: [],
        obligations: [],
        deadlines: [],
        risks: [],
        text: `Content of ${docType}`,
        detectedDocType: docType,
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
    }));

    const result = autoVerifyChecklistAndScore(
      [],
      universe.checklist,
      undefined,
      uploadedDocs
    );

    const checkedLabels = result.checklist.filter(item => item.checked).map(item => item.label);
    
    // Compute what we expect to be checked:
    // Only items that match the active category and are present in our combo docTypes should be checked.
    const expectedLabels: string[] = [];
    combo.forEach(docType => {
      if (docType === 'Rent Agreement') {
        if (universe.name === 'landlord') expectedLabels.push('Rent Agreement');
      } else if (docType === 'Bank Statement') {
        if (universe.name === 'landlord') expectedLabels.push('Bank Transfer Proof');
        if (universe.name === 'employment') expectedLabels.push('Salary Slips');
        if (universe.name === 'consumer') expectedLabels.push('Receipt');
        if (universe.name === 'cyber') expectedLabels.push('Transaction Records');
      } else if (docType === 'WhatsApp Screenshot') {
        if (universe.name === 'landlord') expectedLabels.push('WhatsApp Messages');
        if (universe.name === 'employment') expectedLabels.push('HR Emails');
        if (universe.name === 'consumer') expectedLabels.push('Complaint Communication');
        if (universe.name === 'cyber') expectedLabels.push('Chat Logs');
      } else if (docType === 'Property Handover') {
        if (universe.name === 'landlord') expectedLabels.push('Property Handover Document');
        if (universe.name === 'employment') expectedLabels.push('Discharge / Handover Proof');
        if (universe.name === 'consumer') expectedLabels.push('Product Return Proof');
        if (universe.name === 'cyber') expectedLabels.push('Discharge / Handover Proof');
      } else if (docType === 'Witness Statement') {
        expectedLabels.push('Witness statement/declaration');
      } else if (docType === 'Photos') {
        if (universe.name === 'landlord' || universe.name === 'employment' || universe.name === 'consumer') {
          expectedLabels.push('Screenshots / Visual Evidence');
        }
        if (universe.name === 'cyber') expectedLabels.push('Screenshots');
      }
    });

    const isMatch = checkedLabels.length === expectedLabels.length &&
                    checkedLabels.every(val => expectedLabels.includes(val));

    if (isMatch) {
      passedTests++;
    } else {
      failedTests++;
      console.error(`[FAIL] Combo: ${JSON.stringify(combo)}`);
      console.error(`       Expected: ${JSON.stringify(expectedLabels)}`);
      console.error(`       Got:      ${JSON.stringify(checkedLabels)}`);
    }
  }
}

// 2. Proof tests for specific conditions
console.log("\n--- Running Strict Rule Verification Proofs ---");

// Proof A: Rent Agreement only verifies Rent Agreement, never Employment Offer Letter
console.log("Proof A: Upload Rent Agreement in Employment Dispute...");
const employmentOfferChecklist: CaseChecklistItem[] = [
  { id: '1', label: 'Employment Offer Letter', checked: false }
];
const rentDoc = {
  name: 'lease.pdf',
  type: 'application/pdf',
  text: 'Text mentioning salary slip, bank transfer, email',
  analysis: { detectedDocType: 'Rent Agreement' } as unknown as DocumentAnalyzerResponse
};
const proofAResult = autoVerifyChecklistAndScore([], employmentOfferChecklist, rentDoc);
const proofAChecked = proofAResult.checklist.filter(i => i.checked).map(i => i.label);
if (proofAChecked.length === 0) {
  console.log(" -> \x1b[32m✔ PASSED\x1b[0m: Rent Agreement did not verify Employment Offer Letter.");
  passedTests++;
} else {
  console.error(" -> \x1b[31m✘ FAILED\x1b[0m: Rent Agreement checked:", proofAChecked);
  failedTests++;
}

// Proof B: Bank Receipt only verifies Bank Proof, never Communication logs
console.log("Proof B: Upload Bank Receipt in Landlord dispute...");
const landlordChecklist: CaseChecklistItem[] = [
  { id: '1', label: 'Bank Transfer Proof', checked: false },
  { id: '2', label: 'WhatsApp Messages', checked: false }
];
const bankDoc = {
  name: 'receipt.pdf',
  type: 'application/pdf',
  text: 'Text mentioning whatsapp chat, email',
  analysis: { detectedDocType: 'Bank Receipt' } as unknown as DocumentAnalyzerResponse
};
const proofBResult = autoVerifyChecklistAndScore([], landlordChecklist, bankDoc);
const proofBChecked = proofBResult.checklist.filter(i => i.checked).map(i => i.label);
if (proofBChecked.length === 1 && proofBChecked[0] === 'Bank Transfer Proof') {
  console.log(" -> \x1b[32m✔ PASSED\x1b[0m: Bank Receipt only verified Bank Transfer Proof, not WhatsApp Messages.");
  passedTests++;
} else {
  console.error(" -> \x1b[31m✘ FAILED\x1b[0m: Checked items:", proofBChecked);
  failedTests++;
}

// Proof C: Non-legal documents verify nothing
console.log("Proof C: Upload non-legal document (detectedDocType = Other)...");
const proofCResult = autoVerifyChecklistAndScore([], landlordChecklist, {
  name: 'cat.jpg',
  type: 'image/jpeg',
  text: 'Rent Agreement payment proof',
  analysis: { detectedDocType: 'Other' } as unknown as DocumentAnalyzerResponse
});
const proofCChecked = proofCResult.checklist.filter(i => i.checked).map(i => i.label);
if (proofCChecked.length === 0) {
  console.log(" -> \x1b[32m✔ PASSED\x1b[0m: Non-legal document verified nothing.");
  passedTests++;
} else {
  console.error(" -> \x1b[31m✘ FAILED\x1b[0m: Checked items:", proofCChecked);
  failedTests++;
}

console.log("\n==================================================");
console.log(`Tests Run: ${totalTests + 3} | Passed: ${passedTests} | Failed: ${failedTests}`);
if (failedTests === 0) {
  console.log("    ALL COMBINATIONAL TEST CASES PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("    SOME COMBINATIONAL TEST CASES FAILED!");
  process.exit(1);
}
