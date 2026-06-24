import { runLegalAssessment, analyzeUploadedFileAction } from '../app/actions/orchestrate';
import { autoVerifyChecklistAndScore } from '../hooks/use-chats';
import { Message, CaseChecklistItem } from '../types';

// Mock active chat state for testing
interface TestChatState {
  messages: Message[];
  checklist: CaseChecklistItem[];
  uploadedDocs: any[];
}

const initialChecklist: CaseChecklistItem[] = [
  { id: 'chk-1', label: 'Written Lease/Purchase/Employment Agreement', checked: false },
  { id: 'chk-2', label: 'Proof of Transactions (Receipts/Statements)', checked: false },
  { id: 'chk-3', label: 'Correspondence Logs (Emails/Chats)', checked: false }
];

// Helper to simulate client-side composer state machine
class ComposerSimulation {
  inputVal: string = "";
  pendingAttachments: Array<{ name: string; type: string; base64: string }> = [];
  chatState: TestChatState = {
    messages: [],
    checklist: [...initialChecklist],
    uploadedDocs: []
  };

  attachFile(name: string, type: string, base64: string) {
    if (this.pendingAttachments.some(item => item.name === name)) return;
    this.pendingAttachments.push({ name, type, base64 });
  }

  removeFile(name: string) {
    this.pendingAttachments = this.pendingAttachments.filter(item => item.name !== name);
  }

  typePrompt(text: string) {
    this.inputVal = text;
  }

  isSendDisabled(): boolean {
    return !this.inputVal.trim() && this.pendingAttachments.length === 0;
  }

  async handleSend() {
    const promptText = this.inputVal.trim();
    const attachments = [...this.pendingAttachments];

    if (!promptText && attachments.length === 0) {
      throw new Error("Cannot send empty composer");
    }

    // Clear state just like the UI does
    this.inputVal = "";
    this.pendingAttachments = [];

    // Sequentially process each attachment
    for (const file of attachments) {
      console.log(`[SIMULATE-SEND] Processing attachment: ${file.name}`);
      
      // Simulate server action behavior
      const activeLabels = this.chatState.checklist.map(item => item.label);
      const res = await analyzeUploadedFileAction(file.base64, file.name, file.type);
      
      if ('error' in res) {
        throw new Error(`File upload error: ${res.error}`);
      }

      // Simulate local state updates
      const userMsg: Message = {
        id: `msg-u-upload-${Date.now()}`,
        role: 'user',
        content: `[Document Uploaded: ${file.name}]`,
        timestamp: '12:00 PM'
      };

      const docObj = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type,
        text: res.text,
        analysis: res.analysis
      };

      this.chatState.uploadedDocs.push(docObj);
      this.chatState.messages.push(userMsg);

      // Verify matching evidence checklist item
      const updatedChecklist = this.chatState.checklist.map(item => {
        const detected = res.detectedEvidence.some(
          (matched: string) => matched.toLowerCase().trim() === item.label.toLowerCase().trim()
        );
        return {
          ...item,
          checked: item.checked || detected
        };
      });

      const assistantMsg: Message = {
        id: `msg-a-upload-${Date.now()}`,
        role: 'assistant',
        content: `I have successfully analyzed ${file.name}.`,
        timestamp: '12:00 PM'
      };

      this.chatState.messages.push(assistantMsg);

      const verified = autoVerifyChecklistAndScore(
        this.chatState.messages,
        updatedChecklist,
        docObj,
        this.chatState.uploadedDocs
      );

      this.chatState.checklist = verified.checklist;
    }

    // Send prompt if present
    if (promptText) {
      console.log(`[SIMULATE-SEND] Sending prompt text: "${promptText}"`);
      const userMsg: Message = {
        id: `msg-u-prompt-${Date.now()}`,
        role: 'user',
        content: promptText,
        timestamp: '12:01 PM'
      };
      
      this.chatState.messages.push(userMsg);

      const historyContext = this.chatState.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await runLegalAssessment(promptText, historyContext);
      if ('error' in res) {
        throw new Error(`Orchestrator error: ${res.error}`);
      }

      const assistantMsg: Message = {
        id: `msg-a-prompt-${Date.now()}`,
        role: 'assistant',
        content: res.advice.text,
        timestamp: '12:01 PM'
      };

      this.chatState.messages.push(assistantMsg);

      // Map timeline, summary, and checklist updates from orchestrator
      const mappedChecklist = res.actions.checklist.map((label: string) => {
        const existing = this.chatState.checklist.find(
          (item) => item.label.toLowerCase() === label.toLowerCase()
        );
        return {
          id: existing?.id || `chk-gen-${Date.now()}`,
          label,
          checked: existing?.checked || false
        };
      });

      const verified = autoVerifyChecklistAndScore(
        this.chatState.messages,
        mappedChecklist,
        undefined,
        this.chatState.uploadedDocs
      );

      this.chatState.checklist = verified.checklist;
    }
  }
}

