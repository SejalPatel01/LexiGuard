import { generateMultimodalWithGemini } from '../lib/gemini';

/**
 * Extract text from a base64 encoded PDF using Gemini's native PDF capabilities.
 */
export async function extractTextFromPdf(base64Data: string): Promise<string> {
  console.log('[pdf-parser] Extracting text from PDF via Gemini Multimodal OCR...');
  const prompt = `Please extract and return all readable text content from this PDF document verbatim. 
If there are tables, transcribe their contents cleanly. If it is a scanned document, perform high-quality OCR to read the text. 
Do not write summaries, introductions, or commentary. Return ONLY the extracted text of the document itself.`;

  return generateMultimodalWithGemini([
    {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf'
      }
    },
    { text: prompt }
  ]);
}

/**
 * Extract text from a base64 encoded image (receipt, screenshot, WhatsApp chat) using Gemini OCR.
 */
export async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
  console.log(`[pdf-parser] Extracting text from image (${mimeType}) via Gemini Multimodal OCR...`);
  const prompt = `Please extract and return all readable text content from this image verbatim. 
If it is a screenshot, chat log, invoice receipt, contract page, or official letter, read and extract all details cleanly. 
Do not write summaries, introductions, or commentary. Return ONLY the extracted text.`;

  return generateMultimodalWithGemini([
    {
      inlineData: {
        data: base64Data,
        mimeType
      }
    },
    { text: prompt }
  ]);
}
