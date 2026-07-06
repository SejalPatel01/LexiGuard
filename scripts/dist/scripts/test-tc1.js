"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("@next/env");
(0, env_1.loadEnvConfig)(process.cwd());
const orchestrate_1 = require("../app/actions/orchestrate");
const use_chats_1 = require("../hooks/use-chats");
async function testTC1() {
    const query = "My landlord is not returning my deposit. I have rent agreement, bank transfer proof and WhatsApp messages.";
    console.log("=== TC-1: Standard landlord deposit dispute ===");
    console.log("Input Query:", query);
    const response = await (0, orchestrate_1.runLegalAssessment)(query, []);
    if ('isBlocked' in response && response.isBlocked) {
        console.error("Pipeline failed with security block:", response.reason);
        process.exit(1);
    }
    if ('error' in response) {
        console.error("Pipeline failed with error:", response.error);
        process.exit(1);
    }
    const success = response;
    console.log("\n--- 1. Classification ---");
    console.log("Category:", success.category);
    console.log("\n--- 2. Advice Generation ---");
    console.log("Advice Text Summary:\n", success.advice.text.substring(0, 400) + "...");
    console.log("\n--- 3. Evidence Detection & 4. Checklist Generation ---");
    console.log("Suggested Checklist from Orchestrator:", success.actions.checklist);
    // Map checklist to standard checklist layout
    const initialChecklist = [
        { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
        { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
        { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
        { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
    ];
    const mappedChecklist = success.actions.checklist.map((label, idx) => {
        const existing = initialChecklist.find((item) => item.label.toLowerCase() === label.toLowerCase());
        return {
            id: existing?.id || `chk-gen-${Date.now()}-${idx}`,
            label,
            checked: existing?.checked || false
        };
    });
    const mockUserMsg = { id: '1', role: 'user', content: query, timestamp: '10:00 AM' };
    const verified = (0, use_chats_1.autoVerifyChecklistAndScore)([mockUserMsg], mappedChecklist);
    console.log("Mapped & Verified Checklist:");
    verified.checklist.forEach(item => {
        console.log(`- [${item.checked ? 'X' : ' '}] ${item.label}`);
    });
    console.log("\n--- 5. Case Strength Scoring ---");
    console.log("Score:", verified.caseStrength.score + "%");
    console.log("Risk Level:", verified.caseStrength.riskLevel);
    console.log("Risk Factors:", verified.caseStrength.riskFactors);
    console.log("\n--- 6. Timeline Generation ---");
    console.log("Timeline Events:", success.actions.timeline);
    console.log("\n--- 7. Generated Documents ---");
    console.log("Draft Documents:", success.actions.documents.map((d) => ({
        title: d.title,
        type: d.type,
        previewLength: d.previewText.length
    })));
    process.exit(0);
}
testTC1().catch(console.error);
