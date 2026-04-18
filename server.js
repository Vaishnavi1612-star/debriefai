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
app.use(express.json());

// Serve React build in production
app.use(express.static(path.join(__dirname, 'client/build')));

// Multer: store uploaded video temporarily
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video/audio files are allowed'));
  }
});

// ─── TRANSCRIBE ENDPOINT ─────────────────────────────────────────────────────
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Missing API key in x-api-key header' });
  }

  try {
    // Send to OpenAI Whisper for transcription
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname || 'interview.mp4',
      contentType: req.file.mimetype,
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error(`Whisper API error: ${err}`);
    }

    const whisperData = await whisperRes.json();
    res.json({
      transcript: whisperData.text,
      segments: whisperData.segments || [],
      duration: whisperData.duration || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // Always clean up temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// ─── ANALYZE ENDPOINT ────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { transcript, jobRole = 'Software Engineer' } = req.body;
  const apiKey = req.headers['x-api-key'];

  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' });

  const prompt = `You are an expert interview coach. Analyze this ${jobRole} interview transcript.

Transcript:
"""
${transcript}
"""

Return ONLY valid JSON (no markdown, no extra text):
{
  "overall_score": <0-100>,
  "performance": {
    "clarity": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<analysis>" },
    "confidence": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<analysis>" },
    "relevance": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<analysis>" },
    "depth": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<analysis>" },
    "structure": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<analysis>" }
  },
  "weaknesses": [
    { "type": "<name>", "severity": "<high/medium/low>", "description": "<detail>", "impact": "<hiring impact>" }
  ],
  "speech_patterns": {
    "filler_words": { "count": <number>, "examples": ["<word>"], "frequency": "<per minute>" },
    "pause_score": <0-100>,
    "pacing": "<too fast/optimal/too slow>",
    "confidence_drops": ["<moment>"]
  },
  "answer_breakdown": [
    { "question_type": "<Behavioral/Technical/Situational>", "quality": <0-100>, "issue": "<problem>", "suggestion": "<fix>" }
  ],
  "improvement_plan": [
    { "priority": <1-5>, "area": "<area>", "action": "<step>", "timeframe": "<timeframe>" }
  ],
  "hiring_probability": <0-100>,
  "summary": "<3-4 sentence summary>"
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
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content.map((c) => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => console.log(`DebriefAI server running on port ${PORT}`));