async function runTests() {
  process.env.MOCK_GEMINI = 'true';
  console.log("==========================================");
  console.log("    PHASE 4: WORKFLOW VERIFICATION SUITE  ");
  console.log("==========================================\n");

  // --- TC-1: Attach file only -> Send ---
  console.log("TC-1: Attach file only -> Send");
  const composer1 = new ComposerSimulation();
  composer1.attachFile("rent-agreement.pdf", "application/pdf", "dummyBase64==");
  
  console.log("  Is Send disabled?", composer1.isSendDisabled());
  if (composer1.isSendDisabled()) throw new Error("Send should be enabled with file attached");

  await composer1.handleSend();
  
  console.log("  Checklist state:", composer1.chatState.checklist.map(c => `${c.label}: ${c.checked}`));
  console.log("  Messages count:", composer1.chatState.messages.length);
  const tc1Passed = composer1.chatState.messages.some(m => m.content.includes("Document Uploaded: rent-agreement.pdf"));
  console.log("  TC-1 Passed:", tc1Passed);
  if (!tc1Passed) throw new Error("TC-1 Verification failed");

  // --- TC-2: Prompt only -> Send ---
  console.log("\nTC-2: Prompt only -> Send");
  const composer2 = new ComposerSimulation();
  composer2.typePrompt("I have a rent deposit issue");
  
  console.log("  Is Send disabled?", composer2.isSendDisabled());
  if (composer2.isSendDisabled()) throw new Error("Send should be enabled with text prompt typed");

  await composer2.handleSend();
  console.log("  Messages count:", composer2.chatState.messages.length);
  const tc2Passed = composer2.chatState.messages.some(m => m.content === "I have a rent deposit issue");
  console.log("  TC-2 Passed:", tc2Passed);
  if (!tc2Passed) throw new Error("TC-2 Verification failed");

  // --- TC-3: Prompt + File -> Send ---
  console.log("\nTC-3: Prompt + File -> Send");
  const composer3 = new ComposerSimulation();
  composer3.attachFile("rent-agreement.pdf", "application/pdf", "dummyBase64==");
  composer3.typePrompt("Analyze my agreement for risky clauses");

  console.log("  Is Send disabled?", composer3.isSendDisabled());
  if (composer3.isSendDisabled()) throw new Error("Send should be enabled with prompt and file");

  await composer3.handleSend();
  console.log("  Messages count:", composer3.chatState.messages.length);
  const hasFileMsg = composer3.chatState.messages.some(m => m.content.includes("Document Uploaded: rent-agreement.pdf"));
  const hasPromptMsg = composer3.chatState.messages.some(m => m.content === "Analyze my agreement for risky clauses");
  const tc3Passed = hasFileMsg && hasPromptMsg;
  console.log("  TC-3 Passed:", tc3Passed);
  if (!tc3Passed) throw new Error("TC-3 Verification failed");

  // --- TC-4: Attach file -> Remove -> Send prompt ---
  console.log("\nTC-4: Attach file -> Remove -> Send prompt");
  const composer4 = new ComposerSimulation();
  composer4.attachFile("rent-agreement.pdf", "application/pdf", "dummyBase64==");
  console.log("  Staged files before remove:", composer4.pendingAttachments.map(f => f.name));
  
  composer4.removeFile("rent-agreement.pdf");
  console.log("  Staged files after remove:", composer4.pendingAttachments.map(f => f.name));
  if (composer4.pendingAttachments.length !== 0) throw new Error("File was not removed");

  composer4.typePrompt("My lease is ending");
  await composer4.handleSend();
  console.log("  Messages count:", composer4.chatState.messages.length);
  const fileSent = composer4.chatState.messages.some(m => m.content.includes("Document Uploaded"));
  const promptSent = composer4.chatState.messages.some(m => m.content === "My lease is ending");
  const tc4Passed = !fileSent && promptSent;
  console.log("  TC-4 Passed:", tc4Passed);
  if (!tc4Passed) throw new Error("TC-4 Verification failed");

  // --- TC-5: Multiple files + prompt ---
  console.log("\nTC-5: Multiple files + prompt");
  const composer5 = new ComposerSimulation();
  composer5.attachFile("agreement.pdf", "application/pdf", "dummyBase64==");
  composer5.attachFile("bank-proof.pdf", "application/pdf", "dummyBase64==");
  composer5.attachFile("whatsapp-export.pdf", "application/pdf", "dummyBase64==");
  composer5.typePrompt("Here are all my evidence documents.");

  console.log("  Staged files count:", composer5.pendingAttachments.length);
  if (composer5.pendingAttachments.length !== 3) throw new Error("Staging multiple files failed");

  await composer5.handleSend();
  console.log("  Messages count:", composer5.chatState.messages.length);
  const uploadedFiles = composer5.chatState.messages
    .filter(m => m.content.startsWith("[Document Uploaded:"))
    .map(m => m.content);
  console.log("  Uploaded files recorded:", uploadedFiles);
  const tc5Passed = uploadedFiles.length === 3 && composer5.chatState.messages.some(m => m.content === "Here are all my evidence documents.");
  console.log("  TC-5 Passed:", tc5Passed);
  if (!tc5Passed) throw new Error("TC-5 Verification failed");

  // --- Composer Disabled Send button edge case ---
  console.log("\nComposer edge case: Disabled Send state when empty");
  const composerEdge = new ComposerSimulation();
  console.log("  Initial disabled state:", composerEdge.isSendDisabled());
  if (!composerEdge.isSendDisabled()) throw new Error("Send should be disabled initially");

  console.log("\n==========================================");
  console.log("   ALL PHASE 4 WORKFLOW TEST CASES PASSED ");
  console.log("==========================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
