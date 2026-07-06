"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = logSecurityEvent;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE_PATH = path_1.default.join(process.cwd(), 'security_audit.log');
/**
 * Log the security event to the console and append to the persistent security audit log file.
 */
function logSecurityEvent(prompt, result) {
    const timestamp = new Date().toISOString();
    const entry = {
        timestamp,
        promptLength: prompt?.length || 0,
        isBlocked: result.isBlocked,
        threatType: result.threatType,
        severity: result.severity,
        confidence: result.confidence,
        matchedRules: result.matchedRules,
        reason: result.reason
    };
    // 1. Console logging with appropriate log level
    if (result.isBlocked) {
        console.warn(`[SECURITY CRITICAL SHIELD] Blocked malicious request. Type: ${result.threatType}, Severity: ${result.severity}, Confidence: ${(result.confidence * 100).toFixed(0)}%`);
        console.warn(`[SECURITY AUDIT LOG] Matched rules: ${result.matchedRules.join(', ')}`);
    }
    else {
        console.log(`[SECURITY GATEWAY] Passed safety check. Severity: ${result.severity}`);
    }
    // 2. Append to persistent security_audit.log file in workspace
    try {
        const logLine = JSON.stringify(entry) + '\n';
        fs_1.default.appendFileSync(LOG_FILE_PATH, logLine, 'utf8');
    }
    catch (err) {
        console.error('[SECURITY AUDIT ERROR] Failed to append to audit log file:', err);
    }
}
