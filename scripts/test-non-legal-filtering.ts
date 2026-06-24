import { mergeExtractedEntities } from '../hooks/use-chats';
import { DocumentAnalyzerResponse } from '../types/agents';

function testNonLegalFiltering() {
  console.log("Starting Non-Legal Document Entity Filtering unit tests...");

  const mockLegalDoc = {
    name: "rent_agreement.pdf",
    type: "application/pdf",
    text: "Rent agreement text...",
    analysis: {
      summary: "Rent agreement summary.",
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: "Rent agreement text...",
      detectedDocType: "Rent Agreement",
      entities: {
        names: ["Rajesh Landlord", "Suresh Tenant"],
        addresses: ["Mumbai House"],
        depositValues: ["Rs. 45,000"],
        amounts: ["Rs. 15,000"],
        dates: ["01-June-2026"],
        agreementNumbers: ["RA-2026-9988"],
        phoneNumbers: ["+91-9876543210"],
        emailAddresses: ["rajesh@email.com"]
      }
    } as DocumentAnalyzerResponse
  };

  const mockNonLegalDoc = {
    name: "cat_chart.png",
    type: "image/png",
    text: "Cat chart screenshot...",
    analysis: {
      summary: "A cute chart of cats.",
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: "Cat chart screenshot...",
      detectedDocType: "Other", // Non-legal classification
      entities: {
        names: ["Cat Picture Owner", "Cute Kitten"],
        addresses: ["Cat Tree House"],
        depositValues: ["$0"],
        amounts: ["$100"],
        dates: ["20-June-2026"],
        agreementNumbers: ["CAT-REF-123"],
        phoneNumbers: ["+1-234567890"],
        emailAddresses: ["kitten@email.com"]
      }
    } as DocumentAnalyzerResponse
  };

  const merged = mergeExtractedEntities([mockLegalDoc, mockNonLegalDoc]);
  console.log("Merged Entities Output:", JSON.stringify(merged, null, 2));

  // Assertions for legal fields (names, addresses, depositValues, amounts)
  // Names should contain Rajesh and Suresh, but NOT Cat Picture Owner or Cute Kitten
  if (!merged.names?.includes("Rajesh Landlord") || !merged.names?.includes("Suresh Tenant")) {
    console.error("FAIL: Expected merged names to include Rajesh and Suresh.");
    process.exit(1);
  }
  if (merged.names?.includes("Cat Picture Owner") || merged.names?.includes("Cute Kitten")) {
    console.error("FAIL: Non-legal entities (names) were incorrectly merged.");
    process.exit(1);
  }

  // Address should contain Mumbai House, but NOT Cat Tree House
  if (!merged.addresses?.includes("Mumbai House")) {
    console.error("FAIL: Expected merged addresses to include Mumbai House.");
    process.exit(1);
  }
  if (merged.addresses?.includes("Cat Tree House")) {
    console.error("FAIL: Non-legal entities (addresses) were incorrectly merged.");
    process.exit(1);
  }

  // DepositValues should contain Rs. 45,000, but NOT $0
  if (!merged.depositValues?.includes("Rs. 45,000")) {
    console.error("FAIL: Expected merged depositValues to include Rs. 45,000.");
    process.exit(1);
  }
  if (merged.depositValues?.includes("$0")) {
    console.error("FAIL: Non-legal entities (depositValues) were incorrectly merged.");
    process.exit(1);
  }

  // Metadata should still be merged (dates, agreementNumbers, phoneNumbers, emailAddresses)
  if (!merged.dates?.includes("20-June-2026") || !merged.phoneNumbers?.includes("+1-234567890")) {
    console.error("FAIL: Expected metadata (dates, phoneNumbers) from other files to still be merged.");
    process.exit(1);
  }

  console.log("Non-Legal Document Entity Filtering unit tests passed successfully!");
  process.exit(0);
}

testNonLegalFiltering();
