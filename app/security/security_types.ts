export interface DetectorResult {
  detected: boolean;
  confidence: number; // 0 to 1
  matchedRules: string[];
  reason: string | null;
}

export interface SecurityResult {
  isBlocked: boolean;
  threatType: 'Prompt Injection' | 'Jailbreak' | 'Unknown Suspicious Input' | null;
  severity: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string | null;
  confidence: number; // 0 to 1 (0 to 100 on client side or normalized)
  matchedRules: string[];
  stage1: {
    isBlocked: boolean;
    threatType: string | null;
    severity: string;
    confidence: number;
    matchedRules: string[];
    reason: string | null;
  };
  stage2?: {
    isBlocked: boolean;
    threatType: string | null;
    severity: string;
    confidence: number;
    reason: string | null;
  };
}
