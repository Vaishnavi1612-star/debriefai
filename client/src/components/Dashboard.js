import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Mic, FileText, ChevronRight, Zap,
  Target, TrendingUp, Video, CheckCircle, Circle, Square
} from 'lucide-react';
import './Dashboard.css';

const STEPS = ['idle', 'transcribing', 'analyzing', 'done'];

// ─── LIVE RECORDER ───────────────────────────────────────────────────────────
function LiveRecorder({ onRecordingComplete }) {
  const [recState, setRecState] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => { clearInterval(timerRef.current); if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setAudioBlob(null); setAudioUrl(null); setSeconds(0);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob); setAudioUrl(url); setRecState('stopped');
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
      };

      mediaRecorder.start(200);
      setRecState('recording');
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert('Microphone access denied. Please allow microphone permission in your browser and try again.');
    }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && recState === 'recording') mediaRecorderRef.current.stop(); };

  const useRecording = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `live-interview-${Date.now()}.webm`, { type: 'audio/webm' });
      onRecordingComplete(file);
    }
  };

  const reRecord = () => { setRecState('idle'); setAudioBlob(null); setAudioUrl(null); setSeconds(0); };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="live-recorder">
      {recState === 'idle' && (
        <div className="rec-idle">
          <div className="rec-icon-ring"><Mic size={28} /></div>
          <p className="rec-hint">Click to record your live interview session via microphone</p>
          <button className="rec-start-btn" onClick={startRecording}>
            <Circle size={12} fill="currentColor" /> Start Recording
          </button>
        </div>
      )}
      {recState === 'recording' && (
        <div className="rec-active">
          <div className="rec-pulse-outer"><div className="rec-pulse-inner" /></div>
          <div className="rec-timer">{fmt(seconds)}</div>
          <p className="rec-live-label">🔴 Recording in progress…</p>
          <button className="rec-stop-btn" onClick={stopRecording}>
            <Square size={12} fill="currentColor" /> Stop Recording
          </button>
        </div>
      )}
      {recState === 'stopped' && (
        <div className="rec-done">
          <CheckCircle size={26} className="rec-check" />
          <p className="rec-done-label">Recording saved — {fmt(seconds)}</p>
          {audioUrl && <audio controls src={audioUrl} className="rec-playback" />}
          <div className="rec-actions">
            <button className="rec-use-btn" onClick={useRecording}><Zap size={13} /> Use This Recording</button>
            <button className="rec-redo-btn" onClick={reRecord}>Re-record</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export default function Dashboard({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) {
  const [mode, setMode] = useState('video');
  const [videoFile, setVideoFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleVideoFile = (file) => { setVideoFile(file); setError(null); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleVideoFile(f); };

  const runTranscribeAndAnalyze = async (file) => {
    setStep('transcribing');
    setProgressMsg('Transcribing audio with Whisper AI…');
    const formData = new FormData();
    formData.append('file', file);
    const tRes = await fetch('/api/transcribe', { method: 'POST', headers: { 'x-openai-key': openaiKey }, body: formData });
    if (!tRes.ok) { const e = await tRes.json(); throw new Error(e.error || 'Transcription failed. Check your OpenAI API key.'); }
    const { transcript: raw } = await tRes.json();
    if (!raw || !raw.trim()) throw new Error('Whisper returned an empty transcript. Is there speech in the recording?');

    setStep('analyzing');
    setProgressMsg('Analyzing responses with Claude AI…');
    const aRes = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-claude-key': claudeKey }, body: JSON.stringify({ transcript: raw, jobRole }) });
    if (!aRes.ok) { const e = await aRes.json(); throw new Error(e.error || 'Analysis failed. Check your Anthropic API key.'); }
    return await aRes.json();
  };

  const handleAnalyze = async () => {
    setError(null);
    if (mode === 'text') {
      if (!transcript.trim()) return setError('Please paste a transcript first.');
      if (!claudeKey.trim()) return setError('Anthropic API key is required.');
    } else {
      if (!videoFile) return setError(mode === 'live' ? 'Please record your interview first, then click "Use This Recording".' : 'Please upload a video or audio file.');
      if (!openaiKey.trim()) return setError('OpenAI API key is required for audio transcription.');
      if (!claudeKey.trim()) return setError('Anthropic API key is required for analysis.');
    }

    setIsAnalyzing(true);
    try {
      let data;
      if (mode === 'text') {
        setStep('analyzing'); setProgressMsg('Analyzing responses with Claude AI…');
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-claude-key': claudeKey }, body: JSON.stringify({ transcript, jobRole }) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Analysis failed. Check your Anthropic API key.'); }
        data = await res.json();
      } else {
        data = await runTranscribeAndAnalyze(videoFile);
      }
      setStep('done');
      setTimeout(() => { onAnalysisComplete(data); setStep('idle'); setProgressMsg(''); }, 700);
    } catch (err) {
      setError(err.message);
      setStep('idle'); setProgressMsg('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fmt = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-badge"><Zap size={12} /> Post-Interview Intelligence</div>
        <h1 className="dashboard-title">Understand exactly<br />why you didn't get the offer.</h1>
        <p className="dashboard-subtitle">Upload a recording, go live, or paste a transcript. Claude AI analyzes every response and builds your personalized improvement plan.</p>
      </div>

      <div className="dashboard-grid">
        <div className="input-panel">

          {/* Mode tabs */}
          <div className="mode-toggle three">
            <button className={`mode-btn ${mode === 'video' ? 'active' : ''}`} onClick={() => setMode('video')}><Video size={13} /> Upload</button>
            <button className={`mode-btn ${mode === 'live' ? 'active' : ''}`} onClick={() => setMode('live')}>
              <span className={`live-indicator ${mode === 'live' ? 'on' : ''}`} /> Live Record
            </button>
            <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}><FileText size={13} /> Transcript</button>
          </div>

          {/* Job Role */}
          <div className="panel-section">
            <label className="panel-label">Target Job Role</label>
            <input className="role-input" value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="e.g. Software Engineer, Product Manager…" />
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
                  <><CheckCircle size={22} className="drop-icon green" /><span className="drop-filename">{videoFile.name}</span><span className="drop-hint">{fmt(videoFile.size)} · Click to change</span></>
                ) : (
                  <><Upload size={22} className="drop-icon" /><span className="drop-text">Drop video/audio or click to upload</span><span className="drop-hint">MP4, WebM, MOV, MP3, WAV · Max 200MB</span></>
                )}
              </div>
            </div>
          )}

          {/* Live Record */}
          {mode === 'live' && (
            <div className="panel-section">
              <label className="panel-label">Live Interview Recording</label>
              <LiveRecorder onRecordingComplete={(file) => { setVideoFile(file); setError(null); }} />
              {videoFile && videoFile.name.startsWith('live-interview') && (
                <div className="live-ready-note"><CheckCircle size={13} /> Recording ready — click Analyze below</div>
              )}
            </div>
          )}

          {/* Text */}
          {mode === 'text' && (
            <div className="panel-section">
              <label className="panel-label">Interview Transcript</label>
              <textarea
                className="transcript-input"
                placeholder={"Paste your interview transcript here…\n\nFormat:\nInterviewer: Tell me about yourself.\nCandidate: …"}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
              />
            </div>
          )}

          {/* API Keys */}
          <div className="api-keys-section">
            <div className="api-keys-title">🔑 API Keys</div>
            {mode !== 'text' && (
              <div className="panel-section">
                <label className="panel-label">OpenAI Key <span className="key-purpose">— Whisper transcription</span></label>
                <input type="password" className="role-input" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
              </div>
            )}
            <div className="panel-section">
              <label className="panel-label">Anthropic Key <span className="key-purpose">— Claude analysis</span></label>
              <input type="password" className="role-input" placeholder="sk-ant-api03-..." value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} />
            </div>
            <p className="key-note">🔒 Keys go directly to OpenAI / Anthropic. Never stored on our servers.</p>
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="progress-bar-wrap">
              <div className="progress-steps">
                {['Uploading', 'Transcribing', 'Analyzing', 'Done'].map((label, i) => (
                  <div key={label} className={`progress-step ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}>
                    <div className="progress-dot" /><span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="progress-msg">{progressMsg}</p>
            </div>
          )}

          {error && <div className="error-msg">⚠ {error}</div>}

          <button className={`analyze-btn ${isAnalyzing ? 'loading' : ''}`} onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <><span className="spinner" /> {progressMsg || 'Processing…'}</> : <><Zap size={16} /> Analyze My Interview</>}
          </button>
        </div>

        {/* Features */}
        <div className="features-panel">
          <h3 className="features-title">What gets analyzed</h3>
          {[
            { icon: <Mic size={18} />, color: 'blue', name: 'Speech Pattern Analysis', desc: 'Filler words, pacing, hesitation, and confidence drops detected.' },
            { icon: <Target size={18} />, color: 'violet', name: 'Answer Structure Scoring', desc: 'Clarity, depth, relevance, and STAR alignment per response.' },
            { icon: <FileText size={18} />, color: 'cyan', name: 'Weakness Impact Ranking', desc: 'Gaps ranked by actual impact on the hiring decision.' },
            { icon: <TrendingUp size={18} />, color: 'green', name: 'Targeted Improvement Plan', desc: 'Action steps with timeframes so your next interview goes better.' },
          ].map((f) => (
            <div key={f.name} className="feature-card">
              <div className={`feature-icon ${f.color}`}>{f.icon}</div>
              <div><div className="feature-name">{f.name}</div><div className="feature-desc">{f.desc}</div></div>
            </div>
          ))}
          <div className="cta-note"><ChevronRight size={14} /> Every analysis is unique — powered by real Claude AI</div>
        </div>
      </div>
    </div>
  );
}
