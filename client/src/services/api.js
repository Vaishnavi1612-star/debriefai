// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND API SERVICE
// This file ONLY contains fetch() calls to the backend.
// Do NOT put any Express/Node code here (no app.post, no require, no fs).
// ─────────────────────────────────────────────────────────────────────────────

// Empty string = same origin in production on Render (correct).
// For local dev: create client/.env with REACT_APP_API_URL=http://localhost:5000
const API_BASE = process.env.REACT_APP_API_URL || '';

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    throw new Error(
      `Server returned HTML instead of JSON (status ${res.status}). ` +
      `The /api route was not found. ` +
      `On Render: make sure Type = Web Service and Start Command = "node server.js".`
    );
  }
  return res.json();
}

// Test server routing + OpenAI key validity
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return safeJson(res);
}

export async function debugKey(openaiKey) {
  const res = await fetch(`${API_BASE}/api/debug-key`, {
    method: 'POST',
    headers: { 'x-openai-key': openaiKey },
  });
  return safeJson(res);
}

// Transcribe audio/video via Whisper
export async function transcribeAudio(file, openaiKey) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'x-openai-key': openaiKey },
    body: formData,
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status})`);
  return data;
}

// Analyze transcript via GPT-4o-mini
export async function analyzeTranscript(transcript, jobRole, openaiKey) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-openai-key': openaiKey,
    },
    body: JSON.stringify({ transcript, jobRole }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || `Analysis failed (${res.status})`);
  return data;
}
