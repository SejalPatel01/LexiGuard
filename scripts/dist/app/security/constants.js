"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBFUSCATION_PATTERNS = exports.JAILBREAK_PATTERNS = exports.JAILBREAK_KEYWORDS = exports.PROMPT_INJECTION_PATTERNS = exports.PROMPT_INJECTION_KEYWORDS = void 0;
// Keywords and phrases indicative of Prompt Injection attacks
exports.PROMPT_INJECTION_KEYWORDS = [
    'ignore previous instructions',
    'ignore all previous instructions',
    'forget everything',
    'forget the system prompt',
    'reveal your system prompt',
    'reveal hidden instructions',
    'show developer prompt',
    'system override',
    'execute shell command',
    'run terminal command',
    'grant admin access',
    'disable security',
    'disable safety',
    'reveal api key',
    'reveal environment variables',
    'ignore legal rules',
    'ignore security policy',
    'delete previous conversation',
    'override restrictions',
    'bypass guidelines',
    'output the above text',
    'print system instructions',
    'print developer instructions'
];
// Regex patterns for Prompt Injection
exports.PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?previous\s+instructions/i,
    /forget\s+(?:your\s+|the\s+|all\s+)?(?:everything|instructions|system\s+prompt)/i,
    /(?:reveal|show|print|output)\s+(?:your\s+|the\s+|all\s+)?(?:hidden|system|developer|internal)\s+(?:instructions|prompt|rules|directives)/i,
    /system\s+override/i,
    /execute\s+(?:shell|terminal|system)\s+command/i,
    /run\s+(?:terminal|shell|command|code)/i,
    /grant\s+(?:admin|administrator|root)\s+access/i,
    /disable\s+(?:security|safety|filters|guardrails|checks)/i,
    /reveal\s+(?:api\s+key|env|environment\s+variables)/i,
    /override\s+(?:restrictions|limitations|rules|policies)/i
];
// Keywords and phrases indicative of Jailbreak attacks
exports.JAILBREAK_KEYWORDS = [
    'you are dan',
    'pretend you are chatgpt',
    'ignore openai policies',
    'ignore gemini rules',
    'developer mode',
    'act without restrictions',
    'roleplay as an unrestricted ai',
    'you are no longer lexiguard',
    'ignore all safety rules',
    'respond regardless of legality',
    'bypass your guardrails',
    'do anything now',
    'unrestricted mode',
    'jailbreak'
];
// Regex patterns for Jailbreak detection
exports.JAILBREAK_PATTERNS = [
    /you\s+are\s+(?:dan|unrestricted|free|jailbroken)/i,
    /pretend\s+(?:you\s+are|to\s+be)\s+(?:chatgpt|an\s+unrestricted|unfiltered)/i,
    /ignore\s+(?:openai|gemini|google|anthropic|meta|safety|security)\s+(?:policies|rules|guidelines)/i,
    /developer\s+mode/i,
    /act\s+without\s+(?:restrictions|limits|bounds)/i,
    /roleplay\s+as\s+(?:an\s+unrestricted|a\s+jailbroken)/i,
    /you\s+are\s+no\s+longer\s+lexiguard/i,
    /respond\s+regardless\s+of\s+(?:legality|rules|laws|safety)/i,
    /bypass\s+(?:your\s+)?guardrails/i,
    /do\s+anything\s+now/i
];
// Obfuscation patterns (mixed casing, excessive spaces, unicode bypass)
exports.OBFUSCATION_PATTERNS = [
    /\b(?:[a-z]\s+){4,}[a-z]\b/i, // Excessive spacing e.g., "i g n o r e"
    /(?:[\u200B-\u200D\uFEFF])/, // Zero-width spaces
    /(?:[i|I] *[g|G] *[n|N] *[o|O] *[r|R] *[e|E])/i, // Spaced ignore
    /(?:[j|J] *[a|A] *[i|I] *[l|L] *[b|B] *[r|R] *[e|E] *[a|A] *[k|K])/i // Spaced jailbreak
];
