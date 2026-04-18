import React, { useState, useRef } from 'react';
import { Upload, Mic, FileText, ChevronRight, Zap, Target, TrendingUp, Video, CheckCircle } from 'lucide-react';
import './Dashboard.css';

const SAMPLE_TRANSCRIPT = `Interviewer: Tell me about yourself and your background.

Candidate: Um, so I've been working in software for about, uh, 4 years now. I mostly do backend stuff. I worked at a startup and, you know, we built some things. It was good experience I think.

Interviewer: Can you describe a challenging technical problem you solved?

Candidate: Yeah, so um... there was this one time where like the system was slow. We had to make it faster. I looked at the code and found some issues. I fixed them and it got better. The team was happy about that.

Interviewer: How do you handle disagreements with teammates?

Candidate: I try to, um, talk to them about it. I think communication is important. Usually we figure it out. I don't really like conflict so I try to avoid it if possible.

Interviewer: Walk me through how you'd design a URL shortener.

Candidate: Okay so... um... [long pause] ...you'd need a database. And like a way to generate short codes. There'd be a server that handles the redirects. I think you'd use Redis maybe? Or some caching thing. It's not too complicated.`;

const STEPS = ['upload', 'transcribing', 'analyzing', 'done'];

export default function Dashboard({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) {
  const [mode, setMode] = useState('video'); // 'video' | 'text'
  const [videoFile, setVideoFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState('upload'); // upload | transcribing | analyzing | done
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleVideoFile = (file) => {
    if (!file) return;
    setVideoFile(file);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVideoFile(file);
  };

  const loadSample = () => {
    setMode('text');
    setTranscript(SAMPLE_TRANSCRIPT);
  };

  const handleAnalyze = async () => {
    setError(null);

    if (mode === 'video') {
      if (!videoFile) return setError('Please upload a video or audio file.');
      if (!openaiKey) return setError('OpenAI API key is required to transcribe video.');
      if (!claudeKey) return setError('Anthropic API key is required to analyze the transcript.');

      setIsAnalyzing(true);

      try {
        // Step 1: Transcribe
        setStep('transcribing');
        setProgress('Transcribing your interview with Whisper AI...');

        const formData = new FormData();
        formData.append('file', videoFile);

        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'x-api-key': openaiKey },
          body: formData,
        });

        if (!transcribeRes.ok) {
          const err = await transcribeRes.json();
          throw new Error(err.error || 'Transcription failed');
        }

        const { transcript: rawTranscript } = await transcribeRes.json();

        // Step 2: Analyze
        setStep('analyzing');
        setProgress('Analyzing your responses with Claude AI...');

        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
          },
          body: JSON.stringify({ transcript: rawTranscript, jobRole }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error || 'Analysis failed');
        }

        const data = await analyzeRes.json();
        setStep('done');
        setTimeout(() => onAnalysisComplete(data), 600);

      } catch (err) {
        setError(err.message);
        setStep('upload');
      } finally {
        setIsAnalyzing(false);
      }

    } else {
      // Text mode: analyze directly
      if (!transcript.trim()) return setError('Please paste a transcript first.');
      if (!claudeKey) return setError('Anthropic API key is required.');

      setIsAnalyzing(true);
      setStep('analyzing');
      setProgress('Analyzing your responses with Claude AI...');

      try {
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
          },
          body: JSON.stringify({ transcript, jobRole }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error || 'Analysis failed');
        }

        const data = await analyzeRes.json();
        setStep('done');
        setTimeout(() => onAnalysisComplete(data), 600);
      } catch (err) {
        setError(err.message);
        setStep('upload');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-badge"><Zap size={12} /> Post-Interview Intelligence</div>
        <h1 className="dashboard-title">Understand exactly<br />why you didn't get the offer.</h1>
        <p className="dashboard-subtitle">Upload your interview video or paste a transcript. Our AI breaks down every response, detects confidence drops, and builds you a targeted improvement plan.</p>
      </div>

      <div className="dashboard-grid">
        <div className="input-panel">

          {/* Mode toggle */}
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'video' ? 'active' : ''}`} onClick={() => setMode('video')}>
              <Video size={14} /> Video / Audio
            </button>
            <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
              <FileText size={14} /> Paste Transcript
            </button>
          </div>

          {/* Job Role */}
          <div className="panel-section">
            <label className="panel-label">Job Role</label>
            <input className="role-input" value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="e.g. Software Engineer, Product Manager..." />
          </div>

          {/* Video Upload */}
          {mode === 'video' && (
            <div className="panel-section">
              <label className="panel-label">Interview Recording</label>
              <div
                className={`drop-zone ${dragOver ? 'dragover' : ''} ${videoFile ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
              >
                <input ref={fileRef} type="file" accept="video/*,audio/*" style={{ display: 'none' }} onChange={(e) => handleVideoFile(e.target.files[0])} />
                {videoFile ? (
                  <>
                    <CheckCircle size={22} className="drop-icon green" />
                    <span className="drop-filename">{videoFile.name}</span>
                    <span className="drop-hint">{formatSize(videoFile.size)} · Click to change</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="drop-icon" />
                    <span className="drop-text">Drop video/audio or click to upload</span>
                    <span className="drop-hint">MP4, WebM, MOV, AVI, MP3, WAV · Max 200MB</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Text transcript */}
          {mode === 'text' && (
            <div className="panel-section">
              <div className="panel-label-row">
                <label className="panel-label">Interview Transcript</label>
                <button className="sample-btn" onClick={loadSample}>Load Sample</button>
              </div>
              <textarea
                className="transcript-input"
                placeholder="Paste your interview transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={9}
              />
            </div>
          )}

          {/* API Keys */}
          <div className="api-keys-section">
            <div className="api-keys-title">API Keys</div>
            {mode === 'video' && (
              <div className="panel-section">
                <label className="panel-label">OpenAI API Key <span className="key-purpose">(for Whisper transcription)</span></label>
                <input type="password" className="role-input" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
              </div>
            )}
            <div className="panel-section">
              <label className="panel-label">Anthropic API Key <span className="key-purpose">(for Claude analysis)</span></label>
              <input type="password" className="role-input" placeholder="sk-ant-api03-..." value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} />
            </div>
            <p className="key-note">Keys are sent directly to their respective APIs and never stored on our servers.</p>
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="progress-bar-wrap">
              <div className="progress-steps">
                {['Uploading', 'Transcribing', 'Analyzing', 'Done'].map((s, i) => {
                  const stepIndex = STEPS.indexOf(step);
                  const isActive = i === stepIndex;
                  const isDone = i < stepIndex;
                  return (
                    <div key={s} className={`progress-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      <div className="progress-dot" />
                      <span>{s}</span>
                    </div>
                  );
                })}
              </div>
              <p className="progress-msg">{progress}</p>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button className={`analyze-btn ${isAnalyzing ? 'loading' : ''}`} onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <><span className="spinner" /> {progress || 'Processing...'}</>
            ) : (
              <><Zap size={16} /> Analyze My Interview</>
            )}
          </button>
        </div>

        {/* Features */}
        <div className="features-panel">
          <h3 className="features-title">What gets analyzed</h3>
          {[
            { icon: <Mic size={18} />, color: 'blue', name: 'Speech Pattern Analysis', desc: 'Filler word detection, pacing, hesitation, and confidence drops from your spoken responses.' },
            { icon: <Target size={18} />, color: 'violet', name: 'Answer Structure Scoring', desc: 'Each response evaluated for clarity, depth, relevance, and STAR framework alignment.' },
            { icon: <FileText size={18} />, color: 'cyan', name: 'Weakness Impact Ranking', desc: 'Identified gaps ranked by their actual impact on hiring decisions.' },
            { icon: <TrendingUp size={18} />, color: 'green', name: 'Targeted Improvement Plan', desc: 'Personalized action steps so you walk into your next interview measurably better prepared.' },
          ].map((f) => (
            <div key={f.name} className="feature-card">
              <div className={`feature-icon ${f.color}`}>{f.icon}</div>
              <div>
                <div className="feature-name">{f.name}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
          <div className="cta-note"><ChevronRight size={14} /> Video is transcribed locally via Whisper — never stored</div>
        </div>
      </div>
    </div>
  );
}
