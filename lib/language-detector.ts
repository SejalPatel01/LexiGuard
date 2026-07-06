export function detectLanguageLocal(query: string): 'en' | 'hi' | 'gu' {
  const queryLower = query.toLowerCase();
  
  // 1. Check for script characters
  if (/[\u0A80-\u0AFF]/.test(query)) {
    return 'gu';
  }
  if (/[\u0900-\u097F]/.test(query)) {
    return 'hi';
  }
  
  // 2. Check for explicit request keywords
  if (/\b(gujarati|gujrati|guj\b|gu\b)/.test(queryLower)) {
    return 'gu';
  }
  if (/\b(hindi|hind\b|hi\b)/.test(queryLower)) {
    return 'hi';
  }
  if (/\b(english|eng\b|en\b)/.test(queryLower)) {
    return 'en';
  }

  // 3. Check common Romanized Hindi/Gujarati words
  const romanizedHindiGujarati = [
    'samjhao', 'samjhavo', 'batao', 'karo', 'karvo', 'che', 'hai', 'ko', 'ne', 'ane', 'saransh',
    'fariyad', 'noman', 'upbhokta', 'makan', 'malik', 'rojgar', 'pagar', 'vivad', 'maru', 'aapo',
    'nathi', 'nayan', 'savalo', 'jaweb', 'uttar', 'prashna', 'samasya'
  ];
  const words = queryLower.split(/\s+/);
  const matchedWords = words.filter(w => {
    // Strip trailing punctuation from word
    const cleanWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    return romanizedHindiGujarati.includes(cleanWord);
  });
  if (matchedWords.length >= 1) {
    const guCount = words.filter(w => {
      const cw = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      return ['che', 'ane', 'aapo', 'nathi', 'karvo', 'samjhavo'].includes(cw);
    }).length;
    const hiCount = words.filter(w => {
      const cw = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      return ['hai', 'ko', 'batao', 'samjhao', 'karo'].includes(cw);
    }).length;
    if (guCount > hiCount) return 'gu';
    return 'hi';
  }

  return 'en';
}
