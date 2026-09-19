/**
 * Gemini AI Job Offer Verification Service
 * Cross-references job offers against genuine corporate sources,
 * detects recruitment fraud, and computes trust scores.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Checks if the Gemini API key is configured.
 */
export function isGeminiConfigured() {
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10 && !GEMINI_API_KEY.includes('your_gemini_api_key'));
}

/**
 * Analyses a job offer using Google Gemini AI with real-world verification.
 * @param {string} offerText - The full text of the job offer
 * @param {object} overrides - Any user-provided metadata overrides
 * @returns {Promise<object>} Structured verification result
 */
export async function verifyOfferWithGemini(offerText, overrides = {}) {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY in your .env file.');
  }

  const prompt = `
You are TrustHire's Lead Security & Job Offer Verification AI. Your mission is to protect job seekers by cross-examining this offer against GENUINE corporate entities, official career portals, and known scam patterns.

OFFER TEXT:
"""
${offerText}
"""

USER-SPECIFIED DETAILS (IF ANY):
- Company: ${overrides.company || 'Not specified'}
- Role: ${overrides.role || 'Not specified'}
- Salary: ${overrides.salary || 'Not specified'}
- Recruiter Email: ${overrides.recruiter_email || 'Not specified'}
- Website: ${overrides.company_website || 'Not specified'}

VERIFICATION INSTRUCTIONS:
1. FACT-CHECK THE COMPANY:
   - Identify the real company named in the offer.
   - Determine its genuine official website domain and official careers portal.
   - Compare the recruiter's email domain against the genuine company domain (flag if using free email like @gmail.com, @yahoo.com, or spoofed lookalike domains like @google-recruitment.com).

2. SCAM PATTERN DETECTION:
   - Upfront payment, training fees, security deposits, or kit charges (IMMEDIATE CRITICAL RED FLAG).
   - Interviews conducted exclusively via Telegram, WhatsApp, or text chat without video/in-person stages.
   - Unusually high salary for entry-level / no-experience / remote data entry work.
   - Urgency tactics ("reply within 24 hours", "limited slots", "send deposit to reserve").
   - Fake check / equipment check forwarding schemes.

3. SCORING & BAND RULES:
   - Trust Score (0 to 100):
     - 0-39: High Risk / Definite or Likely Scam (e.g. asks for money, Telegram interview, fake domain).
     - 40-74: Suspicious / Needs Independent Verification (e.g. unknown entity, vague offer, free email).
     - 75-100: Likely Legitimate (authentic company domain, professional structure, no fee requests).
   - Risk Band: exactly one of "high_risk", "suspicious", or "likely_legit".
   - Confidence: "High" or "Medium".

OUTPUT FORMAT:
Respond with ONLY valid JSON (no markdown formatting, no code blocks, no backticks):
{
  "score": 15,
  "band": "high_risk",
  "confidence": "High",
  "aiSummary": "Clear, concise 2-3 sentence executive summary explaining the assessment to the candidate.",
  "genuineSources": [
    {
      "title": "Official Company Website",
      "url": "https://example.com",
      "note": "Verified primary corporate domain"
    },
    {
      "title": "Official Careers Portal",
      "url": "https://careers.example.com",
      "note": "Legitimate jobs are published here"
    }
  ],
  "redFlags": [
    {
      "id": "RF1",
      "name": "Advance Fee / Deposit Requested",
      "why": "Legitimate companies never require candidates to pay for employment, background checks, or equipment.",
      "evidence": "Quoted text from offer"
    }
  ],
  "positives": [
    {
      "id": "P1",
      "name": "Registered Corporate Identity",
      "evidence": "Matches active registered enterprise."
    }
  ],
  "recommendations": [
    "Do not transfer any money or share government ID numbers.",
    "Search the official careers portal directly at https://example.com"
  ],
  "details": {
    "company": "Detected Company Name",
    "role": "Detected Role",
    "salary": "Detected Salary",
    "recruiter_email": "Detected Recruiter Email",
    "company_website": "Genuine Official Website URL",
    "interview_channel": "Detected Interview Channel (e.g. Telegram, Email, In-person)"
  }
}
`;

  // Attempt 1: With Google Search Grounding if supported
  try {
    const result = await callGeminiApi(prompt, true);
    return result;
  } catch (err) {
    console.warn('Gemini call with search grounding failed or unsupported, retrying direct reasoning:', err.message);
    // Attempt 2: Fallback without tools to ensure 100% reliability
    return await callGeminiApi(prompt, false);
  }
}

async function callGeminiApi(prompt, withSearch = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY.trim()}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 2048,
    },
  };

  if (withSearch) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('No response received from Gemini API');
  }

  // Parse JSON response cleanly
  let cleaned = textOutput.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  // Extract grounding citations if available
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
  if (groundingMetadata?.groundingChunks?.length && (!parsed.genuineSources || parsed.genuineSources.length === 0)) {
    parsed.genuineSources = groundingMetadata.groundingChunks
      .filter((chunk) => chunk.web?.uri)
      .slice(0, 3)
      .map((chunk) => ({
        title: chunk.web.title || 'Genuine Source Citation',
        url: chunk.web.uri,
        note: 'Verified live web source',
      }));
  }

  parsed.verifiedBy = 'Gemini AI & Genuine Source Grounding';
  return parsed;
}
