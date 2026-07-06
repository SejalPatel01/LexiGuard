import fs from 'fs';
import path from 'path';
import { SecurityResult } from './security_types';

const LOG_FILE_PATH = path.join(process.cwd(), 'security_audit.log');

export interface AuditLogEntry {
  timestamp: string;
  eventType: string; // e.g. Prompt Injection Blocked, Jailbreak Blocked, Invalid Upload, Output Validation Failed, Suspicious Prompt Flooding
  severity: string;  // e.g. SAFE, LOW, MEDIUM, HIGH, CRITICAL
  actionTaken: string; // e.g. BLOCKED, ALLOWED
}

/**
 * Log only security events (no normal conversations) to the persistent security audit log file.
 * Prevents writing of user prompt content, legal context, or personal information.
 */
export function logSecurityEvent(
  _prompt: string, // Unused to comply with privacy requirement: never log prompt texts
  result: SecurityResult
): void {
  const timestamp = new Date().toISOString();
  
  // Map internal classifications to required Event Types
  let eventType = 'Security Gateway Check';
  if (result.isBlocked) {
    if (result.threatType === 'Prompt Injection') {
      eventType = 'Prompt Injection Blocked';
    } else if (result.threatType === 'Jailbreak') {
      eventType = 'Jailbreak Blocked';
    } else if (result.stage1.threatType === 'Output Validation Failed') {
      eventType = 'Output Validation Failed';
    } else if (result.stage1.threatType === 'Suspicious Prompt Flooding') {
      eventType = 'Suspicious Prompt Flooding';
    } else {
      eventType = 'Invalid Upload';
    }
  }

  const entry: AuditLogEntry = {
    timestamp,
    eventType,
    severity: result.severity,
    actionTaken: result.isBlocked ? 'BLOCKED' : 'ALLOWED'
  };

  // 1. Console warning logging for local debug/monitoring
  if (result.isBlocked) {
    console.warn(`[SECURITY CRITICAL SHIELD] Event: ${eventType} | Severity: ${result.severity} | Action: ${entry.actionTaken}`);
  } else {
    console.log(`[SECURITY GATEWAY] Passed safety check.`);
  }

  // 2. Append to persistent security_audit.log file ONLY for blocked security events (no normal conversations)
  if (result.isBlocked) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(LOG_FILE_PATH, logLine, 'utf8');
    } catch (err) {
      console.error('[SECURITY AUDIT ERROR] Failed to append to audit log file:', err);
    }
  }
}
