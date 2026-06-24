import { autoVerifyChecklistAndScore, mapLabelToCategory } from '../hooks/use-chats';
import { Chat, Message, CaseChecklistItem } from '../types';

// Define a starting mock chat similar to a new chat
const createMockChat = (): Chat => ({
  id: 'chat-test',
  title: 'New Case Inquiry',
  createdAt: new Date().toISOString(),
  messages: [],
  checklist: [
    { id: 'chk-n-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
    { id: 'chk-n-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
    { id: 'chk-n-3', label: 'Correspondence Logs (Emails/Chats)', checked: false },
    { id: 'chk-n-4', label: 'Government ID & Proof of Address', checked: false }
  ],
  caseStrength: {
    score: 40,
    riskLevel: 'Medium',
    riskFactors: ['Initial details pending.']
  },
  timeline: [],
  generatedDocs: [],
  summary: {
    overview: 'Initial',
    legalProvisions: [],
    nextAction: 'None'
  }
});

function simulateMessageFlow(success: boolean) {
  let chat = createMockChat();
  console.log(`\n================ SIMULATING FLOW (Success = ${success}) ================`);
  console.log("Initial Checklist:", chat.checklist.map(c => `${c.label} (${c.checked})`));
  console.log("Initial Case Strength Score:", chat.caseStrength.score);

  // 1. User sends message
  const userQuery = "My landlord is not returning my deposit. I only have the rent agreement and WhatsApp messages.";
  const userMsg: Message = {
    id: `msg-u-1`,
    role: 'user',
    content: userQuery,
    timestamp: '10:00 AM'
  };

  // Step 1 setChats callback:
  const newMsgs = [...chat.messages, userMsg];
  const verified1 = autoVerifyChecklistAndScore(newMsgs, chat.checklist);
  chat = {
    ...chat,
    messages: newMsgs,
    checklist: verified1.checklist,
    caseStrength: verified1.caseStrength
  };

  console.log("\nAfter Step 1 (User Message Sent):");
  console.log("Checklist:", chat.checklist.map(c => `${c.label} (${c.checked})`));
  console.log("Case Strength Score:", chat.caseStrength.score);

  if (success) {
    // Mock successful response from runLegalAssessment
    const response = {
      category: "Landlord Dispute",
      advice: { text: "Here is your legal advice..." },
      actions: {
        checklist: [
          "Rent agreement",
          "WhatsApp messages",
          "Bank statement showing deposit payment"
        ],
        timeline: [],
        documents: [],
        summary: "Overview...",
        legalProvisions: [],
        nextAction: "Action..."
      }
    };

    const assistantMsg: Message = {
      id: `msg-a-1`,
      role: 'assistant',
      content: response.advice.text,
      timestamp: '10:01 AM'
    };

    // Step 2 setChats callback (Success):
    // Map evidence checklist and keep already checked states if matching
    const mappedChecklist = response.actions.checklist.map((label, idx) => {
      const existing = chat.checklist.find(
        (item) => item.label.toLowerCase() === label.toLowerCase()
      );
      return {
        id: existing?.id || `chk-gen-${Date.now()}-${idx}`,
        label,
        checked: existing?.checked || false
      };
    });

    const allMsgs = [...chat.messages, assistantMsg];
    const verified2 = autoVerifyChecklistAndScore(allMsgs, mappedChecklist);

    chat = {
      ...chat,
      messages: allMsgs,
      checklist: verified2.checklist,
      caseStrength: verified2.caseStrength
    };

    console.log("\nAfter Step 2 (LLM Advisor Success Response):");
    console.log("Checklist:", chat.checklist.map(c => `${c.label} (${c.checked})`));
    console.log("Case Strength Score:", chat.caseStrength.score);
  } else {
    // Mock failed response (e.g. rate limit error)
    const errMsg: Message = {
      id: `msg-err-1`,
      role: 'assistant',
      content: `Connection error: Quota exceeded.`,
      timestamp: '10:01 AM'
    };

    // Step 2 setChats callback (Failure):
    chat = {
      ...chat,
      messages: [...chat.messages, errMsg]
    };

    console.log("\nAfter Step 2 (LLM Advisor Failure Response):");
    console.log("Checklist:", chat.checklist.map(c => `${c.label} (${c.checked})`));
    console.log("Case Strength Score:", chat.caseStrength.score);
  }
}

simulateMessageFlow(true);
simulateMessageFlow(false);
