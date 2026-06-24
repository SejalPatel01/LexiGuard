import { 
  calculateEvidenceGaps, 
  generateNextActionRecommendation
} from '../hooks/use-chats';
import { CaseChecklistItem } from '../types';

function runEvidenceGapsTests() {
  console.log("==================================================");
  console.log("        EVIDENCE GAP ADVISOR UNIT TESTS          ");
  console.log("==================================================\n");

  // Define initial landlord dispute checklist items
  const initialLandlordChecklist: CaseChecklistItem[] = [
    { id: 'chk-1', label: 'Rent Agreement', checked: false },
    { id: 'chk-2', label: 'Bank Transfer Proof', checked: false },
    { id: 'chk-3', label: 'WhatsApp Messages', checked: false },
    { id: 'chk-4', label: 'Property Handover Document', checked: false },
    { id: 'chk-5', label: 'Witness statement/declaration', checked: false },
    { id: 'chk-6', label: 'Screenshots / Visual Evidence', checked: false }
  ];

  // -----------------------------------------------------------------
  // Test 1: Rent Agreement only verified
  // -----------------------------------------------------------------
  console.log("Test 1: Rent Agreement only verified");
  const checklistT1 = initialLandlordChecklist.map(item => ({
    ...item,
    checked: item.label === 'Rent Agreement'
  }));
  const gapsT1 = calculateEvidenceGaps('landlord', checklistT1);
  console.log("Missing Evidence:", gapsT1.missingEvidence);
  console.log("Recommendations Count:", gapsT1.recommendations.length);
  console.log("Estimated Improved Score:", gapsT1.estimatedImprovedScore + "%");
  
  if (!gapsT1.missingEvidence.includes('Bank Transfer Proof') || !gapsT1.missingEvidence.includes('WhatsApp Messages')) {
    console.error("FAIL: Test 1 should have Bank Transfer Proof and WhatsApp Messages as missing.");
    process.exit(1);
  }
  console.log("✔ Test 1 PASSED\n");

  // -----------------------------------------------------------------
  // Test 2: Rent Agreement + Bank Proof verified
  // -----------------------------------------------------------------
  console.log("Test 2: Rent Agreement + Bank Proof verified");
  const checklistT2 = initialLandlordChecklist.map(item => ({
    ...item,
    checked: item.label === 'Rent Agreement' || item.label === 'Bank Transfer Proof'
  }));
  const gapsT2 = calculateEvidenceGaps('landlord', checklistT2);
  console.log("Missing Evidence:", gapsT2.missingEvidence);
  console.log("Estimated Improved Score:", gapsT2.estimatedImprovedScore + "%");
  
  if (gapsT2.missingEvidence.includes('Bank Transfer Proof')) {
    console.error("FAIL: Test 2 should NOT have Bank Transfer Proof as missing.");
    process.exit(1);
  }
  if (!gapsT2.missingEvidence.includes('WhatsApp Messages')) {
    console.error("FAIL: Test 2 should have WhatsApp Messages as missing.");
    process.exit(1);
  }
  console.log("✔ Test 2 PASSED\n");

  // -----------------------------------------------------------------
  // Test 3: Non-legal document (No evidence verified)
  // -----------------------------------------------------------------
  console.log("Test 3: Non-legal document (No evidence verified)");
  const checklistT3 = initialLandlordChecklist.map(item => ({
    ...item,
    checked: false
  }));
  const gapsT3 = calculateEvidenceGaps('landlord', checklistT3);
  console.log("Missing Evidence:", gapsT3.missingEvidence);
  console.log("Estimated Improved Score:", gapsT3.estimatedImprovedScore + "%");
  
  if (gapsT3.missingEvidence.length !== 3) {
    console.error("FAIL: Test 3 should have all 3 critical items as missing.");
    process.exit(1);
  }
  console.log("✔ Test 3 PASSED\n");

  // -----------------------------------------------------------------
  // Test 4: Fully verified case (All critical evidence collected)
  // -----------------------------------------------------------------
  console.log("Test 4: Fully verified case (All critical evidence collected)");
  const checklistT4 = initialLandlordChecklist.map(item => {
    // Verify critical items: Rent Agreement, Bank Transfer Proof, WhatsApp Messages
    const isCritical = item.label === 'Rent Agreement' || item.label === 'Bank Transfer Proof' || item.label === 'WhatsApp Messages';
    return {
      ...item,
      checked: isCritical
    };
  });
  const gapsT4 = calculateEvidenceGaps('landlord', checklistT4);
  console.log("Missing Evidence count:", gapsT4.missingEvidence.length);
  
  if (gapsT4.missingEvidence.length !== 0) {
    console.error("FAIL: Test 4 should have 0 missing critical evidence items.");
    process.exit(1);
  }
  
  // Verify next action is generated with the correct fully verified action prefix
  const actionT4 = generateNextActionRecommendation('landlord', true);
  console.log("Recommended Action (Fully Verified):", actionT4.action);
  console.log("Reason:", actionT4.reason);
  
  if (actionT4.action !== "Generate Security Deposit Demand Notice") {
    console.error(`FAIL: Test 4 expected action 'Generate Security Deposit Demand Notice', got '${actionT4.action}'`);
    process.exit(1);
  }
  console.log("✔ Test 4 PASSED\n");

  // -----------------------------------------------------------------
  // Test 5: Next Action Recommendations for other cases
  // -----------------------------------------------------------------
  console.log("Test 5: Recommendations for other cases");
  const actionsToTest = [
    { cat: 'employment', verified: true, expected: "Generate Salary Recovery Notice" },
    { cat: 'employment', verified: false, expected: "Send Salary Recovery Notice" },
    { cat: 'consumer', verified: true, expected: "Generate Consumer Complaint" },
    { cat: 'consumer', verified: false, expected: "File Consumer Complaint" },
    { cat: 'cyber', verified: true, expected: "Prepare FIR / Transaction Evidence Package" },
    { cat: 'cyber', verified: false, expected: "File FIR and freeze transaction trail" }
  ];

  for (const t of actionsToTest) {
    const rec = generateNextActionRecommendation(t.cat as any, t.verified);
    console.log(`Category: ${t.cat} | Verified: ${t.verified} -> Action: "${rec.action}"`);
    if (rec.action !== t.expected) {
      console.error(`FAIL: Expected "${t.expected}", got "${rec.action}"`);
      process.exit(1);
    }
  }
  console.log("✔ Test 5 PASSED\n");

  console.log("==================================================");
  console.log("       ALL EVIDENCE GAP ADVISOR TESTS PASSED!     ");
  console.log("==================================================");
  process.exit(0);
}

runEvidenceGapsTests();
