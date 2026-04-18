# DebriefAI 🎯

> **Post-interview intelligence platform** — understand exactly why you didn't get the offer.

Candidates walk out of failed interviews with no feedback. DebriefAI analyzes your interview transcript to give you a precise breakdown of what went wrong and how to fix it.

## Features

- **Speech Pattern Analysis** — filler word detection, pacing, hesitation moments
- **Answer Structure Scoring** — clarity, depth, relevance, STAR framework alignment
- **Weakness Impact Ranking** — gaps ranked by actual hiring decision impact
- **Confidence Drop Detection** — identifies the exact moments you lost the interviewer
- **Targeted Improvement Plan** — prioritized action steps with timeframes
- **Hiring Probability Score** — estimated likelihood based on your performance

## Demo

Try it with the built-in sample transcript — no API key required (Demo Mode).

## Setup

### Local Development

```bash
git clone https://github.com/yourusername/debriefai.git
cd debriefai
npm install
npm start
```

### AI Mode (Optional)

To enable real Claude AI analysis:
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Go to Settings in the app and paste your key
3. Switch to "AI Mode" on the Dashboard

### Deploying to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Static Site
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
5. Click **Deploy**

That's it — no environment variables needed for Demo Mode.

## Tech Stack

- **React 18** — Frontend framework
- **Lucide React** — Icons
- **Claude API (claude-sonnet-4-20250514)** — AI analysis engine
- **Google Fonts (Syne + DM Sans)** — Typography

## Project Structure

```
src/
├── components/
│   ├── Navbar.js / .css
│   ├── Dashboard.js / .css       ← Upload + input
│   ├── AnalysisPage.js / .css    ← Full breakdown results
│   ├── ReportsPage.js / .css     ← History & stats
│   └── SettingsPage.js / .css    ← API key & profile
├── services/
│   └── claudeApi.js              ← API calls + mock data
├── App.js / .css
├── index.js
└── index.css
```

## Hackathon

Built for [Hackathon Name] — solving the post-interview feedback gap.

**Problem:** Candidates repeat the same mistakes across every interview because they never know what actually went wrong.

**Solution:** Upload your transcript → get a data-driven debrief → improve before your next interview.

---

Made with ❤️ using React + Claude AI
