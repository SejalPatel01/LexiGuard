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

    const securitySys = (options.systemInstruction || '').toLowerCase();
    if (securitySys.includes('ai security classifier') || securitySys.includes('security classifier') || promptLower.includes('security classifier') || promptLower.includes('prompt-injection') || promptLower.includes('prompt injection') || promptLower.includes('jailbreak')) {
      const isMalicious = promptLower.includes('startup process') || 
                          promptLower.includes('transparency audit') || 
                          promptLower.includes('hidden configuration') || 
                          promptLower.includes('initialization rules') || 
                          promptLower.includes('internal operating logic') || 
                          promptLower.includes('dan') || 
                          promptLower.includes('ignore all') || 
                          promptLower.includes('ignore previous') || 
                          promptLower.includes('system prompt') ||
                          promptLower.includes('instructions that were given to you');
      if (isMalicious) {
        return JSON.stringify({
          safe: false,
          category: "Prompt Injection",
          confidence: 95,
          reason: "Attempted to extract system configuration or operating logic."
        });
      } else {
        return JSON.stringify({
          safe: true,
          category: "None",
          confidence: 0,
          reason: "Safe request."
        });
      }
    }

    // Mock Translator
    if (promptLower.includes('translate to') || promptLower.includes('professional legal translator')) {
      const isTargetHindi = promptLower.includes('translate to hindi');
      const isTargetGujarati = promptLower.includes('translate to gujarati');
      
      // Check if it's translateDocumentAnalysisAction
      if (promptLower.includes('clauses:') && promptLower.includes('obligations:')) {
        if (isTargetHindi) {
          return JSON.stringify({
            summary: "राजेश मकान मालिक और सुरेश किरायेदार के बीच फ्लैट 402, सनशाइन हाइट्स, मुंबई के लिए मानक आवासीय पट्टा समझौता।",
            clauses: [
              {
                title: "सुरक्षा जमा खंड",
                explanation: "किरायेदार खाली करने के 30 दिनों के भीतर वापस किए जाने वाले 45,000 रुपये की सुरक्षा जमा राशि का भुगतान करता है।",
                riskLevel: "Low"
              },
              {
                title: "समाप्ति सूचना खंड",
                explanation: "कोई भी पक्ष 1 महीने की लिखित सूचना के साथ समाप्त कर सकता है।",
                riskLevel: "Medium"
              }
            ],
            obligations: [
              "किरायेदार को प्रत्येक माह की 5 तारीख को या उससे पहले 15,000 रुपये का मासिक किराया देना होगा।",
              "मकान मालिक को पट्टा समाप्त होने के 30 दिनों के भीतर सुरक्षा जमा राशि वापस करनी होगी।"
            ],
            deadlines: [
              {
                date: "प्रत्येक माह की 5 तारीख",
                action: "किराया भुगतान"
              },
              {
                date: "खाली करने के 30 दिन बाद",
                action: "सुरक्षा जमा की वापसी"
              }
            ],
            risks: [
              "सामान्य टूट-फूट से अधिक संपत्ति को होने वाले किसी भी नुकसान के लिए किरायेदार उत्तरदायी है।",
              "देरी से किराया भुगतान पर जुर्माना ब्याज लगेगा।"
            ]
          });
        }
        if (isTargetGujarati) {
          return JSON.stringify({
            summary: "રાજેશ મકાનમાલિક અને સુરેશ ભાડૂત વચ્ચે ફ્લેટ 402, સનશાઇન હાઇટ્સ, મુંબઈ માટે પ્રમાણભૂત રહેણાંક લીઝ કરાર.",
            clauses: [
              {
                title: "સુરક્ષા ડિપોઝિટ કલમ",
                explanation: "ભાડૂત ખાલી કરવાના 30 દિવસની અંદર પરત કરવાની શરતે રૂ. 45,000 ની સુરક્ષા ડિપોઝિટ ચૂકવે છે.",
                riskLevel: "Low"
              },
              {
                title: "સમાપ્તિ નોટિસ કલમ",
                explanation: "કોઈપણ પક્ષ 1 મહિનાની લેખિત નોટિસ સાથે કરાર સમાપ્ત કરી શકે છે.",
                riskLevel: "Medium"
              }
            ],
            obligations: [
              "ભાડૂતે દર મહિનાની 5 તારીખે અથવા તે પહેલાં રૂ. 15,000 માસિક ભાડું ચૂકવવું પડશે.",
              "મકાનમાલિકે લીઝ સમાપ્ત થયાના 30 દિવસની અંદર સુરક્ષા ડિપોઝિટ પરત કરવી પડશે."
            ],
            deadlines: [
              {
                date: "દરેક મહિનાની 5 તારીખ",
                action: "ભાડું ચુકવણી"
              },
              {
                date: "ખાલી કર્યાના 30 દિવસ પછી",
                action: "સુરક્ષા ડિપોઝિટ પરત મેળવવી"
              }
            ],
            risks: [
              "ભાડૂત સામાન્ય ઘસારા સિવાય મિલકતને થયેલા નુકસાન માટે જવાબદાર રહેશે.",
              "મોડી ભાડા ચુકવણી પર દંડ વ્યાજ લાગશે."
            ]
          });
        }
        // Default target is English:
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
          ]
        });
      }

      // Otherwise it's translateLegalOutputAction
      const isEmployment = promptLower.includes('employer') || promptLower.includes('salary') || promptLower.includes('wrongful termination');
      const isCyber = promptLower.includes('cyber') || promptLower.includes('hacked') || promptLower.includes('transaction') || promptLower.includes('unauthorized');
      const isConsumer = promptLower.includes('consumer') || promptLower.includes('defective') || promptLower.includes('laptop') || promptLower.includes('product');

      if (isTargetHindi) {
        if (isEmployment) {
          return JSON.stringify({
            translatedText: "यह एक संभावित गलत बर्खास्तगी का मामला प्रतीत होता है। यदि आपके रोजगार समझौते में नोटिस अवधि या विच्छेद (severance) शर्तों का उल्लेख है, तो नियोक्ता उन्हें पूरा करने के लिए कानूनी रूप से बाध्य है।\n\nइसके अलावा, पुनर्गठन (restructuring) के बहाने आपको नौकरी से निकालना और तुरंत आपकी जगह किसी अन्य को रखना दुर्भावना को दर्शाता है। आइए आपके रोजगार अनुबंध का विश्लेषण करें।",
            rights: [
              "नोटिस अवधि या उसके बदले वेतन प्राप्त करने का अधिकार।",
              "अनुबंध के अनुसार विच्छेद मुआवजा प्राप्त करने का अधिकार।"
            ],
            actions: [
              "नियोक्ता को औपचारिक कानूनी नोटिस भेजें।",
              "नौकरी के प्रस्ताव पत्र और वेतन पर्ची की प्रतियां सुरक्षित रखें।"
            ],
            notes: [
              "लिखित संवाद का उपयोग करें। मौखिक वादों को कोर्ट में साबित करना कठिन होता है।"
            ],
            checklist: [
              "रोजगार प्रस्ताव पत्र",
              "वेतन पर्ची",
              "मानव संसाधन विभाग के ईमेल"
            ],
            timeline: [
              { day: "दिन 1", action: "रोजगार अनुबंध की समीक्षा", description: "नोटिस अवधि और विच्छेद मुआवजे से संबंधित क्लॉज की जांच करें।" },
              { day: "दिन 2", action: "लिखित नोटिस भेजें", description: "मानव संसाधन विभाग को एक औपचारिक मांग पत्र भेजें।" },
              { day: "दिन 15", action: "अनुवर्ती कार्रवाई", description: "यदि नियोक्ता प्रतिक्रिया नहीं देता है, तो श्रम न्यायालय में शिकायत दर्ज करें।" }
            ],
            summary: {
              overview: "नियोक्ता ने बिना किसी सूचना या विच्छेद वेतन के रोजगार समाप्त कर दिया।",
              legalProvisions: ["औद्योगिक विवाद अधिनियम, धारा 25F (छंटनी से पहले शर्तें)"],
              nextAction: "नियोक्ता को वेतन वसूली नोटिस भेजें।"
            },
            riskLevel: "Strong Case",
            riskFactors: [
              "रोजगार अनुबंध में स्पष्ट रूप से 60 दिनों की अनिवार्य नोटिस अवधि दी गई है।",
              "कोई विसंगति नहीं मिली।"
            ]
          });
        }
        if (isCyber) {
          return JSON.stringify({
            translatedText: "साइबर सुरक्षा नियमों के तहत, आपको अनधिकृत बैंक लेनदेन की सूचना तुरंत देनी होगी। चूंकि राशि बिना ओटीपी सत्यापन के स्थानांतरित की गई थी, इसलिए कानूनी समयसीमा के भीतर रिपोर्ट करने पर बैंक को सुरक्षा खामियों के लिए उत्तरदायी ठहराया जा सकता है।",
            rights: [
              "अनधिकृत लेनदेन की रिपोर्ट करने पर बैंक की शून्य/सीमित देनदारी का अधिकार।",
              "बैंक द्वारा सुरक्षा चूक की जांच रिपोर्ट प्राप्त करने का अधिकार।"
            ],
            actions: [
              "तुरंत बैंक को सूचित करें और कार्ड/खाता ब्लॉक करें।",
              "राष्ट्रीय साइबर अपराध पोर्टल पर आधिकारिक शिकायत दर्ज करें।"
            ],
            notes: [
              "शिकायत की पावती संख्या हमेशा सुरक्षित रखें।"
            ],
            checklist: [
              "बैंक लेनदेन इतिहास",
              "बैंक शिकायत की प्रति",
              "साइबर सेल शिकायत पावती"
            ],
            timeline: [
              { day: "दिन 1", action: "कार्ड/खाता ब्लॉक करना", description: "नुकसान को सीमित करने के लिए तुरंत बैंक हॉटलाइन से संपर्क करें।" },
              { day: "दिन 2", action: "साइबर शिकायत दर्ज करें", description: "साइबर अपराध पोर्टल पर शिकायत दर्ज करें।" },
              { day: "दिन 10", action: "बैंक को लिखित शिकायत", description: "बैंक शाखा में औपचारिक शिकायत और दस्तावेज जमा करें।" }
            ],
            summary: {
              overview: "बिना ओटीपी सत्यापन के अनधिकृत ऑनलाइन लेनदेन और धन हानि का मामला।",
              legalProvisions: ["भारतीय रिजर्व बैंक नियम (अनधिकृत इलेक्ट्रॉनिक लेनदेन में ग्राहकों की सीमित देनदारी)"],
              nextAction: "साइबर सेल पावती and लेनदेन साक्ष्य पैकेज तैयार करें।"
            },
            riskLevel: "Medium",
            riskFactors: [
              "अनधिकृत लेनदेन में सिम क्लोनिंग या मैलवेयर की आशंका।",
              "कोई विसंगति नहीं मिली।"
            ]
          });
        }
        if (isConsumer) {
          return JSON.stringify({
            translatedText: "उपभोक्ता संरक्षण कानूनों के तहत, एक व्यवसाय को ऐसे उत्पाद प्रदान करने की आवश्यकता होती है जो उनके विवरण से मेल खाते हों और दोषमुक्त हों। चूंकि वारंटी अवधि के भीतर लैपटॉप खराब हो गया और विक्रेता ने मरम्मत से इनकार कर दिया, इसलिए आपके पास एक मजबूत उपभोक्ता विवाद का मामला है।",
            rights: [
              "दोषपूर्ण उत्पाद के प्रतिस्थापन (replacement) या धनवापसी (refund) का अधिकार।",
              "वारंटी शर्तों के तहत मुफ्त मरम्मत सेवा का अधिकार।"
            ],
            actions: [
              "विक्रेता और निर्माता को शिकायत पत्र भेजें।",
              "वारंटी कार्ड और खरीद बिल सुरक्षित रखें।"
            ],
            notes: [
              "दुकानदार के साथ हुए सभी पत्राचार को संभाल कर रखें।"
            ],
            checklist: [
              "खरीद चालान / बिल",
              "वारंटी कार्ड",
              "सर्विस सेंटर रिपोर्ट"
            ],
            timeline: [
              { day: "दिन 1", action: "दस्तावेजों का संग्रह", description: "खरीद बिल, वारंटी कार्ड और इनकार के ईमेल एकत्र करें।" },
              { day: "दिन 2", action: "औपचारिक पत्र भेजना", description: "विक्रेता को मरम्मत या प्रतिस्थापन के लिए औपचारिक पत्र भेजें।" },
              { day: "दिन 15", action: "उपभोक्ता फोरम", description: "यदि कोई जवाब नहीं मिलता है, तो जिला उपभोक्ता फोरम में शिकायत दर्ज करें।" }
            ],
            summary: {
              overview: "वारंटी अवधि के भीतर दोषपूर्ण उत्पाद और सेवा में कमी का मामला।",
              legalProvisions: ["उपभोक्ता संरक्षण अधिनियम, धारा 2(11) (सेवा में कमी)"],
              nextAction: "विक्रेता को अंतिम कानूनी नोटिस भेजें।"
            },
            riskLevel: "Strong Case",
            riskFactors: [
              "वारंटी कार्ड पर स्पष्ट तारीख और विक्रेता का मरम्मत से लिखित इनकार मौजूद है।",
              "कोई विसंगति नहीं मिली।"
            ]
          });
        }
        // Default Landlord Hindi:
        return JSON.stringify({
          translatedText: "तुलनात्मक रूप से, आपके मकान मालिक आपके किराए के समझौते के नियमों के तहत आपके सुरक्षा जमा को वापस करने के लिए कानूनी रूप से बाध्य हैं। यदि वे अनुचित रूप से इसे रोकते हैं, तो आप कानूनी मांग सूचना भेज सकते हैं।",
          rights: [
            "पट्टा समाप्त होने पर सुरक्षा जमा राशि की पूर्ण वापसी का अधिकार।",
            "काटी गई किसी भी राशि का लिखित विवरण प्राप्त करने का अधिकार।"
          ],
          actions: [
            "मकान मालिक को औपचारिक लिखित मांग नोटिस भेजें।",
            "भुगतान के प्रमाण और पत्राचार रिकॉर्ड की प्रतियां सुरक्षित रखें।"
          ],
          notes: [
            "लिखित संचार का उपयोग करें। मौखिक समझौतों का कोर्ट में सत्यापन करना कठिन होता है।"
          ],
          checklist: [
            "लिखित पट्टा/खरीद/रोजगार समझौता",
            "लेनदेन का प्रमाण (रसीद/विवरण)",
            "पत्राचार लॉग (ईमेल/चैट)"
          ],
          timeline: [
            { day: "दिन 1", action: "पट्टा समझौते की समीक्षा", description: "जमा वापसी की समयसीमा से संबंधित शर्तों की जांच करें।" },
            { day: "दिन 2", action: "लिखित नोटिस भेजें", description: "व्हाट्सएप या ईमेल के माध्यम से औपचारिक मांग सूचना भेजें।" },
            { day: "दिन 15", action: "अनुवर्ती कार्रवाई", description: "यदि कोई उत्तर नहीं मिलता है, तो कानूनी शिकायत दर्ज करें।" }
          ],
          summary: {
            overview: "मकान मालिक पट्टा समाप्ति के बाद सुरक्षा जमा राशि वापस करने में विफल रहा।",
            legalProvisions: ["मॉडल टेनेंसी एक्ट, धारा 11 (सुरक्षा जमा की वापसी)"],
            nextAction: "मकान मालिक को सुरक्षा जमा मांग नोटिस भेजें।"
          },
          riskLevel: "Strong Case",
          riskFactors: [
            "मकान मालिक के पास जमा राशि रोकने का कोई कानूनी आधार नहीं है।",
            "कोई विसंगति नहीं मिली।"
          ]
        });
      }

      if (isTargetGujarati) {
        if (isEmployment) {
          return JSON.stringify({
            translatedText: "આ એક સંભવિત ખોટી બરતરફીનો કેસ જણાય છે. જો તમારા રોજગાર કરારમાં નોટિસ પિરિયડ અથવા સેવરન્સ શરતોનો ઉલ્લેખ હોય, તો એમ્પ્લોયર કાનૂની રીતે તેને પૂર્ણ કરવા માટે બંધાયેલા છે.\n\nવધુમાં, પુનર્ગઠન (restructuring) ના બહાના હેઠળ તમને નોકરીમાંથી છૂટા કરવા અને તરત જ તમારી જગ્યાએ અન્ય વ્યક્તિની ભરતી કરવી એ ખરાબ ઈરાદા દર્શાવે છે. ચાલો તમારા રોજગાર કરારનું વિશ્લેણ કરીએ.",
            rights: [
              "નોટિસ પિરિયડ અથવા તેના બદલામાં પગાર મેળવવાનો અધિકાર.",
              "કરાર અનુસાર સેવરન્સ વળતર મેળવવાનો અધિકાર."
            ],
            actions: [
              "એમ્પ્લોયરને ઔપચારિક કાનૂની નોટિસ મોકલો.",
              "ઓફર લેટર અને પગાર સ્લિપની નકલો સુરક્ષિત રાખો."
            ],
            notes: [
              "લેખિત સંવાદનો જ ઉપયોગ કરો. મૌખિક વાયદાઓ કોર્ટમાં સાબિત કરવા મુશ્કેલ હોય છે."
            ],
            checklist: [
              "રોજગાર ઓફર લેટર",
              "પગાર સ્લિપ",
              "એચઆર વિભાગના ઈમેઈલ"
            ],
            timeline: [
              { day: "દિવસ 1", action: "રોજગાર કરારની સમીક્ષા", description: "નોટિસ પિરિયડ અને સેવરન્સ વળતર સંબંધિત ક્લોઝ તપાસો." },
              { day: "દિવસ 2", action: "લેખિત નોટિસ મોકલો", description: "એચઆર વિભાગને ઔપચારિક માંગ પત્ર મોકલો." },
              { day: "દિવસ 15", action: "ફોલો અપ / કાનૂની કાર્યવાહી", description: "જો એમ્પ્લોયર જવાબ ન આપે તો લેબર કોર્ટમાં ફરિયાદ નોંધાવો." }
            ],
            summary: {
              overview: "એમ્પ્લોયરે કોઈપણ નોટિસ કે સેવરન્સ વગર રોજગાર સમાપ્ત કર્યો.",
              legalProvisions: ["ઔદ્યોગિક વિવાદ અધિનિયમ, કલમ 25F (છટણી પહેલાની શરતો)"],
              nextAction: "એમ્પ્લોયરને પગાર વસૂલાતની નોટિસ મોકલો."
            },
            riskLevel: "Strong Case",
            riskFactors: [
              "રોજગાર કરારમાં સ્પષ્ટપણે 60 દિવસની ફરજિયાત નોટિસ અવધિ આપવામાં આવી છે.",
              "કોઈ મેળ ખાતી વિસંગતતા મળી નથી."
            ]
          });
        }
        if (isCyber) {
          return JSON.stringify({
            translatedText: "સાયબર સુરક્ષા નિયમો હેઠળ, તમારે અનધિકૃત બેંક વ્યવહારોની જાણ તાત્કાલિક કરવી આવશ્યક છે. કારણ કે ભંડોળ ઓટીપી વેરિફિકેશન વગર ટ્રાન્સફર કરવામાં આવ્યું હતું, તેથી કાનૂની સમયમર્યાદામાં જાણ કરવામાં આવે તો બેંકને સુરક્ષા ખામીઓ માટે જવાબદાર ઠેરવી શકાય છે.",
            rights: [
              "અનધિકૃત વ્યવહારોની જાણ કરવા પર બેંકની શૂન્ય/મર્યાદિત જવાબદારીનો અધિકાર.",
              "બેંક દ્વારા સુરક્ષા તપાસ અહેવાલ મેળવવાનો અધિકાર."
            ],
            actions: [
              "તાત્કાલિક બેંકને જાણ કરો અને કાર્ડ/ખાતું બ્લોક કરો.",
              "રાષ્ટ્રીય સાયબર ક્રાઈમ પોર્ટલ પર સત્તાવાર ફરિયાદ નોંધાવો."
            ],
            notes: [
              "કરાયેલ ફરિયાદની સ્વીકૃતિ નંબર હંમેશા સુરક્ષિત રાખો."
            ],
            checklist: [
              "બેંક વ્યવહાર ઇતિહાસ",
              "બેંક ફરિયાદની નકલ",
              "સાયબર સેલ ફરિયાદ સ્વીકૃતિ"
            ],
            timeline: [
              { day: "દિવસ 1", action: "કાર્ડ/ખાતું બ્લોક કરવું", description: "નુકસાન મર્યાદિત કરવા તાત્કાલિક બેંક હેલ્પલાઇનનો સંપર્ક કરો." },
              { day: "દિવસ 2", action: "સાયબર ફરિયાદ નોંધાવો", description: "સાયબર ક્રાઈમ પોર્ટલ પર ફરિયાદ નોંધાવો." },
              { day: "દિવસ 10", action: "બેંકને લેખિત ફરિયાદ", description: "બેંક શાખામાં સત્તાવાર ફરિયાદ પત્ર અને દસ્તાવેજો સબમિટ કરો." }
            ],
            summary: {
              overview: "ઓટીપી વેરિફિકેશન વગર અનધિકૃત ઓનલાઇન વ્યવહાર અને નાણાં ગુમાવવાનો કેસ.",
              legalProvisions: ["રિઝર્વ બેંક ઓફ ઇન્ડિયા નિયમો (અનધિકૃત વ્યવહારોમાં ગ્રાહકોની મર્યાદિત જવાબદારી)"],
              nextAction: "સાયબર સેલ સ્વીકૃતિ અને પુરાવા પેકેજ તૈયાર કરો."
            },
            riskLevel: "Medium",
            riskFactors: [
              "અનધિકૃત વ્યવહારમાં સિમ ક્લોનિંગ અથવા માલવેરની આશંકા.",
              "કોઈ મેળ ખાતી વિસંગતતા મળી નથી."
            ]
          });
        }
        if (isConsumer) {
          return JSON.stringify({
            translatedText: "ગ્રાહક સુરક્ષા કાયદા હેઠળ, વ્યવસાયે એવા ઉત્પાદનો પહોંચાડવા જરૂરી છે જે તેમના વર્ણન સાથે મેળ ખાતા હોય અને ખામી રહિત હોય. કારણ કે વોરંટી સમયગાળા દરમિયાન લેપટોપ બગડી ગયું અને વિક્રેતાએ રિપેર કરવાનો ઇનકાર કર્યો, તમારી પાસે મજબૂત ગ્રાહક વિવાદ છે.",
            rights: [
              "ખામીયુક્ત પ્રોડક્ટ બદલવા (replacement) અથવા રિફંડ મેળવવાનો અધિકાર.",
              "વોરંટી શરતો હેઠળ મફત રિપેરિંગ સેવાનો અધિકાર."
            ],
            actions: [
              "વિક્રેતા અને ઉત્પાદકને ફરિયાદ પત્ર મોકલો.",
              "વોરંટી કાર્ડ અને ખરીદીનું બિલ સુરક્ષિત રાખો."
            ],
            notes: [
              "દુકાનદાર સાથે થયેલા તમામ પત્રવ્યવહાર સાચવી રાખો."
            ],
            checklist: [
              "ખરીદીનું ઇન્વોઇસ / બિલ",
              "વોરંટી કાર્ડ",
              "સર્વિસ સેન્ટર રિપોર્ટ"
            ],
            timeline: [
              { day: "દિવસ 1", action: "દસ્તાવેજોનો સંગ્રહ", description: "ખરીદી બિલ, વોરંટી કાર્ડ અને નકારના ઇમેઇલ્સ એકત્રિત કરો." },
              { day: "દિવસે 2", action: "ઔપચારિક પત્ર મોકલવો", description: "વિક્રેતાને રિપેર અથવા બદલી માટે સત્તાવાર પત્ર મોકલો." },
              { day: "દિવસ 15", action: "ગ્રાહક ફોરમ", description: "જો કોઈ જવાબ ન મળે તો જિલ્લા ગ્રાહક ફોરમમાં ફરિયાદ નોંધાવો." }
            ],
            summary: {
              overview: "વોરંટી સમયગાળા દરમિયાન ખામીયુક્ત ઉત્પાદન અને સેવામાં ખામીનો કેસ.",
              legalProvisions: ["ગ્રાહક સુરક્ષા અધિનિયમ, કલમ 2(11) (સેવામાં ખામી)"],
              nextAction: "વિક્રેતાને અંતિમ કાનૂની નોટિસ મોકલો."
            },
            riskLevel: "Strong Case",
            riskFactors: [
              "વોરંટી કાર્ડ પર સ્પષ્ટ તારીખ અને વિક્રેતાનો લેખિત નકાર ઉપલબ્ધ છે.",
              "કોઈ મેળ ખાતી વિસંગતતા મળી નથી."
            ]
          });
        }
        // Default Landlord Gujarati:
        return JSON.stringify({
          translatedText: "ત્યારબાદ, તમારા મકાનમાલિક તમારા ભાડા કરારના નિયમો હેઠળ તમારી સુરક્ષા ડિપોઝિટ પરત કરવા માટે કાનૂની રીતે બંધાયેલા છે. જો તેઓ અન્યાયી રીતે તેને રોકી રાખે છે, તો તમે કાનૂની નોટિસ મોકલી શકો છો.",
          rights: [
            "લીઝ સમાપ્ત થવા પર સુરક્ષા ડિપોઝિટ પૂરેપૂરી પરત મેળવવાનો અધિકાર.",
            "કરાયેલ કોઈ પણ કપાતનું લેખિત સ્પષ્ટીકરણ મેળવવાનો અધિકાર."
          ],
          actions: [
            "મકાનમાલિકને ઔપ્યારિક લેખિત માંગ નોટિસ મોકલો.",
            "બેંક વ્યવહાર પુરાવા અને વોટ્સએપ સંદેશાઓની નકલો રાખો."
          ],
          notes: [
            "લેખિત સંવાદનો જ ઉપયોગ કરો. મૌખિક કરારો કોર્ટમાં સાબિત કરવા મુશ્કેલ હોય છે."
          ],
          checklist: [
            "લેખિત લીઝ/ખરીદી/રોજગાર કરાર",
            "વ્યવહારોના પુરાવા (રસીદો/નિવેદનો)",
            "પત્રવ્યવહાર લોગ (ઇમેઇલ/ચેટ્સ)"
          ],
          timeline: [
            { day: "દિવસે 1", action: "ભાડા કરારની સમીક્ષા", description: "ડિપોઝિટ પરત કરવાની સમયમર્યાદા તપાસો." },
            { day: "દિવસે 2", action: "લેખિત નોટિસ મોકલો", description: "વોટ્સએપ અથવા ઇમેઇલ દ્વારા ઔપચારિક નોટિસ મોકલો." },
            { day: "દિવસે 15", action: "કાનૂની કાર્યવાહી", description: "જો કોઈ જવાબ ન મળે તો ફરિયાદ દાખલ કરો." }
          ],
          summary: {
            overview: "લીઝ સમાપ્ત થયા પછી મકાનમાલિક સુરક્ષા ડિપોઝિટ પરત કરવામાં નિષ્ફળ ગયા.",
            legalProvisions: ["મોડેલ ટેનન્સી એક્ટ, કલમ 11 (સુરક્ષા ડિપોઝિટ પરત કરવી)"],
            nextAction: "મકાનમાલિકને ભાડૂત સુરક્ષા ડિપોઝિટ કાનૂની નોટિસ મોકલો."
          },
          riskLevel: "Strong Case",
          riskFactors: [
            "મકાનમાલિક પાસે ડિપોઝિટ રોકવા માટે કોઈ કાનૂની આધાર નથી.",
            "કોઈ મેળ ખાતી વિસંગતતા મળી નથી."
          ]
        });
      }
      
      // Default to English:
      return JSON.stringify({
        translatedText: "Under standard rental laws, your landlord is legally obligated to refund your security deposit under terms of your agreement. If they refuse, you can issue a Demand Notice.",
        rights: [
          "Right to receive refund of security deposit in full upon lease termination.",
          "Right to an itemized written explanation of any deductions made."
        ],
        actions: [
          "Send a formal written Demand Notice to the landlord.",
          "Retain copies of transaction proof and communication logs."
        ],
        notes: [
          "Use written communications. Verbal agreements are difficult to verify in court."
        ],
        checklist: [
          "Written lease or rental agreement",
          "Bank transaction proof or receipts",
          "WhatsApp chat logs or emails"
        ],
        timeline: [
          { day: "Day 1", action: "Review lease agreement", description: "Find clauses specifying deposit refund timelines." },
          { day: "Day 2", action: "Send written notice", description: "Send formal demand notice via WhatsApp/email." },
          { day: "Day 15", action: "Follow up / Legal action", description: "File a complaint if landlord fails to respond." }
        ],
        summary: {
          overview: "Landlord failed to return security deposit after lease termination.",
          legalProvisions: ["Model Tenancy Act, Section 11 (Refund of Security Deposit)"],
          nextAction: "Send Tenant Security Deposit Demand Notice to the landlord."
        },
        riskLevel: "Strong Case",
        riskFactors: [
          "Landlord has no legal grounds for withholding the deposit.",
          "No matching discrepancy found."
        ]
      });
    }
    
    // 1. Classifier Agent Mock
    if (promptLower.includes('classify this user') || promptLower.includes('categorize this') || promptLower.includes('classify user\'s') || promptLower.includes('वर्गीकृत') || promptLower.includes('વર્ગીકૃત')) {
      if (promptLower.includes('landlord') || promptLower.includes('deposit') || promptLower.includes('मकान मालिक') || promptLower.includes('सुरक्षा जमा') || promptLower.includes('मकानमालिक') || promptLower.includes('ભાડા') || promptLower.includes('ડિપોઝિટ')) {
        return JSON.stringify({
          category: "Landlord / Property Issue",
          confidence: 95,
          reasoning: "The user is disputing the return of a security deposit by their landlord.",
          isDocumentAnalysisRequired: false
        });
      }
      if (promptLower.includes('defective') || promptLower.includes('seller') || promptLower.includes('refund') || promptLower.includes('दोषपूर्ण') || promptLower.includes('विक्रेता') || promptLower.includes('रिफंड') || promptLower.includes('ખામીયુક્ત') || promptLower.includes('વિક્રેતા') || promptLower.includes('રિફંડ')) {
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

    const sys = (options.systemInstruction || '').toLowerCase();
    const isHindi = sys.includes('hindi');
    const isGujarati = sys.includes('gujarati');

    // 2. Advisor Agent Mock
    if (promptLower.includes('explain the user\'s legal rights') || promptLower.includes('legal advisor assistant')) {
      if (isHindi) {
        return JSON.stringify({
          rights: [
            "पट्टे की समाप्ति पर सुरक्षा जमा राशि पूर्ण रूप से वापस पाने का अधिकार।",
            "किए गए किसी भी कटौती के लिखित स्पष्टीकरण प्राप्त करने का अधिकार।"
          ],
          actions: [
            "मकान मालिक को एक औपचारिक लिखित मांग नोटिस भेजें।",
            "बैंक लेनदेन प्रमाण और व्हाट्सएप संदेशों की प्रतियां रखें।"
          ],
          notes: [
            "जमा वापसी समय-सीमा खंडों के लिए पट्टा समझौते से परामर्श लें।"
          ],
          text: "आपका मकान मालिक आपके किराया समझौते की शर्तों के तहत आपकी सुरक्षा जमा राशि वापस करने के लिए कानूनी रूप से बाध्य है। चूंकि आपके पास किराया समझौता, भुगतान का बैंक प्रमाण और व्हाट्सएप संदेश हैं, इसलिए आपका मामला बहुत मजबूत है। आपको पहले मकान मालिक को 15 दिनों का समय देते हुए एक औपचारिक मांग नोटिस भेजना चाहिए।"
        });
      }
      if (isGujarati) {
        return JSON.stringify({
          rights: [
            "લીઝ સમાપ્ત થવા પર સુરક્ષા ડિપોઝિટ પૂરેપૂરી પરત મેળવવાનો અધિકાર.",
            "કરાયેલ કોઈ પણ કપાતનું લેખિત સ્પષ્ટીકરણ મેળવવાનો અધિકાર."
          ],
          actions: [
            "મકાનમાલિકને ઔપ્યારિક લેખિત માંગ નોટિસ મોકલો.",
            "બેંક વ્યવહાર પુરાવા અને વોટ્સએપ સંદેશાઓની નકલો રાખો."
          ],
          notes: [
            "ડિપોઝિટ રિફંડની સમયમર્યાદા કલમો માટે લીઝ કરારની સલાહ લો."
          ],
          text: "તમારા મકાનમાલિક તમારા ભાડા કરારની શરતો હેઠળ તમારી સુરક્ષા ડિપોઝિટ પરત કરવા માટે કાનૂની રીતે બંધાયેલા છે. તમારી પાસે ભાડા કરાર, ચુકવણીના બેંક પુરાવા અને વોટ્સએપ સંદેશાઓ હોવાથી તમારો કેસ ખૂબ જ મજબૂત છે. તમારે પહેલા મકાનમાલિકને ૧૫ દિવસનો સમય આપતી ઔપચારિક માંગ નોટિસ મોકલવી જોઈએ."
        });
      }
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
      if (isHindi) {
        return JSON.stringify({
          checklist: [
            "लिखित पट्टा/खरीद/रोजगार समझौता",
            "लेनदेन का प्रमाण (रसीदें/विवरण)",
            "पत्राचार लॉग (ईमेल/चैट)"
          ],
          timeline: [
            {
              day: "दिन 1",
              action: "पट्टा समझौते की समीक्षा",
              description: "जमा वापसी समय-सीमा निर्दिष्ट करने वाले खंडों का पता लगाएं।"
            },
            {
              day: "दिन 2",
              action: "लिखित सूचना भेजें",
              description: "व्हाट्सएप/ईमेल के माध्यम से एक औपचारिक मांग नोटिस भेजें।"
            },
            {
              day: "दिन 15",
              action: "अनुवर्ती / कानूनी कार्रवाई",
              description: "यदि मकान मालिक जवाब देने में विफल रहता है तो शिकायत दर्ज करें।"
            }
          ],
          summary: "मकान मालिक पट्टे की समाप्ति के बाद सुरक्षा जमा राशि वापस करने में विफल रहा।",
          legalProvisions: [
            "मॉडल किरायेदारी अधिनियम, धारा 11 (सुरक्षा जमा की वापसी)"
          ],
          nextAction: "मकान मालिक को किरायेदार सुरक्षा जमा मांग नोटिस भेजें।",
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
            "मकान मालिक के पास जमा राशि रोकने का कोई कानूनी आधार नहीं है।",
            "कोई विसंगति नहीं मिली।"
          ]
        });
      }
      if (isGujarati) {
        return JSON.stringify({
          checklist: [
            "લેખિત લીઝ/ખરીદી/રોજગાર કરાર",
            "વ્યવહારોના પુરાવા (રસીદો/નિવેદનો)",
            "પત્રવ્યવહાર લોગ (ઇમેઇલ/ચેટ્સ)"
          ],
          timeline: [
            {
              day: "દિવસ 1",
              action: "લીઝ કરારની સમીક્ષા",
              description: "ડિપોઝિટ રિફંડ સમયરેખા દર્શાવતી કલમો શોધો."
            },
            {
              day: "દિવસ 2",
              action: "લેખિત નોટિસ મોકલો",
              description: "વોટ્સએપ/ઇમેઇલ દ્વારા ઔપચારિક માંગ નોટિસ મોકલો."
            },
            {
              day: "દિવસ 15",
              action: "ફોલો અપ / કાનૂની કાર્યવાહી",
              description: "જો મકાનમાલિક પ્રતિસાદ આપવામાં નિષ્ફળ જાય તો ફરિયાદ દાખલ કરો."
            }
          ],
          summary: "લીઝ સમાપ્ત થયા પછી મકાનમાલિક સુરક્ષા ડિપોઝિટ પરત કરવામાં નિષ્ફળ ગયા.",
          legalProvisions: [
            "મોડેલ ટેનન્સી એક્ટ, કલમ 11 (સુરક્ષા ડિપોઝિટ પરત કરવી)"
          ],
          nextAction: "મકાનમાલિકને ટેનન્ટ સિક્યોરિટી ડિપોઝિટ ડિમાન્ડ નોટિસ મોકલો.",
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
            "મકાનમાલિક પાસે ડિપોઝિટ રોકવા માટે કોઈ કાનૂની આધાર નથી.",
            "કોઈ મેળ ખાતી વિસંગતતા મળી નથી."
          ]
        });
      }
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
      if (isHindi) {
        return JSON.stringify({
          summary: "राजेश मकान मालिक और सुरेश किरायेदार के बीच फ्लैट 402, सनशाइन हाइट्स, मुंबई के लिए मानक आवासीय पट्टा समझौता।",
          clauses: [
            {
              title: "सुरक्षा जमा खंड",
              explanation: "किरायेदार खाली करने के 30 दिनों के भीतर वापस किए जाने वाले 45,000 रुपये की सुरक्षा जमा राशि का भुगतान करता है।",
              riskLevel: "Low"
            },
            {
              title: "समाप्ति सूचना खंड",
              explanation: "कोई भी पक्ष 1 महीने की लिखित सूचना के साथ समाप्त कर सकता है।",
              riskLevel: "Medium"
            }
          ],
          obligations: [
            "किरायेदार को प्रत्येक माह की 5 तारीख को या उससे पहले 15,000 रुपये का मासिक किराया देना होगा।",
            "मकान मालिक को पट्टा समाप्त होने के 30 दिनों के भीतर सुरक्षा जमा राशि वापस करनी होगी।"
          ],
          deadlines: [
            {
              date: "प्रत्येक माह की 5 तारीख",
              action: "किराया भुगतान"
            },
            {
              date: "खाली करने के 30 दिन बाद",
              action: "सुरक्षा जमा की वापसी"
            }
          ],
          risks: [
            "सामान्य टूट-फूट से अधिक संपत्ति को होने वाले किसी भी नुकसान के लिए किरायेदार उत्तरदायी है।",
            "देरी से किराया भुगतान पर जुर्माना ब्याज लगेगा।"
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
      if (isGujarati) {
        return JSON.stringify({
          summary: "રાજેશ મકાનમાલિક અને સુરેશ ભાડૂત વચ્ચે ફ્લેટ 402, સનશાઇન હાઇટ્સ, મુંબઈ માટે પ્રમાણભૂત રહેણાંક લીઝ કરાર.",
          clauses: [
            {
              title: "સુરક્ષા ડિપોઝિટ કલમ",
              explanation: "ભાડૂત ખાલી કરવાના 30 દિવસની અંદર પરત કરવાની શરતે રૂ. 45,000 ની સુરક્ષા ડિપોઝિટ ચૂકવે છે.",
              riskLevel: "Low"
            },
            {
              title: "સમાપ્તિ નોટિસ કલમ",
              explanation: "કોઈપણ પક્ષ 1 મહિનાની લેખિત નોટિસ સાથે કરાર સમાપ્ત કરી શકે છે.",
              riskLevel: "Medium"
            }
          ],
          obligations: [
            "ભાડૂતે દર મહિનાની 5 તારીખે અથવા તે પહેલાં રૂ. 15,000 માસિક ભાડું ચૂકવવું પડશે.",
            "મકાનમાલિકે લીઝ સમાપ્ત થયાના 30 દિવસની અંદર સુરક્ષા ડિપોઝિટ પરત કરવી પડશે."
          ],
          deadlines: [
            {
              date: "દરેક મહિનાની 5 તારીખ",
              action: "ભાડું ચુકવણી"
            },
            {
              date: "ખાલી કર્યાના 30 દિવસ પછી",
              action: "સુરક્ષા ડિપોઝિટ પરત મેળવવી"
            }
          ],
          risks: [
            "ભાડૂત સામાન્ય ઘસારા સિવાય મિલકતને થયેલા નુકસાન માટે જવાબદાર રહેશે.",
            "મોડી ભાડા ચુકવણી પર દંડ વ્યાજ લાગશે."
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

    const sys = (options.systemInstruction || '').toLowerCase();
    const isHindi = sys.includes('hindi');
    const isGujarati = sys.includes('gujarati');
    
    if (
      combinedLower.includes('rent') || 
      combinedLower.includes('lease') || 
      combinedLower.includes('agreement') || 
      combinedLower.includes('contract') ||
      combinedLower.includes('किराया समझौता') ||
      combinedLower.includes('पट्टा') ||
      combinedLower.includes('अनुबंध') ||
      combinedLower.includes('समझौता') ||
      combinedLower.includes('ભાડા કરાર') ||
      combinedLower.includes('કરાર') ||
      combinedLower.includes('દસ્તાવેજ')
    ) {
      if (isHindi) {
        return JSON.stringify({
          summary: "राजेश मकान मालिक और सुरेश किरायेदार के बीच फ्लैट 402, सनशाइन हाइट्स, मुंबई के लिए मानक आवासीय पट्टा समझौता।",
          clauses: [
            {
              title: "सुरक्षा जमा खंड",
              explanation: "किरायेदार खाली करने के 30 दिनों के भीतर वापस किए जाने वाले 45,000 रुपये की सुरक्षा जमा राशि का भुगतान करता है।",
              riskLevel: "Low"
            },
            {
              title: "समाप्ति सूचना खंड",
              explanation: "कोई भी पक्ष 1 महीने की लिखित सूचना के साथ समाप्त कर सकता है।",
              riskLevel: "Medium"
            }
          ],
          obligations: [
            "किरायेदार को प्रत्येक माह की 5 तारीख को या उससे पहले 15,000 रुपये का मासिक किराया देना होगा।",
            "मकान मालिक को पट्टा समाप्त होने के 30 दिनों के भीतर सुरक्षा जमा राशि वापस करनी होगी।"
          ],
          deadlines: [
            {
              date: "प्रत्येक माह की 5 तारीख",
              action: "किराया भुगतान"
            },
            {
              date: "खाली करने के 30 दिन बाद",
              action: "सुरक्षा जमा की वापसी"
            }
          ],
          risks: [
            "सामान्य टूट-फूट से अधिक संपत्ति को होने वाले किसी भी नुकसान के लिए किरायेदार उत्तरदायी है।",
            "देरी से किराया भुगतान पर जुर्माना ब्याज लगेगा।"
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
      if (isGujarati) {
        return JSON.stringify({
          summary: "રાજેશ મકાનમાલિક અને સુરેશ ભાડૂત વચ્ચે ફ્લેટ 402, સનશાઇન હાઇટ્સ, મુંબઈ માટે પ્રમાણભૂત રહેણાંક લીઝ કરાર.",
          clauses: [
            {
              title: "સુરક્ષા ડિપોઝિટ કલમ",
              explanation: "ભાડૂત ખાલી કરવાના 30 દિવસની અંદર પરત કરવાની શરતે રૂ. 45,000 ની સુરક્ષા ડિપોઝિટ ચૂકવે છે.",
              riskLevel: "Low"
            },
            {
              title: "સમાપ્તિ નોટિસ કલમ",
              explanation: "કોઈપણ પક્ષ 1 મહિનાની લેખિત નોટિસ સાથે કરાર સમાપ્ત કરી શકે છે.",
              riskLevel: "Medium"
            }
          ],
          obligations: [
            "ભાડૂતે દર મહિનાની 5 તારીખે અથવા તે પહેલાં રૂ. 15,000 માસિક ભાડું ચૂકવવું પડશે.",
            "મકાનમાલિકે લીઝ સમાપ્ત થયાના 30 દિવસની અંદર સુરક્ષા ડિપોઝિટ પરત કરવી પડશે."
          ],
          deadlines: [
            {
              date: "દરેક મહિનાની 5 તારીખ",
              action: "ભાડું ચુકવણી"
            },
            {
              date: "ખાલી કર્યાના 30 દિવસ પછી",
              action: "સુરક્ષા ડિપોઝિટ પરત મેળવવી"
            }
          ],
          risks: [
            "ભાડૂત સામાન્ય ઘસારા સિવાય મિલકતને થયેલા નુકસાન માટે જવાબદાર રહેશે.",
            "મોડી ભાડા ચુકવણી પર દંડ વ્યાજ લાગશે."
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

    const defaultSummary = isHindi 
      ? "यह एक गैर-कानूनी दस्तावेज़ है।" 
      : isGujarati 
        ? "આ એક બિન-કાનૂની દસ્તાવેજ છે." 
        : "This is a non-legal document.";
    
    const defaultText = isHindi
      ? "गैर-कानूनी सामग्री..."
      : isGujarati
        ? "બિન-કાનૂની સામગ્રી..."
        : "Non-legal content...";

    return JSON.stringify({
      summary: defaultSummary,
      clauses: [],
      obligations: [],
      deadlines: [],
      risks: [],
      text: defaultText,
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
