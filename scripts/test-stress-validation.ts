process.env.MOCK_GEMINI = 'true';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runLegalAssessment } from '../app/actions/orchestrate';
import { resolveEntities, validateName, getNameSimilarity } from '../services/entity-resolver';
import { mapToUniversalEvidenceCategory } from '../services/evaluation';
import { performance } from 'perf_hooks';

interface BenchmarkMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalTime: number;
  evaluationTime: number;
  resolverTime: number;
  draftTime: number;
}

const metrics: BenchmarkMetrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalTime: 0,
  evaluationTime: 0,
  resolverTime: 0,
  draftTime: 0
};

function assert(condition: boolean, message: string) {
  metrics.totalTests++;
  if (condition) {
    metrics.passedTests++;
    console.log(` -> [PASS] ${message}`);
  } else {
    metrics.failedTests++;
    console.error(` -> [FAIL] ${message}`);
    process.exit(1);
  }
}

async function runFreezeValidation() {
  console.log("==================================================");
  console.log("    LEXIGUARD FREEZE CANDIDATE STRESS TEST SUITE   ");
  console.log("==================================================");

  // 1. Multi-Conversation Stress Testing
  console.log("\n[TEST 1] Simulating Multi-Conversation Isolation...");
  
  // Chat 1: Landlord dispute
  const chat1Query = "My landlord hasn't returned my Rs 45,000 security deposit.";
  const chat1Doc = {
    name: 'rent_agreement.pdf',
    type: 'application/pdf',
    text: "RENT AGREEMENT: Rajesh Landlord, Lessor. Suresh Tenant, Lessee. Deposit Rs 45,000. Flat 402 Sunshine Mumbai.",
    analysis: {
      summary: "Rent agreement summary details.",
      entities: {
        names: ["Rajesh Landlord", "Suresh Tenant"],
        amounts: ["Rs. 15,000"],
        depositValues: ["Rs. 45,000"],
        addresses: ["Flat 402, Sunshine Heights, Mumbai"]
      },
      detectedDocType: "Rent Agreement"
    }
  };

  // Chat 2: Employment dispute
  const chat2Query = "My company has withheld my wages for three months.";
  const chat2Doc = {
    name: 'offer_letter.pdf',
    type: 'application/pdf',
    text: "OFFER LETTER: TechCorp, Employer. Ajay Kumar, Employee. Salary Rs 1,20,000.",
    analysis: {
      summary: "Employment contract details.",
      entities: {
        names: ["TechCorp", "Ajay Kumar"],
        amounts: ["Rs. 1,20,000"],
        addresses: ["TechCorp HQ, Bangalore"]
      },
      detectedDocType: "Employment Contract"
    }
  };

  const t1Start = performance.now();
  const res1 = await runLegalAssessment(chat1Query, [], 'en', [chat1Doc as any]);
  const res2 = await runLegalAssessment(chat2Query, [], 'en', [chat2Doc as any]);
  const t1End = performance.now();

  const c1 = res1 as any;
  const c2 = res2 as any;

  assert(c1.category === "Landlord / Property Issue", "Chat 1 correctly classified as Landlord / Property Issue");
  assert(c2.category === "Employment Dispute", "Chat 2 correctly classified as Employment Dispute");

  // Verify complete isolation
  const c1Draft = c1.actions?.documents?.[0]?.previewText || "";
  const c2Draft = c2.actions?.documents?.[0]?.previewText || "";

  assert(c1Draft.includes("Suresh Tenant") && c1Draft.includes("Rajesh Landlord"), "Chat 1 draft contains landlord parties");
  assert(!c1Draft.includes("Ajay Kumar") && !c1Draft.includes("TechCorp"), "Chat 1 draft has no leakage from Chat 2");
  assert(c2Draft.includes("Ajay Kumar") && c2Draft.includes("TechCorp"), "Chat 2 draft contains employment parties");
  assert(!c2Draft.includes("Suresh Tenant") && !c2Draft.includes("Rajesh Landlord"), "Chat 2 draft has no leakage from Chat 1");

  console.log(" -> [PASS] Isolated contexts verified between parallel chats.");

  // 2. Multi-Document Conflict Validation
  console.log("\n[TEST 2] Simulating Multi-Document Conflict Detection...");
  
  const landlordDoc1 = {
    name: 'rent_agreement.pdf',
    type: 'application/pdf',
    text: "RENT AGREEMENT: Rajesh Landlord, Lessor. Suresh Tenant, Lessee. Deposit Rs 45,000. Flat 402 Sunshine Mumbai.",
    analysis: {
      summary: "Rent agreement details.",
      entities: {
        names: ["Rajesh Landlord", "Suresh Tenant"],
        depositValues: ["Rs. 45,000"],
        addresses: ["Flat 402, Sunshine Heights, Mumbai"]
      },
      detectedDocType: "Rent Agreement"
    }
  };

  const landlordDoc2 = {
    name: 'receipt.pdf',
    type: 'application/pdf',
    text: "PAYMENT RECEIPT: Refunded only Rs. 20,000 deposit to tenant.",
    analysis: {
      summary: "Bank payment transfer receipt.",
      entities: {
        names: ["Rajesh Landlord", "Suresh Tenant"],
        amounts: ["Rs. 20,000"]
      },
      detectedDocType: "Bank Receipt"
    }
  };

  const resConflict = await runLegalAssessment(chat1Query, [], 'en', [landlordDoc1 as any, landlordDoc2 as any]);
  const cConflict = resConflict as any;

  console.log("[DEBUG Conflict Test]");
  console.log(" -> cConflict keys:", Object.keys(cConflict));
  console.log(" -> actions.riskFactors:", cConflict.actions?.riskFactors);
  console.log(" -> caseContext.riskFactors:", cConflict.caseContext?.riskFactors);

  assert(cConflict.actions?.riskFactors?.some((rf: string) => rf.includes("mismatch")), "Conflict warning raised for mismatched deposit amounts");
  assert(cConflict.actions?.score < 85, "Case score penalized due to document transaction discrepancies");

  const conflictDraft = cConflict.actions?.documents?.[0]?.previewText || "";
  assert(conflictDraft.includes("[DISCREPANCY WARNING:"), "Draft notice contains discrepancy warning block at the beginning");

  // 3. Long Conversation Memory Stability
  console.log("\n[TEST 3] Simulating Long Conversation Stability...");
  let chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: "My landlord hasn't returned my Rs 45,000 deposit." },
    { role: 'assistant', content: "Based on your rent agreement, Rajesh Landlord owes you Rs. 45,000. You should send a demand notice." },
    { role: 'user', content: "Can you regenerate the notice for me?" },
    { role: 'assistant', content: "Sure, drafting your notice..." },
    { role: 'user', content: "Actually, please make sure the notice goes to Mr. Rajesh Kumar Prasad." }
  ];

  const resLong = await runLegalAssessment("Generate revised notice with Mr. Rajesh Kumar Prasad as recipient.", chatHistory, 'en', [landlordDoc1 as any]);
  const cLong = resLong as any;
  const longDraft = cLong.actions?.documents?.[0]?.previewText || "";

  assert(longDraft.includes("Suresh Tenant"), "Suresh Tenant remains sender in long conversation");
  assert(longDraft.includes("Rajesh Kumar Prasad") || longDraft.includes("Rajesh Landlord"), "Recipient name remains stable or matches updated recipient name");

  // 4. Confidence Threshold Validation
  console.log("\n[TEST 4] Validating Entity Resolution Confidence Thresholds...");
  
  const rawNames = ["Ajay Devgan", "Aakash"];
  const resolvedMock = resolveEntities(
    rawNames,
    [],
    [],
    [],
    "EMPLOYER: TechCorp. EMPLOYEE: Ajay Devgan. MANAGER: Aakash.",
    "Employment Dispute",
    [{ name: "Ajay Devgan", role: "Employee" }]
  );

  const highConf = resolvedMock.find(e => e.value === "Ajay Devgan");
  const lowConf = resolvedMock.find(e => e.value === "Aakash");

  assert(highConf !== undefined && highConf.confidence >= 0.85, "Verified name Ajay Devgan has high confidence score");
  assert(lowConf === undefined || lowConf.confidence < 0.85, "Unverified side name Aakash stays below 0.85 threshold");

  // 5. Universal Regression Testing for All 9 Domains
  console.log("\n[TEST 5] Running Universal Regression Suite (All 9 Domains)...");

  const domains = [
    { name: "Tenant / Landlord", query: "Landlord withholding deposit", category: "Landlord / Property Issue", docType: "Rent Agreement" },
    { name: "Consumer Complaint", query: "Laptop purchase refund merchant refused", category: "Consumer Complaint", docType: "Invoice" },
    { name: "Employment", query: "Tech employer fired me wrongfully and unpaid wages", category: "Employment Dispute", docType: "Employment Contract" },
    { name: "Cybercrime", query: "UPI fraud bank transaction otp stolen hacked", category: "Cybercrime", docType: "Bank Statement" },
    { name: "Family", query: "Spouse divorce custody alimony settlement dispute", category: "Family Dispute", docType: "Other" },
    { name: "Contract Dispute", query: "Vendor contract breach of nda non-disclosure terms", category: "Contract Issue", docType: "Lease Agreement" },
    { name: "Property", query: "Landlord evicted tenant without notice", category: "Landlord / Property Issue", docType: "Rent Agreement" },
    { name: "Police Complaint", query: "Threatening message cyber stalking cybercrime", category: "Cybercrime", docType: "WhatsApp Screenshot" },
    { name: "General Civil", query: "Civil dispute of contractual obligations", category: "Contract Issue", docType: "Lease Agreement" }
  ];

  for (const d of domains) {
    const start = performance.now();
    const res = await runLegalAssessment(d.query, [], 'en', [
      {
        name: 'contract.pdf',
        type: 'application/pdf',
        text: `Parties: Rajesh Kumar and Suresh Kumar. Date: 01-June-2026. Document type: ${d.docType}`,
        analysis: {
          summary: `Mock document text for domain testing of ${d.name}.`,
          entities: {
            names: ["Rajesh Kumar", "Suresh Kumar"],
            dates: ["01-June-2026"]
          },
          detectedDocType: d.docType
        }
      } as any
    ]);
    const duration = performance.now() - start;
    const r = res as any;

    console.log(` -> Domain "${d.name}" E2E latency: ${duration.toFixed(2)}ms`);
    assert(r.category !== undefined, `Domain "${d.name}" parsed category: ${r.category}`);
    assert(r.actions?.documents?.length > 0, `Domain "${d.name}" generated draft notice`);
  }

  // 6. Performance Benchmarking Latency Profiling
  console.log("\n[TEST 6] Measuring Performance & Latency Benchmarks...");
  
  // Profile E2E Orchestrator Pipeline
  const runProfileCount = 5;
  let totalE2ELatency = 0;
  for (let i = 0; i < runProfileCount; i++) {
    const start = performance.now();
    await runLegalAssessment(chat1Query, [], 'en', [chat1Doc as any]);
    totalE2ELatency += (performance.now() - start);
  }

  const avgE2E = totalE2ELatency / runProfileCount;
  console.log(` -> Average End-to-End Orchestration Latency: ${avgE2E.toFixed(2)}ms`);
  assert(avgE2E < 200, "Reasoning pipeline remains highly performant (< 200ms average under mock configuration)");

  console.log("\n==================================================");
  console.log("   ALL FREEZE VALIDATION STRESS TESTS PASSED!    ");
  console.log("==================================================");

  console.log("\n--- STRESS TEST METRICS ---");
  console.log(`Total assertions run: ${metrics.totalTests}`);
  console.log(`Passed: ${metrics.passedTests}`);
  console.log(`Failed: ${metrics.failedTests}`);
  console.log(`Avg E2E Response Latency: ${avgE2E.toFixed(2)}ms`);
}

runFreezeValidation().catch(err => {
  console.error("Stress tests failed:", err);
  process.exit(1);
});
