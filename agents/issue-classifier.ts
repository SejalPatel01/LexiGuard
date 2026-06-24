import { generateWithGemini } from '../lib/gemini';
import { safeJsonParse } from '../lib/safe-json';
import { IssueClassifierResponse, LegalCategory } from '../types/agents';

const DEFAULT_CLASSIFIER_RESPONSE: IssueClassifierResponse = {
  category: 'General Legal Question',
  confidence: 0,
  reasoning: 'Failed to parse classifier response from model. Fallback to default category.',
  isDocumentAnalysisRequired: false
};

const SYSTEM_INSTRUCTION = `Classify user's legal issue into: Consumer Complaint, Cybercrime, Employment Dispute, Landlord / Property Issue, Contract Issue, Family Dispute, or General Legal Question.
Set isDocumentAnalysisRequired=true if query requests document review, analysis, or contains pasted legal clauses/contracts.
Output JSON only:
{
  category: "Consumer Complaint" | "Cybercrime" | "Employment Dispute" | "Landlord / Property Issue" | "Contract Issue" | "Family Dispute" | "General Legal Question";
  confidence: number; // 0-100
  reasoning: string; // concise explanation
  isDocumentAnalysisRequired: boolean;
}`;

// Explicit keyword definitions for each category
const KEYWORDS: Record<Exclude<LegalCategory, 'General Legal Question'>, string[]> = {
  'Landlord / Property Issue': ['landlord', 'tenant', 'rent', 'rental', 'lease', 'deposit', 'property', 'eviction', 'apartment', 'landlady', 'sublet'],
  'Consumer Complaint': ['refund', 'defective', 'defect', 'seller', 'delivery', 'warranty', 'merchant', 'laptop', 'bought', 'purchase', 'product'],
  'Cybercrime': ['scam', 'fraud', 'phishing', 'hacked', 'upi', 'otp', 'debit', 'card fraud', 'stolen funds', 'compromised'],
  'Employment Dispute': ['salary', 'employer', 'job', 'termination', 'workplace', 'fired', 'severance', 'wages', 'employee', 'dismissal'],
  'Family Dispute': ['divorce', 'custody', 'marriage', 'spouse', 'alimony', 'child support', 'marital'],
  'Contract Issue': ['contract', 'agreement', 'clause', 'terms', 'nda', 'non-disclosure', 'breach']
};

export async function runClassifierAgent(userQuery: string): Promise<IssueClassifierResponse> {
  const normalized = userQuery.toLowerCase();
  
  // 1. Rule-based classification first
  const scores: Record<string, number> = {};
  const matchedKeywordsMap: Record<string, string[]> = {};
  
  let maxScore = 0;
  let matchedCategory: LegalCategory | null = null;
  let isTie = false;

  for (const [category, words] of Object.entries(KEYWORDS)) {
    const matches = words.filter(word => {
      // Word boundary matching to avoid substrings (e.g., 'rent' in 'parent')
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(normalized);
    });

    if (matches.length > 0) {
      scores[category] = matches.length;
      matchedKeywordsMap[category] = matches;
      
      if (matches.length > maxScore) {
        maxScore = matches.length;
        matchedCategory = category as LegalCategory;
        isTie = false;
      } else if (matches.length === maxScore) {
        isTie = true;
      }
    }
  }

  // Check if we should trigger document analysis (if contract keywords match)
  const hasContractKeywords = KEYWORDS['Contract Issue'].some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(normalized);
  });

  // If we have a single clear category winner, return it immediately with high confidence
  if (matchedCategory && !isTie) {
    return {
      category: matchedCategory,
      confidence: 95,
      reasoning: `Rule-based detection matched keyword(s) [${matchedKeywordsMap[matchedCategory].join(', ')}] associated with ${matchedCategory}.`,
      isDocumentAnalysisRequired: hasContractKeywords || matchedCategory === 'Contract Issue'
    };
  }

  // 2. Gemini classification fallback (if no match, low confidence, or tie)
  console.log('[Classifier Agent] Rule-based confidence low or tie. Falling back to Gemini...');
  const prompt = `Classify this user legal query:
"${userQuery}"`;

  const rawResponse = await generateWithGemini(prompt, {
    systemInstruction: SYSTEM_INSTRUCTION,
    jsonMode: true
  });
  
  return safeJsonParse<IssueClassifierResponse>(rawResponse, DEFAULT_CLASSIFIER_RESPONSE);
}
