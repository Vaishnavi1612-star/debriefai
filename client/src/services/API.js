// API_BASE is empty string in production (same origin — Express serves everything)
// In local dev set REACT_APP_API_URL=http://localhost:5000 in client/.env
const API_BASE = process.env.REACT_APP_API_URL || '';

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    throw new Error(
      `Server returned an HTML page instead of JSON (status ${res.status}). ` +
      `This means the /api route was not found. ` +
      `Make sure your Render deployment used "node server.js" as start command.`
    );
  }
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return safeJson(res);
}

export async function debugKey(claudeKey) {
  const res = await fetch(`${API_BASE}/api/debug-key`, {
    method: 'POST',
    headers: { 'x-claude-key': claudeKey },
  });
  return safeJson(res);
}

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

export async function analyzeTranscript(transcript, jobRole, claudeKey) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-claude-key': claudeKey,
    },
    body: JSON.stringify({ transcript, jobRole }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || `Analysis failed (${res.status})`);
  return data;
}
