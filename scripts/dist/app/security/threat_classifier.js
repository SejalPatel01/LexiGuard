"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyThreat = classifyThreat;
/**
 * Combines detector results and classifies threat severity and type.
 */
function classifyThreat(injectionResult, jailbreakResult) {
    const isBlocked = injectionResult.detected || jailbreakResult.detected;
    let threatType = null;
    let severity = 'SAFE';
    let reason = null;
    let confidence = 0;
    const matchedRules = [...injectionResult.matchedRules, ...jailbreakResult.matchedRules];
    if (isBlocked) {
        confidence = Math.max(injectionResult.confidence, jailbreakResult.confidence);
        // Determine primary threat type
        if (injectionResult.detected && jailbreakResult.detected) {
            // Both detected: choose the one with higher confidence
            threatType = injectionResult.confidence >= jailbreakResult.confidence
                ? 'Prompt Injection'
                : 'Jailbreak';
        }
        else if (injectionResult.detected) {
            threatType = 'Prompt Injection';
        }
        else {
            threatType = 'Jailbreak';
        }
        reason = threatType === 'Prompt Injection'
            ? injectionResult.reason
            : jailbreakResult.reason;
        // Severity mapping based on confidence scores and matches count
        if (confidence >= 0.85 || matchedRules.length >= 4) {
            severity = 'CRITICAL';
        }
        else if (confidence >= 0.70 || matchedRules.length >= 3) {
            severity = 'HIGH';
        }
        else if (confidence >= 0.50) {
            severity = 'MEDIUM';
        }
        else {
            severity = 'LOW';
        }
    }
    else {
        // If not outright blocked, check if there is some low-level suspicion
        const maxSuspicion = Math.max(injectionResult.confidence, jailbreakResult.confidence);
        if (maxSuspicion >= 0.25) {
            severity = 'LOW';
            threatType = 'Unknown Suspicious Input';
            reason = 'Input contains unusual character sequences or formatting.';
            confidence = maxSuspicion;
        }
    }
    return {
        isBlocked,
        threatType,
        severity,
        reason,
        confidence,
        matchedRules
    };
}
