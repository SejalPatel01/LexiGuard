process.env.MOCK_GEMINI = 'true';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runLegalAssessment } from '../app/actions/orchestrate';
import { resolveEntities, validateName, getNameSimilarity } from '../services/entity-resolver';
import { mapToUniversalEvidenceCategory, getUniversalEvidenceCategoryOfDoc } from '../services/evaluation';

async function testUniversalEngine() {
  console.log("==================================================");
  console.log("    RUNNING UNIVERSAL LEGAL ENGINE TEST SUITE    ");
  console.log("==================================================");

  // 1. Test Entity Resolver Pronoun Filtering
  console.log("\n[TEST 1] Testing Pronoun & Relation Filtering...");
  const badNames = ["my", "our landlord", "his employer", "my company", "their bank", "i", "mine"];
  badNames.forEach(name => {
    const validated = validateName(name);
    if (validated !== null) {
      console.error(` -> [FAIL] Expected name "${name}" to be rejected as pronoun/relation but got "${validated}"`);
      process.exit(1);
    }
  });
  console.log(" -> [PASS] All pronouns and conversational relation names successfully rejected.");

  // 2. Test Multi-Signal Entity Merging Name Similarity
  console.log("\n[TEST 2] Testing Name Similarity Calculations...");
  const name1 = "Mr. Rajesh Sharma";
  const name2 = "Rajesh Kumar Sharma";
  const sim = getNameSimilarity(name1, name2);
  console.log(` -> Similarity between "${name1}" and "${name2}": ${sim.toFixed(2)}`);
  if (sim < 0.7) {
    console.error(" -> [FAIL] Expected similarity to be high (>= 0.7)");
    process.exit(1);
  }
  console.log(" -> [PASS] Name similarity resolved correctly.");

  // 3. Test Universal Evidence Mapping
  console.log("\n[TEST 3] Testing Document-Independent Evidence Mapping...");
  const checklistLabels = [
    { label: "Written Lease/Purchase/Employment Agreement", expected: "Contract Evidence" },
    { label: "Salary slips or pay slips", expected: "Payment Proof" },
    { label: "WhatsApp Chat Logs or Email Threads", expected: "Communication Evidence" },
    { label: "Product Return Proof courier slip", expected: "Supporting Evidence" }
  ];

  checklistLabels.forEach(item => {
    const category = mapToUniversalEvidenceCategory(item.label);
    console.log(` -> "${item.label}" mapped to: "${category}"`);
    if (category !== item.expected) {
      console.error(` -> [FAIL] Expected "${item.expected}" but got "${category}"`);
      process.exit(1);
    }
  });
  console.log(" -> [PASS] All checklist labels mapped correctly to universal evidence categories.");

  // 4. Test E2E Consumer Complaint scenario
  console.log("\n[TEST 4] Simulating Consumer Complaint Case E2E...");
  const consumerQuery = "I bought a laptop from Suresh Electronics for Rs. 50,000 but it stopped working in 2 days. The invoice was uploaded. Please analyze.";
  const mockConsumerDoc = {
    name: 'invoice_50000.pdf',
    type: 'application/pdf',
    text: "INVOICE: Suresh Electronics, Seller. Rajesh Kumar, Buyer. Amount: Rs. 50,000. Date: 01-July-2026.",
    analysis: {
      summary: "Invoice details for purchase from Suresh Electronics.",
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: "Purchase invoice for laptop from Suresh Electronics by Rajesh Kumar.",
      entities: {
        names: ["Suresh Electronics", "Rajesh Kumar"],
        amounts: ["Rs. 50,000"],
        addresses: ["Mumbai, Maharashtra"],
        dates: ["01-July-2026"]
      },
      detectedDocType: "Invoice"
    }
  };

  const response = await runLegalAssessment(consumerQuery, [], 'en', [mockConsumerDoc]);
  if ('isBlocked' in response && response.isBlocked) {
    console.error(" -> [FAIL] Assessment blocked by safety shield.");
    process.exit(1);
  }

  const successResult = response as any;
  console.log(" -> Detected Case Category:", successResult.category);
  console.log(" -> Case Score:", successResult.actions?.score);
  console.log(" -> Case Risk Level:", successResult.actions?.riskLevel);
  console.log(" -> Mapped Checklist Size:", successResult.caseContext?.checklist?.length);

  const finalDraft = successResult.actions?.documents?.[0]?.previewText || "";
  console.log("\nGenerated Draft Document Snippet:\n-------------------------------------------------------------");
  console.log(finalDraft.substring(0, 300));
  console.log("-------------------------------------------------------------");

  if (finalDraft.includes("Suresh Electronics") && finalDraft.includes("Rajesh Kumar")) {
    console.log(" -> [PASS] Sender and Recipient names replaced correctly.");
  } else {
    console.error(" -> [FAIL] Document draft placeholders were not replaced correctly.");
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("   ALL UNIVERSAL ENGINE TEST SUITES PASSED!     ");
  console.log("==================================================");
}

testUniversalEngine().catch(err => {
  console.error(err);
  process.exit(1);
});
