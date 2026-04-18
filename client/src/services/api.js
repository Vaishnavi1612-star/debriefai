app.post('/api/analyze', async (req, res) => {
  const { transcript, jobRole = 'Software Engineer' } = req.body;
  const openaiKey = req.headers['x-openai-key'];

  if (!transcript?.trim()) {
    return res.status(400).json({ error: 'No transcript provided' });
  }

  if (!openaiKey) {
    return res.status(400).json({ error: 'Missing x-openai-key header' });
  }

  const prompt = `
Analyze this ${jobRole} interview transcript.

Transcript:
"""
${transcript}
"""

Rules:
- Use ONLY this transcript
- Do NOT give generic answers
- Output MUST be different for different transcripts
- Return ONLY JSON

{
  "overall_score": <0-100>,
  "performance": {
    "clarity": { "score": <0-100>, "label": "", "details": "" },
    "confidence": { "score": <0-100>, "label": "", "details": "" },
    "relevance": { "score": <0-100>, "label": "", "details": "" },
    "depth": { "score": <0-100>, "label": "", "details": "" },
    "structure": { "score": <0-100>, "label": "", "details": "" }
  },
  "weaknesses": [
    { "type": "", "severity": "", "description": "", "impact": "" }
  ],
  "speech_patterns": {
    "filler_words": { "count": <number>, "examples": [""] },
    "pause_score": <0-100>,
    "pacing": "",
    "confidence_drops": [""]
  },
  "answer_breakdown": [
    { "question_type": "", "quality": <0-100>, "issue": "", "suggestion": "" }
  ],
  "improvement_plan": [
    { "priority": <1-5>, "area": "", "action": "", "timeframe": "" }
  ],
  "hiring_probability": <0-100>,
  "summary": ""
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        input: [
          {
            role: 'system',
            content: 'You are a strict JSON generator. Only return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`OpenAI (${response.status}): ${text}`);
    }

    const data = JSON.parse(text);

    // ✅ correct extraction for new API
    const output = data.output[0].content[0].text;

    let clean = output.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Invalid JSON from OpenAI');
    }

    res.json(parsed);

  } catch (err) {
    console.error('[analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});
