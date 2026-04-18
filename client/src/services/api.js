// API base (Render / local)
const API_BASE = process.env.REACT_APP_API_URL || '';

// Safe JSON handler
async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';

  if (ct.includes('text/html')) {
    throw new Error(
      `Server returned HTML instead of JSON (status ${res.status}). Check backend deployment.`
    );
  }

  return res.json();
}

// Health check
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return safeJson(res);
}

// Debug API key
export async function debugKey(claudeKey) {
  const res = await fetch(`${API_BASE}/api/debug-key`, {
    method: 'POST',
    headers: { 'x-claude-key': claudeKey },
  });

  return safeJson(res);
}

// Transcription (OpenAI Whisper)
export async function transcribeAudio(file, openaiKey) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'x-openai-key': openaiKey },
    body: formData,
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data.error || `Transcription failed (${res.status})`);
  }

  return data;
}

// 🔥 MAIN FIXED FUNCTION (ANALYSIS)
export async function analyzeTranscript(transcript, jobRole, claudeKey) {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Transcript is empty");
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-claude-key': claudeKey,
    },
    body: JSON.stringify({
      transcript,
      jobRole,
    }),
  });

  const data = await safeJson(res);

  // ❌ If backend failed → DO NOT reuse old result
  if (!res.ok) {
    throw new Error(data.error || `Analysis failed (${res.status})`);
  }

  // ✅ Ensure response is different per transcript
  if (!data || typeof data !== 'object') {
    throw new Error("Invalid analysis response");
  }

  return data;
}
