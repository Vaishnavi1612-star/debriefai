const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const FormData = require('form-data');
const fetch   = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const app  = express();
const PORT = process.env.PORT || 5000;

/* ────────────────────────────────────────────────────────────────────────────
   MIDDLEWARE  (must come before every route)
──────────────────────────────────────────────────────────────────────────── */
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')
      ? cb(null, true)
      : cb(new Error(`Unsupported type: ${file.mimetype}`)),
});

/* ────────────────────────────────────────────────────────────────────────────
   /api/health  — basic ping
──────────────────────────────────────────────────────────────────────────── */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

/* ────────────────────────────────────────────────────────────────────────────
   /api/debug-key  — tests the Anthropic key directly and returns a detailed
   diagnostic so the frontend can show the user exactly what is wrong.
──────────────────────────────────────────────────────────────────────────── */
app.post('/api/debug-key', async (req, res) => {
  const claudeKey = req.headers['x-claude-key'] || '';
  const result = {
    routing:    { ok: true,  message: 'API routing is working correctly ✓' },
    key_format: { ok: false, message: '' },
    key_valid:  { ok: false, message: '' },
    overall:    { ok: false, fix: '' },
  };

  // 1. Check key received
  if (!claudeKey) {
    result.key_format.message = 'No key received by server. The key is not being sent in the x-claude-key header.';
    result.overall.fix = 'Make sure you typed your Anthropic key into the input field and it starts with sk-ant-';
    return res.json(result);
  }

  // 2. Check format
  if (!claudeKey.startsWith('sk-ant-')) {
    result.key_format.message = `Key format looks wrong. Received: "${claudeKey.slice(0, 12)}…". Anthropic keys always start with sk-ant-`;
    result.overall.fix = 'Copy your key directly from console.anthropic.com → API Keys. Make sure there are no extra spaces.';
    return res.json(result);
  }
  result.key_format.ok = true;
  result.key_format.message = `Key format looks correct (starts with sk-ant-) ✓`;

  // 3. Test the key against Claude API with a tiny request
  try {
    const testRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',   // cheapest model for validation
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
      }),
    });

    const raw = await testRes.text();

    if (testRes.status === 401) {
      result.key_valid.message = 'Key rejected by Anthropic (401 Unauthorized). The key is invalid or has been revoked.';
      result.overall.fix = 'Go to console.anthropic.com → API Keys → create a new key and paste it fresh.';
      return res.json(result);
    }

    if (testRes.status === 403) {
      result.key_valid.message = 'Key rejected (403 Forbidden). Your account may not have API access enabled yet.';
      result.overall.fix = 'Go to console.anthropic.com → Billing → add a payment method to activate API access.';
      return res.json(result);
    }

    if (testRes.status === 429) {
      // Rate limited but key is valid
      result.key_valid.ok = true;
      result.key_valid.message = 'Key is valid ✓ (rate limit hit but that confirms the key works)';
      result.overall.ok = true;
      result.overall.fix = 'Wait 60 seconds then try your analysis again.';
      return res.json(result);
    }

    if (!testRes.ok) {
      result.key_valid.message = `Anthropic returned status ${testRes.status}: ${raw.slice(0, 200)}`;
      result.overall.fix = 'Unexpected error from Anthropic. Try generating a new API key.';
      return res.json(result);
    }

    // Key is valid
    result.key_valid.ok = true;
    result.key_valid.message = 'Key accepted by Anthropic ✓ — Claude API is reachable and your key is valid';
    result.overall.ok = true;
    result.overall.fix = 'Everything looks good. You can now run your interview analysis.';
    return res.json(result);

  } catch (err) {
    result.key_valid.message = `Network error reaching Anthropic: ${err.message}`;
    result.overall.fix = 'The server could not reach api.anthropic.com. Check Render outbound network or try again.';
    return res.json(result);
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   /api/transcribe
──────────────────────────────────────────────────────────────────────────── */
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
    res.json({ transcript: wData.text, segments: wData.segments || [], duration: wData.duration || 0 });
  } catch (err) {
    console.error('[transcribe]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   /api/analyze
──────────────────────────────────────────────────────────────────────────── */
app.post('/api/analyze', async (req, res) => {
  const { transcript, jobRole = 'Software Engineer' } = req.body;
  const claudeKey = req.headers['x-claude-key'];

  if (!transcript?.trim()) return res.status(400).json({ error: 'No transcript provided' });
  if (!claudeKey)          return res.status(400).json({ error: 'Missing x-claude-key header' });

  const prompt = `You are an expert interview coach. Analyze this ${jobRole} interview transcript.

Transcript:
"""
${transcript}
"""

Analyze based ONLY on what was actually said above. Count real filler words. Reference specific answers.

Return ONLY raw JSON — no markdown fences, no explanation, just the JSON object:
{
  "overall_score": <0-100>,
  "performance": {
    "clarity":    { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<observation>" },
    "confidence": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<observation>" },
    "relevance":  { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<observation>" },
    "depth":      { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<observation>" },
    "structure":  { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<observation>" }
  },
  "weaknesses": [
    { "type": "<name>", "severity": "<high/medium/low>", "description": "<specific>", "impact": "<hiring impact>" }
  ],
  "speech_patterns": {
    "filler_words": { "count": <integer>, "examples": ["<word>"], "frequency": "<X per minute>" },
    "pause_score": <0-100>,
    "pacing": "<too fast/optimal/too slow>",
    "confidence_drops": ["<moment>"]
  },
  "answer_breakdown": [
    { "question_type": "<Behavioral/Technical/Situational>", "quality": <0-100>, "issue": "<problem>", "suggestion": "<fix>" }
  ],
  "improvement_plan": [
    { "priority": <1-5>, "area": "<area>", "action": "<specific step>", "timeframe": "<timeframe>" }
  ],
  "hiring_probability": <0-100>,
  "summary": "<3-4 sentences about this specific candidate>"
}`;

  try {
    const cRes  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const cText = await cRes.text();
    if (!cRes.ok) throw new Error(`Claude (${cRes.status}): ${cText}`);

    const cData       = JSON.parse(cText);
    const responseStr = cData.content.map((c) => c.text || '').join('');
    const clean       = responseStr.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error('Claude did not return valid JSON: ' + clean.slice(0, 300));
    }

    res.json(parsed);
  } catch (err) {
    console.error('[analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   STATIC FILES — must be AFTER all /api routes
──────────────────────────────────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
);

app.listen(PORT, () => console.log(`DebriefAI on port ${PORT}`));
