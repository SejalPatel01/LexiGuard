import { autoFillPlaceholders } from '../hooks/use-chats';
import { ExtractedEntities } from '../types/agents';

function testAutoFill() {
  console.log("Starting Auto-Fill Placeholders unit tests...");

  const mockEntities: ExtractedEntities = {
    names: ["Rajesh Kumar", "Suresh Patel"],
    addresses: ["Flat 402, Sunshine Heights, Mumbai"],
    depositValues: ["Rs. 45,000"],
    amounts: ["Rs. 15,000"],
    agreementNumbers: ["RA-2026-9988"],
    phoneNumbers: ["+91-9876543210"],
    emailAddresses: ["rajesh.kumar@email.com"],
    dates: ["01-June-2026"]
  };

  const templateText = `
DEMAND NOTICE
Date: [Date]
To: [Landlord Name]
Address: [Property Address]
From: [Tenant Name]
Agreement Reference: [Agreement Number]
Deposit to refund: [Deposit Amount]
Landlord Phone: [Phone Number]
Landlord Email: [Email Address]

Dear [Landlord's Name],
This notice is regarding our agreement [Agreement Number] for premises at [Property Address]. Please refund the deposit of [Deposit Amount] immediately.
`;

  const expectedResult = `
DEMAND NOTICE
Date: 01-June-2026
To: Rajesh Kumar
Address: Flat 402, Sunshine Heights, Mumbai
From: Suresh Patel
Agreement Reference: RA-2026-9988
Deposit to refund: Rs. 45,000
Landlord Phone: +91-9876543210
Landlord Email: rajesh.kumar@email.com

Dear Rajesh Kumar,
This notice is regarding our agreement RA-2026-9988 for premises at Flat 402, Sunshine Heights, Mumbai. Please refund the deposit of Rs. 45,000 immediately.
`;

  const filledText = autoFillPlaceholders(templateText, mockEntities);
  console.log("Filled text outcome:\n", filledText);

  // Assertion checks
  const assertions = [
    { key: "Date", expected: "01-June-2026" },
    { key: "To", expected: "Rajesh Kumar" },
    { key: "Address", expected: "Flat 402, Sunshine Heights, Mumbai" },
    { key: "From", expected: "Suresh Patel" },
    { key: "Agreement Reference", expected: "RA-2026-9988" },
    { key: "Deposit to refund", expected: "Rs. 45,000" },
    { key: "Landlord Phone", expected: "+91-9876543210" },
    { key: "Landlord Email", expected: "rajesh.kumar@email.com" },
    { key: "Dear", expected: "Dear Rajesh Kumar" }
  ];

  for (const assertion of assertions) {
    if (!filledText.includes(assertion.expected)) {
      console.error(`FAIL: Expected filled text to contain '${assertion.expected}' for key '${assertion.key}'`);
      process.exit(1);
    }
  }

  // Test fallback/missing values remain as templates instead of N/A
  const entitiesNoDate: ExtractedEntities = { ...mockEntities };
  delete entitiesNoDate.dates;
  const filledFallbackDate = autoFillPlaceholders("Date: [Date]", entitiesNoDate);
  console.log("Fallback date output (missing date):", filledFallbackDate);
  if (filledFallbackDate !== "Date: [Date]") {
    console.error(`FAIL: Expected missing date to remain '[Date]', got '${filledFallbackDate}'`);
    process.exit(1);
  }

  // Test dynamic today/currentdate placeholders
  const filledToday = autoFillPlaceholders("Date: [today]", entitiesNoDate);
  const todayStr = new Date().toLocaleDateString();
  console.log("Today placeholder output:", filledToday);
  if (!filledToday.includes(todayStr)) {
    console.error(`FAIL: Expected [today] to be replaced by today's date '${todayStr}', got '${filledToday}'`);
    process.exit(1);
  }

  // Test overall fallback with empty entities
  const emptyEntities: ExtractedEntities = {
    names: [],
    dates: [],
    addresses: [],
    amounts: [],
    depositValues: [],
    agreementNumbers: [],
    phoneNumbers: [],
    emailAddresses: [],
    legalDates: []
  };

  const unfilledText = autoFillPlaceholders(templateText, emptyEntities);
  console.log("Unfilled template output:\n", unfilledText);

  // Assert that all placeholders remain completely unchanged
  const expectedPlaceholders = [
    "[Date]",
    "[Landlord Name]",
    "[Property Address]",
    "[Tenant Name]",
    "[Agreement Number]",
    "[Deposit Amount]",
    "[Phone Number]",
    "[Email Address]"
  ];

  for (const placeholder of expectedPlaceholders) {
    if (!unfilledText.includes(placeholder)) {
      console.error(`FAIL: Expected unfilled text to preserve placeholder '${placeholder}'`);
      process.exit(1);
    }
  }

  // Double check that NO "N/A", "null", or "undefined" is introduced
  if (unfilledText.includes("N/A") || unfilledText.includes("null") || unfilledText.includes("undefined")) {
    console.error("FAIL: Unfilled text contains forbidden generic placeholder values (N/A, null, undefined)");
    process.exit(1);
  }

  console.log("Auto-Fill Placeholders unit tests passed successfully!");
  process.exit(0);
}

testAutoFill();
