"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPromptSecurity = checkPromptSecurity;
const prompt_injection_detector_1 = require("./prompt_injection_detector");
const jailbreak_detector_1 = require("./jailbreak_detector");
const threat_classifier_1 = require("./threat_classifier");
const audit_logger_1 = require("./audit_logger");
/**
 * Enterprise AI Security Gateway
 * Coordinates prompt injection & jailbreak detectors, classifies threats, logs audits, and makes block decisions.
 */
function checkPromptSecurity(prompt) {
    console.log(`[SECURITY GATEWAY] Evaluating prompt of length ${prompt?.length || 0} characters...`);
    // 1. Run detectors
    const injectionResult = (0, prompt_injection_detector_1.detectPromptInjection)(prompt);
    const jailbreakResult = (0, jailbreak_detector_1.detectJailbreak)(prompt);
    // 2. Classify threat severity and type
    const classification = (0, threat_classifier_1.classifyThreat)(injectionResult, jailbreakResult);
    // 3. Log event to audit file
    (0, audit_logger_1.logSecurityEvent)(prompt, classification);
    return classification;
}
