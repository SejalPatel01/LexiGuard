import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI SDK
// The API key is fetched securely from process.env.GEMINI_API_KEY on the server
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini Client Error] process.env.GEMINI_API_KEY is not set!');
    throw new Error(
      'GEMINI_API_KEY environment variable is missing. Please add it to your .env.local file.'
    );
  }
  console.log('[Gemini Client] GoogleGenerativeAI client successfully initialized.');
  return new GoogleGenerativeAI(apiKey);
};

// Currently supported model names in preferred order
const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash'
];

interface GenerationOptions {
  systemInstruction?: string;
  jsonMode?: boolean;
}

/**
 * Executes a call to the Gemini API with an automated model fallback chain
 * and a built-in retry mechanism for network/transient errors.
 */
export async function generateWithGemini(
  prompt: string,
  options: GenerationOptions = {},
  retries = 2, // 2 retries per model is sufficient to detect network vs model configuration errors
  delayMs = 1500
): Promise<string> {
  if (process.env.MOCK_GEMINI === 'true') {
    const promptLower = prompt.toLowerCase();
    
    // 1. Classifier Agent Mock
    if (promptLower.includes('classify this user') || promptLower.includes('categorize this') || promptLower.includes('classify user\'s')) {
      if (promptLower.includes('landlord') || promptLower.includes('deposit')) {
        return JSON.stringify({
          category: "Landlord / Property Issue",
          confidence: 95,
          reasoning: "The user is disputing the return of a security deposit by their landlord.",
          isDocumentAnalysisRequired: false
        });
      }
      if (promptLower.includes('defective') || promptLower.includes('seller') || promptLower.includes('refund')) {
        return JSON.stringify({
          category: "Consumer Complaint",
          confidence: 95,
          reasoning: "Defective product purchase refund issue.",
          isDocumentAnalysisRequired: false
        });
      }
      return JSON.stringify({
        category: "General Legal Question",
        confidence: 80,
        reasoning: "Fallback categorization.",
        isDocumentAnalysisRequired: false
      });
    }

    // 2. Advisor Agent Mock
    if (promptLower.includes('explain the user\'s legal rights') || promptLower.includes('legal advisor assistant')) {
      return JSON.stringify({
        rights: [
          "Right to receive the security deposit back in full upon lease termination.",
          "Right to receive a written explanation of any deductions made."
        ],
        actions: [
          "Send a formal written demand notice to the landlord.",
          "Keep copies of the bank transaction proof and WhatsApp messages."
        ],
        notes: [
          "Consult the lease agreement for deposit return timeline clauses."
        ],
        text: "Your landlord is legally obligated to return your security deposit under the terms of your rent agreement. Since you have a rent agreement, bank proof of payment, and WhatsApp messages, you have a very strong case. You should first send a formal Demand Notice to the landlord giving them 15 days to refund the amount."
      });
    }

    // 3. Action Generator Agent Mock
    if (promptLower.includes('evidence checklist') || promptLower.includes('action timeline') || promptLower.includes('action generator')) {
      return JSON.stringify({
        checklist: [
          "Written Lease/Purchase/Employment Agreement",
          "Proof of Transactions (Receipts/Statements)",
          "Correspondence Logs (Emails/Chats)"
        ],
        timeline: [
          {
            day: "Day 1",
            action: "Review Lease Agreement",
            description: "Locate clauses specifying deposit refund timelines."
          },
          {
            day: "Day 2",
            action: "Send Written Notice",
            description: "Send a formal demand notice via WhatsApp/Email."
          },
          {
            day: "Day 15",
            action: "Follow up / Legal Action",
            description: "File a complaint if landlord fails to respond."
          }
        ],
        summary: "Landlord failed to return security deposit after lease termination.",
        legalProvisions: [
          "Model Tenancy Act, Section 11 (Refund of Security Deposit)"
        ],
        nextAction: "Send the Tenant Security Deposit Demand Notice to the landlord.",
        documents: [
          {
            title: "Tenant Security Deposit Demand Notice",
            type: "Notice",
            previewText: "DEMAND NOTICE\nTo: [Landlord Name]\nFrom: [Tenant Name]\nRef: [Agreement Number]\n\nDear [Landlord's Name],\nI hereby demand the refund of my security deposit of [Deposit Amount] for the premises at [Property Address]. Please refund it within 15 days of this notice."
          }
        ],
        score: 85,
        riskLevel: "Strong Case",
        riskFactors: [
          "Landlord has no legal grounds to withhold deposit.",
          "No deposit mismatch found."
        ]
      });
    }

    // 4. Document Analyzer Mock (if text-based fallback)
    if (promptLower.includes('rent agreement') || promptLower.includes('lease') || promptLower.includes('flat')) {
      return JSON.stringify({
        summary: "Standard residential lease agreement for Flat 402, Sunshine Heights, Mumbai between Rajesh Landlord and Suresh Tenant.",
        clauses: [
          {
            title: "Security Deposit Clause",
            explanation: "Tenant pays a security deposit of Rs. 45,000 to be refunded within 30 days of vacating.",
            riskLevel: "Low"
          },
          {
            title: "Termination Notice Clause",
            explanation: "Either party can terminate with a 1-month written notice.",
            riskLevel: "Medium"
          }
        ],
        obligations: [
          "Tenant must pay monthly rent of Rs. 15,000 on or before the 5th of each month.",
          "Landlord must refund security deposit within 30 days of lease termination."
        ],
        deadlines: [
          {
            date: "5th of each month",
            action: "Rent payment"
          },
          {
            date: "30 days after vacating",
            action: "Refund of security deposit"
          }
        ],
        risks: [
          "Tenant is liable for any damages to the property beyond normal wear and tear.",
          "Late rent payments will incur a penalty interest."
        ],
        text: "Full rent agreement text content...",
        entities: {
          names: ["Rajesh Landlord", "Suresh Tenant"],
          dates: ["01-June-2026"],
          addresses: ["Flat 402, Sunshine Heights, Mumbai"],
          amounts: ["Rs. 15,000"],
          depositValues: ["Rs. 45,000"],
          agreementNumbers: ["RA-2026-9988"],
          phoneNumbers: ["+91-9876543210"],
          emailAddresses: ["rajesh@email.com"]
        },
        detectedDocType: "Rent Agreement"
      });
    }

    // Default / Non-legal Mock
    return JSON.stringify({
      summary: "This is a non-legal document.",
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: "Non-legal content...",
      entities: {
        names: [],
        dates: [],
        addresses: [],
        amounts: [],
        depositValues: [],
        agreementNumbers: [],
        phoneNumbers: [],
        emailAddresses: []
      },
      detectedDocType: "Other"
    });
  }

  const { systemInstruction, jsonMode = false } = options;
  const errorsHandled: string[] = [];

  // Iterate over each supported model in order of preference
  for (const modelName of MODELS_TO_TRY) {
    console.log(`\n[Gemini API] === Attempting execution with model: ${modelName} ===`);
    let attempt = 1;
    let modelSuccess = false;
    let lastError: Error | null = null;
    let responseText = '';

    while (attempt <= retries && !modelSuccess) {
      try {
        console.log(`[Gemini API] Attempt ${attempt}/${retries} | JSON mode: ${jsonMode} | Prompt size: ${prompt.length} chars`);
        
        const genAI = getGenAIClient();
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemInstruction 
        });

        const generationConfig: { responseMimeType?: string } = {};
        if (jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        console.log(`[Gemini API] Dispatching content generation request...`);
        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: generationConfig,
        });

        responseText = response.response.text();
        if (!responseText) {
          throw new Error('Empty response text received from model');
        }

        console.log(`[Gemini API] Response received successfully (${responseText.length} chars).`);
        console.log(`[Gemini API] Response preview: "${responseText.substring(0, 120).replace(/\n/g, ' ')}..."`);
        console.log(`[Gemini API] === Model ${modelName} Execution Successful ===\n`);

        modelSuccess = true;
      } catch (error: unknown) {
        lastError = error as Error;
        const errMsg = (lastError.message || '').toLowerCase();

        // Check if this is a quota / 429 error
        const isQuota = errMsg.includes('429') || 
                        errMsg.includes('quota') || 
                        errMsg.includes('exhausted') || 
                        errMsg.includes('rate limit') ||
                        errMsg.includes('rate_limit');

        if (isQuota) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Gemini API Quota Error Debug]', lastError);
          }
          throw new Error('AI service is temporarily unavailable due to API quota limits. Please try again later.');
        }

        console.warn(`[Gemini API Warning] Attempt ${attempt}/${retries} failed for model ${modelName}:`, lastError.message || lastError);
        
        // Fast-fail on persistent errors (invalid keys, safety block)
        if (
          errMsg.includes('key not valid') || 
          errMsg.includes('api key') || 
          errMsg.includes('blocked') || 
          errMsg.includes('safety')
        ) {
          console.error(`[Gemini API Fast-Fail] Detected persistent error: "${lastError.message}". Bypassing retries and fallback models.`);
          throw lastError;
        }

        if (attempt < retries) {
          console.log(`[Gemini API] Backing off for ${delayMs * Math.pow(2, attempt - 1)}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
        }
        attempt++;
      }
    }

    if (modelSuccess) {
      return responseText;
    }

    // If we reach here, this specific model failed all attempts. Record the error and try the next.
    const errorMessage = lastError?.message || 'Unknown error';
    errorsHandled.push(`${modelName}: ${errorMessage}`);
    console.warn(`[Gemini API Warning] Model ${modelName} failed all attempts. Trying next fallback model...`);
  }

  // If all models failed, throw a detailed consolidated error
  console.error('[Gemini API Critical] All models failed to generate content.');
  throw new Error(
    `All configured Gemini models failed. Detailed logs:\n- ${errorsHandled.join('\n- ')}`
  );
}

/**
 * Executes a call to the Gemini API with multimodal parts (e.g. text prompt + base64 file data)
 * with the same automated model fallback chain and retry mechanism.
 */
export async function generateMultimodalWithGemini(
  parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>,
  options: GenerationOptions = {},
  retries = 2,
  delayMs = 1500
): Promise<string> {
  if (process.env.MOCK_GEMINI === 'true') {
    const isCat = parts.some(p => 'inlineData' in p && p.inlineData.data === 'catBase64Dummy==');
    if (isCat) {
      return "This is just a picture of a cute cat.";
    }

    let combinedText = '';
    parts.forEach(p => {
      if ('text' in p) combinedText += p.text + ' ';
    });
    const combinedLower = combinedText.toLowerCase();
    
    if (combinedLower.includes('rent') || combinedLower.includes('lease') || combinedLower.includes('agreement') || combinedLower.includes('contract')) {
      return JSON.stringify({
        summary: "Standard residential lease agreement for Flat 402, Sunshine Heights, Mumbai between Rajesh Landlord and Suresh Tenant.",
        clauses: [
          {
            title: "Security Deposit Clause",
            explanation: "Tenant pays a security deposit of Rs. 45,000 to be refunded within 30 days of vacating.",
            riskLevel: "Low"
          },
          {
            title: "Termination Notice Clause",
            explanation: "Either party can terminate with a 1-month written notice.",
            riskLevel: "Medium"
          }
        ],
        obligations: [
          "Tenant must pay monthly rent of Rs. 15,000 on or before the 5th of each month.",
          "Landlord must refund security deposit within 30 days of lease termination."
        ],
        deadlines: [
          {
            date: "5th of each month",
            action: "Rent payment"
          },
          {
            date: "30 days after vacating",
            action: "Refund of security deposit"
          }
        ],
        risks: [
          "Tenant is liable for any damages to the property beyond normal wear and tear.",
          "Late rent payments will incur a penalty interest."
        ],
        text: "Full rent agreement text content...",
        entities: {
          names: ["Rajesh Landlord", "Suresh Tenant"],
          dates: ["01-June-2026"],
          addresses: ["Flat 402, Sunshine Heights, Mumbai"],
          amounts: ["Rs. 15,000"],
          depositValues: ["Rs. 45,000"],
          agreementNumbers: ["RA-2026-9988"],
          phoneNumbers: ["+91-9876543210"],
          emailAddresses: ["rajesh@email.com"]
        },
        detectedDocType: "Rent Agreement"
      });
    }

    return JSON.stringify({
      summary: "This is a non-legal document.",
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: "Non-legal content...",
      entities: {
        names: [],
        dates: [],
        addresses: [],
        amounts: [],
        depositValues: [],
        agreementNumbers: [],
        phoneNumbers: [],
        emailAddresses: []
      },
      detectedDocType: "Other"
    });
  }

  const { systemInstruction, jsonMode = false } = options;
  const errorsHandled: string[] = [];

  for (const modelName of MODELS_TO_TRY) {
    console.log(`\n[Gemini Multimodal API] === Attempting execution with model: ${modelName} ===`);
    let attempt = 1;
    let modelSuccess = false;
    let lastError: Error | null = null;
    let responseText = '';

    while (attempt <= retries && !modelSuccess) {
      try {
        console.log(`[Gemini Multimodal API] Attempt ${attempt}/${retries} | JSON mode: ${jsonMode}`);
        
        const genAI = getGenAIClient();
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemInstruction 
        });

        const generationConfig: { responseMimeType?: string } = {};
        if (jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        console.log(`[Gemini Multimodal API] Dispatching content generation request...`);
        const response = await model.generateContent({
          contents: [{ role: 'user', parts: parts }],
          generationConfig: generationConfig,
        });

        responseText = response.response.text();
        if (!responseText) {
          throw new Error('Empty response text received from model');
        }

        console.log(`[Gemini Multimodal API] Response received successfully (${responseText.length} chars).`);
        console.log(`[Gemini Multimodal API] === Model ${modelName} Multimodal Execution Successful ===\n`);

        modelSuccess = true;
      } catch (error: unknown) {
        lastError = error as Error;
        const errMsg = (lastError.message || '').toLowerCase();

        // Check if this is a quota / 429 error
        const isQuota = errMsg.includes('429') || 
                        errMsg.includes('quota') || 
                        errMsg.includes('exhausted') || 
                        errMsg.includes('rate limit') ||
                        errMsg.includes('rate_limit');

        if (isQuota) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Gemini Multimodal API Quota Error Debug]', lastError);
          }
          throw new Error('AI service is temporarily unavailable due to API quota limits. Please try again later.');
        }

        console.warn(`[Gemini Multimodal API Warning] Attempt ${attempt}/${retries} failed for model ${modelName}:`, lastError.message || lastError);
        
        // Fast-fail on persistent errors
        if (
          errMsg.includes('key not valid') || 
          errMsg.includes('api key') || 
          errMsg.includes('blocked') || 
          errMsg.includes('safety')
        ) {
          console.error(`[Gemini Multimodal API Fast-Fail] Detected persistent error: "${lastError.message}". Bypassing retries and fallback models.`);
          throw lastError;
        }

        if (attempt < retries) {
          console.log(`[Gemini Multimodal API] Backing off for ${delayMs * Math.pow(2, attempt - 1)}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
        }
        attempt++;
      }
    }

    if (modelSuccess) {
      return responseText;
    }

    const errorMessage = lastError?.message || 'Unknown error';
    errorsHandled.push(`${modelName}: ${errorMessage}`);
    console.warn(`[Gemini Multimodal API Warning] Model ${modelName} failed all attempts. Trying next fallback model...`);
  }

  console.error('[Gemini Multimodal API Critical] All models failed to generate content.');
  throw new Error(
    `All configured Gemini models failed. Detailed logs:\n- ${errorsHandled.join('\n- ')}`
  );
}
