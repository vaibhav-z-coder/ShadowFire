/**
 * API Client for Digital Trust Platform.
 * Connects frontend to the FastAPI backend detection pipeline.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TrustReportData {
  report_id: string;
  input_type: string;
  category: string;
  risk_level: 'safe' | 'low' | 'medium' | 'high';
  risk_level_display: string;
  risk_score: number;
  confidence: number;
  signals: string[];
  evidence: string[];
  explanation: string;
  recommendation: string;
  summary: string;
}

export async function analyzeText(text: string): Promise<TrustReportData> {
  const res = await fetch(`${API_BASE_URL}/analyze/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Failed to analyze text');
  }

  return res.json();
}

export async function analyzeUrl(url: string): Promise<TrustReportData> {
  const res = await fetch(`${API_BASE_URL}/analyze/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Failed to analyze URL');
  }

  return res.json();
}

export async function analyzeMedia(file: File, mediaType: 'image' | 'video' | 'audio'): Promise<TrustReportData> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/analyze/${mediaType}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || `Failed to analyze ${mediaType}`);
  }

  return res.json();
}
