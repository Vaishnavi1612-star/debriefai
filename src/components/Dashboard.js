import React, { useState, useRef } from 'react';
import { Upload, Mic, FileText, ChevronRight, Zap, Target, TrendingUp } from 'lucide-react';
import { analyzeInterview, generateMockAnalysis } from '../services/claudeApi';
import './Dashboard.css';

const SAMPLE_TRANSCRIPT = `Interviewer: Tell me about yourself and your background.

Candidate: Um, so I've been working in software for about, uh, 4 years now. I mostly do backend stuff. I worked at a startup and, you know, we built some things. It was good experience I think.

Interviewer: Can you describe a challenging technical problem you solved?

Candidate: Yeah, so um... there was this one time where like the system was slow. We had to make it faster. I looked at the code and found some issues. I fixed them and it got better. The team was happy about that.

Interviewer: How do you handle disagreements with teammates?

Candidate: I try to, um, talk to them about it. I think communication is important. Usually we figure it out. I don't really like conflict so I try to avoid it if possible.

Interviewer: Walk me through how you'd design a URL shortener.

Candidate: Okay so... um... [long pause] ...you'd need a database. And like a way to generate short codes. There'd be a server that handles the redirects. I think you'd use Redis maybe? Or some caching thing. It's not too complicated.`;

export default function Dashboard({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) {
  const [transcript, setTranscript] = useState('');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [useAI, setUseAI] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setTranscript(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setError('Please paste a transcript or upload a file first.');
      return;
    }
    setError(null);
    setIsAnalyzing(true);

    try {
      let data;
      if (useAI) {
        data = await analyzeInterview(transcript, jobRole);
      } else {
        await new Promise((r) => setTimeout(r, 2800));
        data = generateMockAnalysis();
      }
      onAnalysisComplete(data);
    } catch (err) {
      setError(useAI ? 'AI analysis failed. Check API key or use Demo Mode.' : err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
    setFileName('sample_interview.txt');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-badge">
          <Zap size={12} />
          Post-Interview Intelligence
        </div>
        <h1 className="dashboard-title">Understand exactly<br />why you didn't get the offer.</h1>
        <p className="dashboard-subtitle">Upload or paste your interview transcript. Our AI breaks down every response, detects confidence drops, and builds you a targeted improvement plan.</p>
      </div>

      <div className="dashboard-grid">
        {/* Left: Input Panel */}
        <div className="input-panel">
          <div className="panel-section">
            <label className="panel-label">Job Role</label>
            <input
              className="role-input"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Software Engineer, Product Manager..."
            />
          </div>

          <div className="panel-section">
            <div className="panel-label-row">
              <label className="panel-label">Interview Transcript</label>
              <button className="sample-btn" onClick={loadSample}>Load Sample</button>
            </div>
            <div
              className={`drop-zone ${dragOver ? 'dragover' : ''} ${fileName ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
              <Upload size={22} className="drop-icon" />
              {fileName ? (
                <span className="drop-filename">{fileName}</span>
              ) : (
                <>
                  <span className="drop-text">Drop file or click to upload</span>
                  <span className="drop-hint">.txt, .pdf, .doc supported</span>
                </>
              )}
            </div>
          </div>

          <div className="panel-section">
            <label className="panel-label">Or paste transcript directly</label>
            <textarea
              className="transcript-input"
              placeholder="Paste your interview transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
            />
          </div>

          <div className="mode-toggle">
            <button
              className={`mode-btn ${!useAI ? 'active' : ''}`}
              onClick={() => setUseAI(false)}
            >
              Demo Mode
            </button>
            <button
              className={`mode-btn ${useAI ? 'active' : ''}`}
              onClick={() => setUseAI(true)}
            >
              AI Mode (API Key)
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            className={`analyze-btn ${isAnalyzing ? 'loading' : ''}`}
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <><span className="spinner" /> Analyzing Interview...</>
            ) : (
              <><Zap size={16} /> Analyze My Interview</>
            )}
          </button>
        </div>

        {/* Right: Feature Cards */}
        <div className="features-panel">
          <h3 className="features-title">What gets analyzed</h3>

          <div className="feature-card">
            <div className="feature-icon blue">
              <Mic size={18} />
            </div>
            <div>
              <div className="feature-name">Speech Pattern Analysis</div>
              <div className="feature-desc">Filler word frequency, pacing, hesitation moments, and confidence drops detected by voice modulation signals.</div>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon violet">
              <Target size={18} />
            </div>
            <div>
              <div className="feature-name">Answer Structure Scoring</div>
              <div className="feature-desc">Each response evaluated for clarity, depth, relevance, and STAR framework alignment against role expectations.</div>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon cyan">
              <FileText size={18} />
            </div>
            <div>
              <div className="feature-name">Weakness Impact Ranking</div>
              <div className="feature-desc">Identified gaps ranked by their actual impact on hiring decisions — so you fix what matters most first.</div>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon green">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="feature-name">Targeted Improvement Plan</div>
              <div className="feature-desc">Personalized action steps with timeframes so you walk into your next interview measurably better prepared.</div>
            </div>
          </div>

          <div className="cta-note">
            <ChevronRight size={14} />
            No interview recording required — just the transcript
          </div>
        </div>
      </div>
    </div>
  );
}
