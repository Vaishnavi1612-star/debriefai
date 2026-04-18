const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve React build in production
app.use(express.static(path.join(__dirname, 'client/build')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Multer config
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg',
    ];
    // Accept any video/* or audio/* even if mimetype slightly differs
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ─── TRANSCRIBE ───────────────────────────────────────────────────────────────
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Accept key from either header name for compatibility
  const apiKey = req.headers['x-openai-key'] || req.headers['x-api-key'];
  if (!apiKey) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Missing OpenAI API key. Send it as x-openai-key header.' });
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname || 'interview.webm',
      contentType: req.file.mimetype,
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, ...formData.getHeaders() },
      body: formData,
    });

    const whisperText = await whisperRes.text();
    if (!whisperRes.ok) throw new Error(`Whisper error (${whisperRes.status}): ${whisperText}`);

    const whisperData = JSON.parse(whisperText);
    res.json({
      transcript: whisperData.text,
      segments: whisperData.segments || [],
      duration: whisperData.duration || 0,
    });
  } catch (err) {
    console.error('Transcribe error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// ─── ANALYZE ──────────────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { transcript, jobRole = 'Software Engineer' } = req.body;
  // Accept key from either header name for compatibility
  const apiKey = req.headers['x-claude-key'] || req.headers['x-api-key'];

  if (!transcript || !transcript.trim()) return res.status(400).json({ error: 'No transcript provided' });
  if (!apiKey) return res.status(400).json({ error: 'Missing Anthropic API key. Send it as x-claude-key header.' });

  const prompt = `You are an expert interview coach and senior talent acquisition specialist with 15 years of experience at top tech companies.

Analyze this REAL interview transcript for a ${jobRole} position. Base your analysis ONLY on what is actually said in this specific transcript. Do NOT use generic or template responses.

Transcript:
"""
${transcript}
"""

Carefully read the transcript above and provide a detailed, specific analysis. Reference actual things the candidate said. Count actual filler words used. Identify the real weaknesses present.

Return ONLY valid JSON with no markdown, no code fences, no extra text:
{
  "overall_score": <integer 0-100 based on this specific transcript>,
  "performance": {
    "clarity": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation referencing what was actually said>" },
    "confidence": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "relevance": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "depth": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" },
    "structure": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<specific observation>" }
  },
  "weaknesses": [
    { "type": "<weakness name>", "severity": "<high/medium/low>", "description": "<specific detail from transcript>", "impact": "<hiring impact>" }
  ],
  "speech_patterns": {
    "filler_words": { "count": <actual count from transcript>, "examples": ["<actual words used>"], "frequency": "<per minute estimate>" },
    "pause_score": <0-100>,
    "pacing": "<too fast/optimal/too slow>",
    "confidence_drops": ["<specific moment from transcript>"]
  },
  "answer_breakdown": [
    { "question_type": "<Behavioral/Technical/Situational>", "quality": <0-100>, "issue": "<specific problem from answer>", "suggestion": "<specific actionable fix>" }
  ],
  "improvement_plan": [
    { "priority": <1-5>, "area": "<focus area>", "action": "<specific step>", "timeframe": "<1 week/2 weeks/1 month>" }
  ],
  "hiring_probability": <0-100>,
  "summary": "<3-4 sentences specifically about this candidate's performance based on what they said>"
}`;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 1, // required for claude-sonnet
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeText = await claudeRes.text();
    if (!claudeRes.ok) throw new Error(`Claude error (${claudeRes.status}): ${claudeText}`);

    const claudeData = JSON.parse(claudeText);
    const text = claudeData.content.map((c) => c.text || '').join('');
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Try to extract JSON from response
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Could not parse Claude response as JSON');
    }

    res.json(parsed);
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve React for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => console.log(`DebriefAI running on port ${PORT}`));
