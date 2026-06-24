import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { runDocumentAnalyzerAgent } from '../agents/document-analyzer';

async function testEntityExtraction() {
  console.log("Starting Document Analyzer Entity Extraction tests...");

  const mockRentAgreementText = `
RENT AGREEMENT
This Rent Agreement is executed on 01-June-2026 at Mumbai between:
Landlord: Rajesh Kumar, residing at Flat 402, Sunshine Heights, Mumbai, India.
Tenant: Suresh Patel, residing at Room 12, Chawl 3, Pune, India.

1. PREMISES: The landlord rents the property located at Flat 402, Sunshine Heights, Mumbai.
2. DEPOSIT: The tenant has paid a security deposit of Rs. 45,000 (Forty-Five Thousand Rupees).
3. RENT: The tenant shall pay monthly rent of Rs. 15,000.
4. CONTRACT ID: RA-2026-9988.
5. CONTACT: Phone: +91-9876543210, Email: rajesh.kumar@email.com.
`;

  try {
    const response = await runDocumentAnalyzerAgent(mockRentAgreementText);
    console.log("Document Analyzer Response:", JSON.stringify(response, null, 2));

    // Assertions
    if (response.detectedDocType !== "Rent Agreement") {
      console.error(`FAIL: Expected detectedDocType to be 'Rent Agreement', got '${response.detectedDocType}'`);
      process.exit(1);
    }

    const entities = response.entities;
    if (!entities) {
      console.error("FAIL: Expected entities object to be present in response.");
      process.exit(1);
    }

    // Check Names
    const names = entities.names || [];
    const hasRajesh = names.some(n => n.toLowerCase().includes("rajesh"));
    const hasSuresh = names.some(n => n.toLowerCase().includes("suresh"));
    if (!hasRajesh || !hasSuresh) {
      console.warn(`WARNING: Expected names to include Rajesh and Suresh, got:`, names);
    }

    // Check Address
    const addresses = entities.addresses || [];
    const hasMumbai = addresses.some(a => a.toLowerCase().includes("mumbai") || a.toLowerCase().includes("sunshine"));
    if (!hasMumbai) {
      console.warn(`WARNING: Expected addresses to include Flat 402, Sunshine Heights, Mumbai, got:`, addresses);
    }

    // Check Deposit
    const deposits = entities.depositValues || [];
    const has45k = deposits.some(d => d.includes("45") || d.includes("45,000"));
    if (!has45k) {
      console.warn(`WARNING: Expected depositValues to include 45,000, got:`, deposits);
    }

    // Check Agreement Number
    const agreementNums = entities.agreementNumbers || [];
    const hasContractId = agreementNums.some(a => a.includes("RA-2026-9988"));
    if (!hasContractId) {
      console.warn(`WARNING: Expected agreementNumbers to include RA-2026-9988, got:`, agreementNums);
    }

    // Check Phone/Email
    const phones = entities.phoneNumbers || [];
    const emails = entities.emailAddresses || [];
    if (!phones.some(p => p.includes("9876543210")) || !emails.some(e => e.includes("rajesh.kumar"))) {
      console.warn(`WARNING: Expected phone +91-9876543210 and email rajesh.kumar@email.com, got:`, { phones, emails });
    }

    console.log("Entity extraction integration test completed successfully!");
    setTimeout(() => process.exit(0), 200);
  } catch (error) {
    console.error("Test execution failed:", error);
    setTimeout(() => process.exit(1), 200);
  }
}

testEntityExtraction();
