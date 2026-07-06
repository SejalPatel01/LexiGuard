import { generateWithGemini } from '../lib/gemini';
import { LegalAdvisorResponse, LegalCategory } from '../types/agents';

const getFallbackAdvisorResponse = (language: 'en' | 'hi' | 'gu'): LegalAdvisorResponse => {
  if (language === 'hi') {
    return {
      rights: [],
      actions: [],
      notes: [],
      text: 'त्रुटि: कानूनी सलाह उत्पन्न करने में असमर्थ। कृपया किसी कानूनी पेशेवर से परामर्श लें।'
    };
  }
  if (language === 'gu') {
    return {
      rights: [],
      actions: [],
      notes: [],
      text: 'ભૂલ: કાનૂની સલાહ જનરેટ કરવામાં અસમર્થ. કૃપા કરીને કાનૂની વ્યવસાયીની સલાહ લો.'
    };
  }
  return {
    rights: [],
    actions: [],
    notes: [],
    text: 'Legal advice generation failed. Please consult a legal professional.'
  };
};

export async function runAdvisorAgent(
  userQuery: string,
  category: LegalCategory,
  documentAnalysis?: string,
  language: 'en' | 'hi' | 'gu' = 'en'
): Promise<LegalAdvisorResponse> {
  console.log('[agents/legal-advisor] runAdvisorAgent invoked. Language parameter:', language);
  const langName = language === 'hi' ? 'Hindi' : language === 'gu' ? 'Gujarati' : 'English';

  const dynamicSystemInstruction = `You are a legal advisor assistant. Keep responses extremely concise, using simple terms and short bullet points. Limit text to essential legal guidance.
IMPORTANT: Generate the entire response in ${langName}.
Include a standard disclaimer at the end of 'text' in ${langName}.

CRITICAL BEHAVIOR RULES:
1. Read-Only Context: Rely strictly on the shared Document Analysis Context as the ground truth. Treat all details (dates, names, deposit values) as immutable.
2. Party Role Consistency: Never swap or confuse names and roles (e.g. Complainant/Respondent, Landlord/Tenant). Maintain them consistently.
3. Conflict Resolution Principle: If the user's query or claims contradict the facts in the Document Analysis Context, do NOT ignore the mismatch. Explicitly list the discrepancy as a key warning in the 'notes' field.
4. Zero Fabrication: Never invent names, dates, or values. Use standard brackets like [Name] or [Date] if not explicitly available.

Output JSON only:
{
  rights: string[];   // short bullet points of key rights in ${langName}
  actions: string[];  // short bullet points of practical actions in ${langName}
  notes: string[];    // short bullet points of warnings, precautions, or discrepancies in ${langName}
  text: string;       // concise explanation in simple terms in ${langName}, ending with the disclaimer in ${langName}
}`;
  
  const prompt = `User Query: "${userQuery}"
Category: "${category}"
${documentAnalysis ? `Document Analysis Context: \n${documentAnalysis}` : ''}

Analyze this context. Explain the user's legal rights, what actions they can take, and any warnings. Format the response as JSON.
IMPORTANT: You must write all your output fields (rights, actions, notes, and explanation text) in ${langName}. The standard legal disclaimer at the end of 'text' must also be in ${langName}. Ensure absolute consistency with any details in the Document Analysis Context.`;

  const rawResponse = await generateWithGemini(prompt, {
    systemInstruction: dynamicSystemInstruction,
    jsonMode: true
  });

  console.log("ADVISOR_RAW_RESPONSE", rawResponse);

  if (!rawResponse || !rawResponse.trim()) {
    console.log("ADVISOR_RESPONSE_TYPE: Empty Content");
    return getFallbackAdvisorResponse(language);
  }

  let cleaned = rawResponse.trim();
  let responseType = "Plain Text";

  // 1. Strip markdown fences or extract JSON substring
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
    responseType = "Markdown-wrapped JSON";
  } else {
    const startIndex = Math.min(
      cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : Infinity,
      cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : Infinity
    );
    const endIndex = Math.max(
      cleaned.lastIndexOf('}'),
      cleaned.lastIndexOf(']')
    );
    if (startIndex !== Infinity && endIndex !== -1 && endIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, endIndex + 1).trim();
      responseType = "Valid JSON (with potential surrounding text)";
    }
  }

  // 2. Try parsing
  try {
    const parsed = JSON.parse(cleaned);
    if (responseType === "Plain Text") {
      responseType = "Valid JSON";
    }
    console.log(`ADVISOR_RESPONSE_TYPE: ${responseType}`);
    
    const finalParsed: LegalAdvisorResponse = {
      rights: Array.isArray(parsed.rights) ? parsed.rights : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      text: typeof parsed.text === 'string' ? parsed.text : JSON.stringify(parsed)
    };
    
    console.log("ADVISOR_PARSED_RESPONSE", finalParsed);
    return finalParsed;
  } catch (err: any) {
    console.log("ADVISOR_JSON_PARSE_ERROR", err.message);
    
    // Attempt basic JSON repair
    try {
      let repaired = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      repaired = repaired.replace(/"([^"]*)"/g, (match, p1) => {
        const escaped = p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return `"${escaped}"`;
      });
      const parsedRepaired = JSON.parse(repaired);
      console.log("ADVISOR_RESPONSE_TYPE: Repaired JSON");
      
      const finalParsed: LegalAdvisorResponse = {
        rights: Array.isArray(parsedRepaired.rights) ? parsedRepaired.rights : [],
        actions: Array.isArray(parsedRepaired.actions) ? parsedRepaired.actions : [],
        notes: Array.isArray(parsedRepaired.notes) ? parsedRepaired.notes : [],
        text: typeof parsedRepaired.text === 'string' ? parsedRepaired.text : JSON.stringify(parsedRepaired)
      };
      
      console.log("ADVISOR_PARSED_RESPONSE", finalParsed);
      return finalParsed;
    } catch (repairErr: any) {
      console.log("ADVISOR_REPAIR_ERROR", repairErr.message);
    }

    // Fall back to plain text if JSON parsing fails and response is not empty
    console.log("ADVISOR_RESPONSE_TYPE: Plain Text (Fallback)");
    const fallbackParsed: LegalAdvisorResponse = {
      rights: [],
      actions: [],
      notes: [],
      text: rawResponse.trim()
    };
    console.log("ADVISOR_PARSED_RESPONSE", fallbackParsed);
    return fallbackParsed;
  }
}
