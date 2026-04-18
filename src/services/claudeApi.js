const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export async function analyzeInterview(transcript, jobRole = 'Software Engineer') {
  const prompt = `You are an expert interview coach and talent acquisition specialist. Analyze the following interview transcript for a ${jobRole} position.

Transcript:
"""
${transcript}
"""

Provide a comprehensive JSON analysis with EXACTLY this structure (no extra text, just valid JSON):
{
  "overall_score": <number 0-100>,
  "performance": {
    "clarity": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<2 sentence analysis>" },
    "confidence": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<2 sentence analysis>" },
    "relevance": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<2 sentence analysis>" },
    "depth": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<2 sentence analysis>" },
    "structure": { "score": <0-100>, "label": "<Poor/Fair/Moderate/Good/Excellent>", "details": "<2 sentence analysis>" }
  },
  "weaknesses": [
    { "type": "<weakness name>", "severity": "<high/medium/low>", "description": "<specific detail>", "impact": "<hiring impact>" }
  ],
  "speech_patterns": {
    "filler_words": { "count": <number>, "examples": ["<word>"], "frequency": "<per minute rate>" },
    "pause_score": <0-100>,
    "pacing": "<too fast/optimal/too slow>",
    "confidence_drops": ["<moment description>"]
  },
  "answer_breakdown": [
    { "question_type": "<Behavioral/Technical/Situational>", "quality": "<score 0-100>", "issue": "<main problem>", "suggestion": "<specific fix>" }
  ],
  "improvement_plan": [
    { "priority": <1-5>, "area": "<focus area>", "action": "<specific actionable step>", "timeframe": "<1 week/2 weeks/1 month>" }
  ],
  "hiring_probability": <0-100>,
  "summary": "<3-4 sentence executive summary of the interview performance>"
}`;

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content.map((c) => c.text || '').join('');

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error('Failed to parse analysis response');
  }
}

export function generateMockAnalysis() {
  return {
    overall_score: 61,
    performance: {
      clarity: { score: 58, label: 'Fair', details: 'Responses lacked clear structure and often trailed off without a definitive conclusion. Ideas were present but poorly organized.' },
      confidence: { score: 42, label: 'Low', details: 'Significant hesitation on technical questions, especially around system design. Voice modulation dropped noticeably during problem-solving segments.' },
      relevance: { score: 65, label: 'Moderate', details: 'Answers were on-topic but frequently missed the core of what the interviewer was probing for. Key competency signals were buried.' },
      depth: { score: 55, label: 'Fair', details: 'Surface-level answers dominated. Specific metrics, outcomes, and technical details were largely absent from responses.' },
      structure: { score: 48, label: 'Poor', details: 'No consistent framework like STAR was applied. Answers meandered without a clear beginning, middle, and end.' },
    },
    weaknesses: [
      { type: 'Filler Words', severity: 'high', description: '12 instances of "um", "uh", "like" detected', impact: 'Reduces perceived confidence and clarity significantly' },
      { type: 'Vague Responses', severity: 'high', description: 'Behavioral answers lacked specific outcomes or metrics', impact: 'Interviewer cannot assess actual impact or skill level' },
      { type: 'No Specific Examples', severity: 'medium', description: 'Generic statements used instead of concrete past experiences', impact: 'Fails to differentiate candidate from others' },
      { type: 'Hesitation on Technical Questions', severity: 'high', description: '4-7 second pauses before answering system design questions', impact: 'Signals lack of preparedness for core role requirements' },
      { type: 'Weak STAR Structure', severity: 'medium', description: 'Situation and Task well-described but Action/Result phases underdeveloped', impact: 'Leaves hiring decision on incomplete information' },
    ],
    speech_patterns: {
      filler_words: { count: 12, examples: ['um', 'uh', 'like', 'you know'], frequency: '2.4 per minute' },
      pause_score: 38,
      pacing: 'too fast',
      confidence_drops: [
        'When asked about system design scalability',
        'During the "tell me about a failure" question',
        'When discussing team conflict resolution',
      ],
    },
    answer_breakdown: [
      { question_type: 'Behavioral', quality: 55, issue: 'No quantifiable outcomes mentioned', suggestion: 'Add specific metrics: "reduced load time by 40%" not "made it faster"' },
      { question_type: 'Technical', quality: 47, issue: 'Long pauses and incomplete explanations on distributed systems', suggestion: 'Practice explaining CAP theorem and trade-offs aloud 3x per day' },
      { question_type: 'Situational', quality: 68, issue: 'Good scenario setup but weak resolution detail', suggestion: 'Always end situational answers with what you learned and would do differently' },
    ],
    improvement_plan: [
      { priority: 1, area: 'Filler Word Elimination', action: 'Record yourself answering 5 questions daily. Count fillers. Pause silently instead.', timeframe: '2 weeks' },
      { priority: 2, area: 'STAR Method Mastery', action: 'Write out 10 STAR stories for your top experiences. Time each to 90 seconds.', timeframe: '1 week' },
      { priority: 3, area: 'Technical Confidence', action: 'Do 3 system design mock interviews on Pramp or Interviewing.io this week.', timeframe: '1 week' },
      { priority: 4, area: 'Quantify Achievements', action: 'Revisit every past project — extract at least one metric (%, time, $) for each.', timeframe: '2 weeks' },
      { priority: 5, area: 'Pacing & Pausing', action: 'Slow down by 20%. Use deliberate 2-second pauses before answering to collect thoughts.', timeframe: '1 month' },
    ],
    hiring_probability: 28,
    summary: 'The candidate demonstrated relevant domain knowledge but struggled to communicate it effectively under interview conditions. Critical weaknesses in confidence presentation and answer structure significantly undermined otherwise solid technical foundations. With focused preparation on behavioral frameworks and filler word reduction, there is strong potential for improvement within 2–3 weeks of deliberate practice.',
  };
}
