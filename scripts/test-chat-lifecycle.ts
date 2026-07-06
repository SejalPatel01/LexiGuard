// Simulation test for use-chats hook lifecycle rules

interface Chat {
  id: string;
  title: string;
  messages: any[];
}

let chats: Chat[] = [
  { id: 'chat-existing-1', title: 'Existing case 1', messages: [{ role: 'user', content: 'hello' }] }
];
let activeChatId: string | null = 'chat-existing-1';
let mounted = true;

// Mock dispatchers to simulate our hooks
function getActiveChat() {
  return chats.find(c => c.id === activeChatId) || null;
}

function createChat(title?: string): string {
  const activeChat = getActiveChat();
  if (activeChat && activeChat.messages.length === 0) {
    return activeChat.id;
  }

  // Cleanup effect simulation on creation
  chats = chats.filter(c => c.id === activeChatId || c.messages.length > 0);

  const newId = `chat-${Date.now()}`;
  const newChat: Chat = {
    id: newId,
    title: title || 'New Case Inquiry',
    messages: []
  };
  chats = [newChat, ...chats];
  activeChatId = newId;
  return newId;
}

function selectChat(id: string) {
  if (activeChatId && activeChatId !== id) {
    // Cleanup empty chats simulation
    chats = chats.filter(c => c.id === activeChatId || c.messages.length > 0);
  }
  activeChatId = id;
  // Trigger cleanup simulation on selection change
  triggerActiveChatIdChangeEffect();
}

function sendMessage(content: string) {
  if (!activeChatId) return;
  chats = chats.map(c => {
    if (c.id === activeChatId) {
      return {
        ...c,
        messages: [...c.messages, { role: 'user', content }]
      };
    }
    return c;
  });
}

function triggerActiveChatIdChangeEffect() {
  // useEffect logic: filter out any empty chats that are not activeChatId
  chats = chats.filter(c => c.id === activeChatId || c.messages.length > 0);
}

function getLocalStoragePayload(): string {
  const chatsToPersist = chats.filter(c => c.messages.length > 0);
  return JSON.stringify(chatsToPersist);
}

function runLifecycleTests() {
  console.log('=== STARTING CHAT LIFECYCLE SIMULATION TESTS ===\n');
  let passed = 0;

  // Initial State: 1 existing chat
  console.log(`Initial chats count: ${chats.length} (Active: ${activeChatId})`);
  if (chats.length === 1 && activeChatId === 'chat-existing-1') passed++;

  // Step 1: Click "New Chat" -> Creates a temporary empty chat in memory
  const draftId1 = createChat('New case draft');
  console.log(`\n[STEP 1] Created draft chat: ${draftId1}`);
  console.log(`Chats count: ${chats.length} (Active: ${activeChatId})`);
  const activeChat = getActiveChat();
  if (chats.length === 2 && activeChat?.messages.length === 0 && activeChatId === draftId1) {
    console.log('✅ Temporary empty chat created in-memory.');
    passed++;
  } else {
    console.log('❌ Failed temporary empty chat check.');
  }

  // LocalStorage check: should NOT persist empty chat
  const payload1 = JSON.parse(getLocalStoragePayload());
  if (payload1.length === 1 && !payload1.some((c: any) => c.id === draftId1)) {
    console.log('✅ Empty draft NOT saved to localStorage.');
    passed++;
  } else {
    console.log('❌ Empty draft was incorrectly persisted.');
  }

  // Step 2: Click "New Chat" again -> should NOT duplicate empty chats, should reuse same draft
  const draftId2 = createChat('New case draft 2');
  if (draftId1 === draftId2 && chats.length === 2) {
    console.log('✅ Re-clicked New Chat: Reused existing draft (no duplicates created).');
    passed++;
  } else {
    console.log('❌ Re-clicked New Chat created duplicate empty draft.');
  }

  // Step 3: Switch chats before sending any message -> Empty draft should disappear
  selectChat('chat-existing-1');
  console.log('\n[STEP 3] Switched back to existing chat');
  console.log(`Chats count: ${chats.length} (Active: ${activeChatId})`);
  if (chats.length === 1 && !chats.some(c => c.id === draftId1) && activeChatId === 'chat-existing-1') {
    console.log('✅ Empty draft successfully discarded upon switching away.');
    passed++;
  } else {
    console.log('❌ Empty draft was not discarded upon switching away.');
  }

  // Step 4: Click New Chat, Send a message -> Should save permanently
  const finalDraftId = createChat('Draft 3');
  sendMessage('Here is my legal query');
  console.log(`\n[STEP 4] Created draft ${finalDraftId} and sent a message`);
  console.log(`Chats count: ${chats.length} (Active: ${activeChatId})`);
  
  // LocalStorage check after message: should persist now
  const payload2 = JSON.parse(getLocalStoragePayload());
  const draftWithMsg = chats.find(c => c.id === finalDraftId);
  if (chats.length === 2 && draftWithMsg && draftWithMsg.messages.length === 1) {
    console.log('✅ Chat now has a message in state.');
    passed++;
  }
  if (payload2.length === 2 && payload2.some((c: any) => c.id === finalDraftId)) {
    console.log('✅ Chat now successfully persisted in localStorage.');
    passed++;
  } else {
    console.log('❌ Chat was not persisted in localStorage after sending a message.');
  }

  console.log(`\n=== LIFECYCLE SUMMARY: ${passed}/7 PASSED ===`);
  if (passed === 7) {
    console.log('✅ ALL CHAT LIFECYCLE TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLifecycleTests();
