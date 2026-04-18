// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — server.js
// All Express routes live here. Static files are served LAST.
// ─────────────────────────────────────────────────────────────────────────────
const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const FormData = require('form-data');
const fetch    = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware (before all routes) ───────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')
      ? cb(null, true)
      : cb(new Error(`Unsupported file type: ${file.mimetype}`)),
});

// ── /api/health ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ── /api/debug-key — tests the OpenAI key and server routing ─────────────────
app.post('/api/debug-key', async (req, res) => {
  const openaiKey = req.headers['x-openai-key'] || '';

  const result = {
    routing:    { ok: true,  message: 'API routing is working correctly ✓' },
    key_format: { ok: false, message: '' },
    key_valid:  { ok: false, message: '' },
    overall:    { ok: false, fix: '' },
  };

  if (!openaiKey) {
    result.key_format.message = 'No key received by server. The x-openai-key header is missing.';
    result.overall.fix = 'Type or paste your OpenAI API key into the input field. It must start with sk-';
    return res.json(result);
  }

  if (!openaiKey.startsWith('sk-')) {
    result.key_format.message = `Key format looks wrong. Got: "${openaiKey.slice(0, 10)}…". OpenAI keys start with sk-`;
    result.overall.fix = 'Copy your key from platform.openai.com → API Keys. Make sure there are no spaces.';
    return res.json(result);
  }

  result.key_format.ok = true;
  result.key_format.message = 'Key format is correct (starts with sk-) ✓';

  // Test key with a tiny real request
  try {
    const testRes = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${openaiKey}` },
    });

    if (testRes.status === 401) {
      result.key_valid.message = 'Key rejected by OpenAI (401 Unauthorized). Invalid or revoked key.';
      result.overall.fix = 'Go to platform.openai.com → API Keys → delete this key → create a new one and paste it fresh.';
      return res.json(result);
    }
    if (testRes.status === 429) {
      result.key_valid.ok = true;
      result.key_valid.message = 'Key is valid ✓ (rate limit hit, but that confirms the key works)';
      result.overall.ok = true;
      result.overall.fix = 'Wait 60 seconds then try again.';
      return res.json(result);
    }
    if (!testRes.ok) {
      const txt = await testRes.text();
      result.key_valid.message = `OpenAI returned ${testRes.status}: ${txt.slice(0, 150)}`;
      result.overall.fix = 'Unexpected error. Try generating a new API key at platform.openai.com.';
      return res.json(result);
    }

    result.key_valid.ok = true;
    result.key_valid.message = 'Key accepted by OpenAI ✓ — API is reachable and your key is valid';
    result.overall.ok = true;
    result.overall.fix = 'Everything looks good! You can now run your interview analysis.';
    return res.json(result);

  } catch (err) {
    result.key_valid.message = `Network error reaching OpenAI: ${err.message}`;
    result.overall.fix = 'The server could not reach api.openai.com. Check your Render network settings.';
    return res.json(result);
  }
});

// ── /api/transcribe — Whisper audio transcription ────────────────────────────
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const openaiKey = req.headers['x-openai-key'];
  if (!openaiKey) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Missing x-openai-key header' });
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname || 'interview.webm',
      contentType: req.file.mimetype,
    });
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');

    const wRes  = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, ...form.getHeaders() },
      body: form,
    });
    const wText = await wRes.text();
    if (!wRes.ok) throw new Error(`Whisper (${wRes.status}): ${wText}`);

    const wData = JSON.parse(wText);
    res.json({
      transcript: wData.text,
      segments:   wData.segments || [],
      duration:   wData.duration || 0,
    });
  } catch (err) {
    console.error('[transcribe]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// ── /api/analyze — GPT-4o-mini interview analysis ────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { transcript, jobRole = 'Software Engineer' } = req.body;
  const openaiKey = req.headers['x-openai-key'];

  if (!transcript?.trim()) return res.status(400).json({ error: 'No transcript provided' });
  if (!openaiKey)          return res.status(400).json({ error: 'Missing x-openai-key header' });

  const prompt = `Analyze this ${jobRole} interview transcript.

Transcript:
"""
${transcript}
"""

Rules:
- Base analysis ONLY on what was said in this transcript
- Count actual filler words present
- Reference specific things the candidate said
- Return ONLY valid JSON, no markdown fences

{
  "overall_score": <0-100>,
  "performance": {
    "clarity":    { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "confidence": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "relevance":  { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "depth":      { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "structure":  { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" }
  },
  "weaknesses": [
    { "type": "<weakness>", "severity": "<high/medium/low>", "description": "<specific>", "impact": "<hiring impact>" }
  ],
  "speech_patterns": {
    "filler_words": { "count": <integer>, "examples": ["<word>"], "frequency": "<X per minute>" },
    "pause_score": <0-100>,
    "pacing": "<too fast/optimal/too slow>",
    "confidence_drops": ["<specific moment>"]
  },
  "answer_breakdown": [
    { "question_type": "<Behavioral/Technical/Situational>", "quality": <0-100>, "issue": "<problem>", "suggestion": "<fix>" }
  ],
  "improvement_plan": [
    { "priority": <1-5>, "area": "<area>", "action": "<step>", "timeframe": "<timeframe>" }
  ],
  "hiring_probability": <0-100>,
  "summary": "<3-4 sentences about this specific candidate>"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a strict JSON generator. Return only valid JSON with no markdown fences, no explanation, nothing else.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`OpenAI (${response.status}): ${text}`);

    const data   = JSON.parse(text);
    const output = data.choices[0].message.content;  // standard chat completions response
    const clean  = output.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('GPT did not return valid JSON: ' + clean.slice(0, 200));
    }

    res.json(parsed);
  } catch (err) {
    console.error('[analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Static files — MUST be after all /api routes ─────────────────────────────
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
);

app.listen(PORT, () => console.log(`DebriefAI on port ${PORT}`));
