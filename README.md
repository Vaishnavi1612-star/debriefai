# DebriefAI 🎯 — Video Interview Analyzer

Upload your interview video → get transcribed by Whisper → analyzed by Claude AI → receive a precise breakdown of what went wrong.

---

## Project Structure

```
debriefai/
├── server.js              ← Express backend (transcription + analysis)
├── package.json           ← Backend dependencies
├── .gitignore
└── client/                ← React frontend
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js / App.css
        └── components/
            ├── Navbar.js / .css
            ├── Dashboard.js / .css
            ├── AnalysisPage.js / .css
            ├── ReportsPage.js / .css
            └── SettingsPage.js / .css
```

---

## API Keys Needed

| Key | Where to Get | Used For |
|-----|-------------|----------|
| OpenAI API Key | platform.openai.com | Whisper audio transcription |
| Anthropic API Key | console.anthropic.com | Claude interview analysis |

Users enter these directly in the app UI — keys are never stored on the server.

---

## Local Development

```bash
# Install backend deps
npm install

# Install frontend deps
cd client && npm install && cd ..

# Run backend (port 5000)
node server.js

# In another terminal — run frontend (port 3000)
cd client && npm start
```

---

## Deploy on Render (Web Service)

1. Push entire repo to GitHub
2. Go to **render.com → New → Web Service**
3. Connect your GitHub repo
4. Set:
   - **Environment:** `Node`
   - **Build Command:** `npm install && cd client && npm install && npm run build`
   - **Start Command:** `node server.js`
5. Click **Deploy**

> ⚠️ Use **Web Service** (not Static Site) because the backend handles video uploads.

---

## How Video Analysis Works

```
User uploads video/audio
        ↓
POST /api/transcribe  →  OpenAI Whisper API  →  returns transcript text
        ↓
POST /api/analyze  →  Anthropic Claude API  →  returns full JSON analysis
        ↓
Frontend renders Analysis Dashboard
```

---

## Supported File Formats

Video: MP4, WebM, MOV, AVI  
Audio: MP3, WAV, M4A, WebM Audio  
Max size: 200MB

---

Built for Hackathon · React + Express + Whisper + Claude AI
