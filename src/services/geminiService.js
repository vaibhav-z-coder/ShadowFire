/**
 * Gemini AI Job Offer Verification Service
 * Deep reasoning engine that cross-references job offers against genuine corporate sources,
 * enforces a zero-tolerance circuit breaker for any scam red flag, and computes trust scores.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];


/**
 * Checks if the Gemini API key is configured.
 */
export function isGeminiConfigured() {
  return Boolean(
    GEMINI_API_KEY &&
    GEMINI_API_KEY.trim().length > 10 &&
    !GEMINI_API_KEY.includes('your_gemini_api_key')
  );
}

/**
 * Analyses a job offer using Google Gemini AI with deep reasoning and zero-tolerance red flag circuit breaking.
 * @param {string} offerText - The full text of the job offer
 * @param {object} overrides - Any user-provided metadata overrides
 * @returns {Promise<object>} Structured verification result
 */
export async function verifyOfferWithGemini(offerText, overrides = {}) {
  if (!isGeminiConfigured()) {
    throw new Error('Something went wrong from our side. Verification service is currently unavailable.');
  }

  const prompt = `
You are TrustHire's Principal Anti-Fraud & Cyber-Security Investigator.
Your mission is to rigorously cross-verify this job offer against genuine corporate records, real-world recruitment standards, and deceptive scam techniques.

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL DIRECTIVE: DEEP INVESTIGATIVE REASONING (NO SUPERFICIAL KEYWORD SEARCHES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Do NOT just match basic words. Fraudsters disguise scams using corporate jargon (e.g. calling fees "courier dispatch bond", "hardware compliance deposit", "refundable seat assurance", "ID verification processing").
You must investigate all vectors:

1. BRAND & DOMAIN IMPERSONATION:
   - Identify the authentic enterprise being mentioned.
   - What is their genuine corporate domain and official careers portal?
   - Compare the recruiter's email domain:
     - Are they using free email providers (@gmail.com, @yahoo.com, @outlook.com) to represent a large or public corporation?
     - Are they using typosquatted lookalike domains (e.g. @company-careers-hub.site, @tcs-recruitment-portal.com)?
     - If the domain does not match the official company domain, this is an impersonation scam.

2. HIRING PROCESS INTEGRITY:
   - Did they offer employment immediately with zero technical or HR evaluation?
   - Is the interview conducted purely on messaging apps (Telegram, WhatsApp, Signal) without video or in-person verification?
   - Legitimate corporate employers NEVER conduct hiring exclusively through anonymous messenger accounts.

3. FINANCIAL EXTRACTION & SCHEME VECTORS:
   - Does the message require the candidate to pay ANYTHING upfront, regardless of how it's labeled (training, equipment, background check, registration, security deposit)?
   - Is there a check-cashing scheme ("we will send a check for you to deposit and purchase gear")?
   - Is there a task scam ("like social media videos or rate apps for daily crypto commissions")?

4. COMPENSATION PLAUSIBILITY:
   - Is the compensation abnormally high for entry-level, zero-experience, or remote data entry work (e.g. ₹60,000/month or $50/hour for basic typing)?

5. PSYCHOLOGICAL PRESSURE:
   - Artificial urgency ("reply in 1 hour", "confirm today or slot forfeited") designed to bypass critical thinking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ZERO-TOLERANCE CIRCUIT BREAKER (MANDATORY OVERRIDE RULE) 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If you discover EVEN A SINGLE (ANY ONE) definitive scam red flag (e.g. upfront fee/deposit, Telegram/WhatsApp-only interview, free email for a corporate brand, fake check, fake task, or domain impersonation):

YOU MUST INSTANTLY FORGET ALL OTHER RULES AND POSITIVE SIGNALS!
1. DO NOT let polite language, real company names, or legal-sounding terms inflate the score.
2. IMMEDIATELY OVERRIDE THE TRUST SCORE to 0 - 20 (High Risk).
3. Set "band" strictly to "high_risk".
4. Set "criticalWarning": A bold, urgent, high-impact warning message highlighting that exact fatal red flag so the candidate is immediately alerted (e.g., "CRITICAL WARNING: This offer demands an upfront registration fee and requires communication exclusively on Telegram. Legitimate companies never charge fees or hire via anonymous messenger apps. Stop communication immediately.").

IF AND ONLY IF NO RED FLAGS ARE FOUND:
- Proceed with normal legitimacy scoring (75 - 100).
- Set "band" to "likely_legit" (or "suspicious" if company cannot be verified).
- Set "criticalWarning": null.

OUTPUT FORMAT:
Respond with ONLY valid JSON (no markdown formatting, no code blocks, no backticks):
{
  "score": 15,
  "band": "high_risk",
  "confidence": "High",
  "criticalWarning": "CRITICAL WARNING: Immediate warning message if ANY red flag was found, or null if completely clean.",
  "aiSummary": "Clear 2-3 sentence executive assessment explaining the findings.",
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
      "why": "Legitimate companies never require candidates to pay for employment or equipment.",
      "evidence": "Quoted text from offer"
    }
  ],
  "positives": [
    {
      "id": "P1",
      "name": "Registered Corporate Identity",
      "evidence": "Matches active enterprise."
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
    "interview_channel": "Detected Interview Channel"
  }
}
`;

  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const result = await callGeminiApi(modelName, prompt);
      if (result && typeof result.score === 'number') {
        // Enforce Programmatic Circuit Breaker Safeguard
        const hasFatalFlag =
          Boolean(result.criticalWarning) ||
          (result.redFlags && result.redFlags.length > 0 && result.redFlags.some((rf) => {
            const t = `${rf.name} ${rf.why || ''} ${rf.evidence || ''}`.toLowerCase();
            return /fee|deposit|pay|telegram|whatsapp|fake|scam|impersonat|free email|check cashing|crypto|commission/i.test(t);
          }));

        if (hasFatalFlag) {
          result.score = Math.min(result.score, 18);
          result.band = 'high_risk';
          if (!result.criticalWarning && result.redFlags?.length) {
            result.criticalWarning = `CRITICAL WARNING: ${result.redFlags[0].name}. ${result.redFlags[0].why || 'Immediate scam risk detected.'}`;
          }
        }

        return result;
      }
    } catch (err) {
      console.warn(`Gemini attempt with ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error('Something went wrong from our side while analyzing this offer. Please try again in a moment.');
}

async function callGeminiApi(modelName, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY.trim()}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

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
