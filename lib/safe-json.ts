/**
 * Safe JSON parser that handles markdown code fences, extracts JSON blocks,
 * attempts basic JSON repair, and falls back to a default object on failure.
 */
export function safeJsonParse<T>(rawText: string, defaultValue: T): T {
  console.log('[SAFE-JSON] --- Raw Response ---');
  console.log(rawText);

  if (!rawText || typeof rawText !== 'string') {
    console.warn('[SAFE-JSON] Raw response is empty or not a string.');
    return defaultValue;
  }

  // 1. Clean markdown code fences (e.g. ```json or ```)
  let cleaned = rawText.trim();
  
  // Strip ```json ... ``` or ``` ... ``` wrapper if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
    console.log('[SAFE-JSON] Stripped code fences.');
  } else {
    // If no fences, check if there is text before/after the JSON block.
    // Find the first occurrence of '{' or '[' and the last occurrence of '}' or ']'
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
      console.log('[SAFE-JSON] Extracted JSON block substring.');
    }
  }

  console.log('[SAFE-JSON] --- Cleaned Response ---');
  console.log(cleaned);

  // 2. Try standard JSON.parse first
  try {
    const parsed = JSON.parse(cleaned);
    console.log('[SAFE-JSON] --- Parsed Response ---');
    console.log(JSON.stringify(parsed, null, 2));
    if (typeof parsed === 'object' && parsed !== null && typeof defaultValue === 'object' && defaultValue !== null) {
      return { ...defaultValue, ...parsed } as T;
    }
    return parsed as T;
  } catch (firstError: unknown) {
    const err = firstError as Error;
    console.warn('[SAFE-JSON] Initial JSON.parse failed. Error:', err.message);
    console.warn('[SAFE-JSON] Attempting JSON repair...');

    // 3. Try to repair common JSON issues
    let repaired = cleaned;

    try {
      // A. Remove trailing commas before closing braces/brackets (e.g., ,} or ,])
      repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

      // B. Escape control characters (like newlines) inside double quotes
      repaired = repaired.replace(/"([^"]*)"/g, (match, p1) => {
        // Replace real newlines inside the string with escaped "\n"
        const escaped = p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return `"${escaped}"`;
      });
      
      const parsedRepaired = JSON.parse(repaired);
      console.log('[SAFE-JSON] JSON repair succeeded.');
      console.log('[SAFE-JSON] --- Parsed (Repaired) Response ---');
      console.log(JSON.stringify(parsedRepaired, null, 2));
      if (typeof parsedRepaired === 'object' && parsedRepaired !== null && typeof defaultValue === 'object' && defaultValue !== null) {
        return { ...defaultValue, ...parsedRepaired } as T;
      }
      return parsedRepaired as T;
    } catch (repairError: unknown) {
      const err = repairError as Error;
      console.error('[SAFE-JSON] JSON repair failed. Error:', err.message);
    }

    // 4. Return default fallback object
    console.error('[SAFE-JSON] JSON is fatally malformed. Returning default fallback object.');
    console.log('[SAFE-JSON] Default Value:', JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
}
