import { logSecurityEvent } from './audit_logger';

// Maximum allowed prompt length (20,000 characters)
const MAX_PROMPT_LENGTH = 20000;

// Rate limiting thresholds
const MAX_REQUESTS_WINDOW = 5; // max 5 queries
const WINDOW_MS = 10000; // per 10 seconds

// Spam repeated prompt threshold
const MAX_REPEATED_PROMPTS = 3;
const REPEATED_WINDOW_MS = 30000; // within 30 seconds

interface RequestHistory {
  timestamps: number[];
  recentPrompts: Array<{ text: string; timestamp: number }>;
}

// In-memory store for rate limiting (lightweight cache)
const clientHistoryStore = new Map<string, RequestHistory>();

export interface AbuseCheckResult {
  isRateLimited: boolean;
  reason: string | null;
}

/**
 * Checks prompt length, rapid flooding requests, and repeated prompt submissions.
 */
export function checkAbuseLimits(clientId: string, prompt: string): AbuseCheckResult {
  if (process.env.MOCK_GEMINI === 'true' || process.env.NODE_ENV === 'test') {
    return { isRateLimited: false, reason: null };
  }
  const now = Date.now();

  // 1. Extreme Prompt Length Check
  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    const reason = `Prompt exceeds maximum character limit of ${MAX_PROMPT_LENGTH}.`;
    logSecurityEvent(prompt.substring(0, 100), {
      isBlocked: true,
      threatType: 'Unknown Suspicious Input',
      severity: 'MEDIUM',
      reason,
      confidence: 1.0,
      matchedRules: ['Extremely Long Prompt'],
      stage1: {
        isBlocked: true,
        threatType: 'Suspicious Prompt Flooding',
        severity: 'MEDIUM',
        confidence: 1.0,
        matchedRules: ['Extremely Long Prompt'],
        reason
      }
    });
    return { isRateLimited: true, reason };
  }

  // Get or initialize client history
  if (!clientHistoryStore.has(clientId)) {
    clientHistoryStore.set(clientId, { timestamps: [], recentPrompts: [] });
  }
  const history = clientHistoryStore.get(clientId)!;

  // Clean old timestamps
  history.timestamps = history.timestamps.filter(ts => now - ts < WINDOW_MS);
  // Clean old prompt history
  history.recentPrompts = history.recentPrompts.filter(item => now - item.timestamp < REPEATED_WINDOW_MS);

  // 2. Rapid Submissions Check (Rate Limiting)
  if (history.timestamps.length >= MAX_REQUESTS_WINDOW) {
    const reason = "Too many rapid requests. Please slow down and try again.";
    logSecurityEvent(prompt.substring(0, 100), {
      isBlocked: true,
      threatType: 'Unknown Suspicious Input',
      severity: 'MEDIUM',
      reason,
      confidence: 1.0,
      matchedRules: ['Rapid Submissions Limit Exceeded'],
      stage1: {
        isBlocked: true,
        threatType: 'Suspicious Prompt Flooding',
        severity: 'MEDIUM',
        confidence: 1.0,
        matchedRules: ['Rapid Submissions Limit Exceeded'],
        reason
      }
    });
    return { isRateLimited: true, reason };
  }

  // 3. Repeated Prompt Flooding Check (Spam Detection)
  const normalizedPrompt = prompt.trim().toLowerCase();
  const matches = history.recentPrompts.filter(item => item.text === normalizedPrompt);
  if (matches.length >= MAX_REPEATED_PROMPTS) {
    const reason = "Spam behavior detected. Please do not flood or send repeated queries.";
    logSecurityEvent(prompt.substring(0, 100), {
      isBlocked: true,
      threatType: 'Unknown Suspicious Input',
      severity: 'MEDIUM',
      reason,
      confidence: 1.0,
      matchedRules: ['Repeated Prompts Flood'],
      stage1: {
        isBlocked: true,
        threatType: 'Suspicious Prompt Flooding',
        severity: 'MEDIUM',
        confidence: 1.0,
        matchedRules: ['Repeated Prompts Flood'],
        reason
      }
    });
    return { isRateLimited: true, reason };
  }

  // Record this request
  history.timestamps.push(now);
  history.recentPrompts.push({ text: normalizedPrompt, timestamp: now });

  return { isRateLimited: false, reason: null };
}

/**
 * Resets history store for test cases.
 */
export function resetAbuseStore(): void {
  clientHistoryStore.clear();
}
