import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Mic, FileText, ChevronRight, Zap,
  Target, TrendingUp, Video, CheckCircle, Circle, Square, AlertCircle
} from 'lucide-react';
import { transcribeAudio, analyzeTranscript } from '../services/api';
import DebugPanel from './DebugPanel';
import './Dashboard.css';

const STEPS = ['idle', 'transcribing', 'analyzing', 'done'];

/* ── LIVE RECORDER ────────────────────────────────────────────────────────── */
function LiveRecorder({ onRecordingComplete }) {
  const [recState, setRecState] = useState('idle');
  const [seconds,  setSeconds]  = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl,  setAudioUrl]  = useState(null);
  const mrRef    = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setAudioBlob(null); setAudioUrl(null); setSeconds(0);

      const opts = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
      const mr   = new MediaRecorder(stream, opts);
      mrRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setAudioBlob(blob); setAudioUrl(url); setRecState('stopped');
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
      };

      mr.start(200);
      setRecState('recording');
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert('Microphone access denied. Click the 🔒 lock icon in your browser address bar and allow microphone access.');
    }
  };

  const stopRecording = () => { if (mrRef.current && recState === 'recording') mrRef.current.stop(); };
  const reRecord      = () => { setRecState('idle'); setAudioBlob(null); setAudioUrl(null); setSeconds(0); };
  const useRecording  = () => {
    if (!audioBlob) return;
    const ext  = audioBlob.type.includes('webm') ? 'webm' : 'mp4';
    const file = new File([audioBlob], `live-interview-${Date.now()}.${ext}`, { type: audioBlob.type });
    onRecordingComplete(file);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  return (
    <div className="live-recorder">
      {recState === 'idle' && (
        <div className="rec-idle">
          <div className="rec-icon-ring"><Mic size={28} /></div>
          <p className="rec-hint">Record your live interview via microphone</p>
          <button className="rec-start-btn" onClick={startRecording}>
            <Circle size={12} fill="currentColor" /> Start Recording
          </button>
        </div>
      )}
      {recState === 'recording' && (
        <div className="rec-active">
          <div className="rec-pulse-outer"><div className="rec-pulse-inner" /></div>
          <div className="rec-timer">{fmt(seconds)}</div>
          <p className="rec-live-label">🔴 Recording live…</p>
          <button className="rec-stop-btn" onClick={stopRecording}>
            <Square size={12} fill="currentColor" /> Stop
          </button>
        </div>
      )}
      {recState === 'stopped' && (
        <div className="rec-done">
          <CheckCircle size={26} className="rec-check" />
          <p className="rec-done-label">Saved — {fmt(seconds)}</p>
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

/* ── DASHBOARD ────────────────────────────────────────────────────────────── */
export default function Dashboard({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }) {
  const [mode,       setMode]       = useState('text');
  const [videoFile,  setVideoFile]  = useState(null);
  const [transcript, setTranscript] = useState('');
  const [jobRole,    setJobRole]    = useState('Software Engineer');
  const [openaiKey,  setOpenaiKey]  = useState('');
  const [claudeKey,  setClaudeKey]  = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [step,       setStep]       = useState('idle');
  const [progressMsg,setProgressMsg]= useState('');
  const [error,      setError]      = useState(null);
  const [showDebug,  setShowDebug]  = useState(false);
  const fileRef = useRef();

  const handleVideoFile = (f) => { setVideoFile(f); setError(null); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleVideoFile(f); };

  const handleAnalyze = async () => {
    setError(null);
    if (!claudeKey.trim())      return setError('Anthropic API key is required. Use the "Debug API Key" button to test it.');
    if (mode === 'text' && !transcript.trim()) return setError('Please paste a transcript first.');
    if (mode !== 'text' && !videoFile)         return setError(mode === 'live' ? 'Record first, then click "Use This Recording".' : 'Please upload a file.');
    if (mode !== 'text' && !openaiKey.trim())  return setError('OpenAI API key is required for audio transcription.');

    setIsAnalyzing(true);
    try {
      let finalTranscript = transcript;

      if (mode !== 'text') {
        setStep('transcribing'); setProgressMsg('Transcribing audio with Whisper AI…');
        const r = await transcribeAudio(videoFile, openaiKey);
        finalTranscript = r.transcript;
        if (!finalTranscript?.trim()) throw new Error('Whisper returned an empty transcript. Is there speech in the recording?');
      }

      setStep('analyzing'); setProgressMsg('Analyzing responses with Claude AI…');
      const data = await analyzeTranscript(finalTranscript, jobRole, claudeKey);

      setStep('done'); setProgressMsg('Analysis complete!');
      setTimeout(() => { onAnalysisComplete(data); setStep('idle'); setProgressMsg(''); }, 800);
    } catch (err) {
      setError(err.message);
      setStep('idle'); setProgressMsg('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fmt = (b) => b < 1024*1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`;
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="dashboard">
      {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}

      <div className="dashboard-header">
        <div className="header-badge"><Zap size={12} /> Post-Interview Intelligence</div>
        <h1 className="dashboard-title">Understand exactly<br />why you didn't get the offer.</h1>
        <p className="dashboard-subtitle">Upload a recording, go live, or paste a transcript. Claude AI analyzes every response and builds your improvement plan.</p>
      </div>

      <div className="dashboard-grid">
        <div className="input-panel">

          {/* Mode tabs */}
          <div className="mode-toggle three">
            <button className={`mode-btn ${mode==='text'  ?'active':''}`} onClick={()=>setMode('text')}>
              <FileText size={13} /> Transcript
            </button>
            <button className={`mode-btn ${mode==='video' ?'active':''}`} onClick={()=>setMode('video')}>
              <Video size={13} /> Upload
            </button>
            <button className={`mode-btn ${mode==='live'  ?'active':''}`} onClick={()=>setMode('live')}>
              <span className={`live-indicator ${mode==='live'?'on':''}`} /> Live Record
            </button>
          </div>

          {/* Job role */}
          <div className="panel-section">
            <label className="panel-label">Target Job Role</label>
            <input className="role-input" value={jobRole} onChange={(e)=>setJobRole(e.target.value)} placeholder="e.g. Software Engineer, Product Manager…" />
          </div>

          {/* Text mode */}
          {mode === 'text' && (
            <div className="panel-section">
              <label className="panel-label">Interview Transcript</label>
              <textarea
                className="transcript-input"
                placeholder={"Paste your interview transcript here…\n\nExample:\nInterviewer: Tell me about yourself.\nCandidate: I have been working in software for…"}
                value={transcript}
                onChange={(e)=>setTranscript(e.target.value)}
                rows={11}
              />
            </div>
          )}

          {/* Video upload */}
          {mode === 'video' && (
            <div className="panel-section">
              <label className="panel-label">Interview Recording</label>
              <div
                className={`drop-zone ${dragOver?'dragover':''} ${videoFile?'has-file':''}`}
                onDragOver={(e)=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={handleDrop}
                onClick={()=>fileRef.current.click()}
              >
                <input ref={fileRef} type="file" accept="video/*,audio/*" style={{display:'none'}} onChange={(e)=>handleVideoFile(e.target.files[0])} />
                {videoFile ? (
                  <><CheckCircle size={22} className="drop-icon green"/><span className="drop-filename">{videoFile.name}</span><span className="drop-hint">{fmt(videoFile.size)} · Click to change</span></>
                ) : (
                  <><Upload size={22} className="drop-icon"/><span className="drop-text">Drop video/audio or click to upload</span><span className="drop-hint">MP4, WebM, MOV, MP3, WAV · Max 200MB</span></>
                )}
              </div>
            </div>
          )}

          {/* Live record */}
          {mode === 'live' && (
            <div className="panel-section">
              <label className="panel-label">Live Interview Recording</label>
              <LiveRecorder onRecordingComplete={(f)=>{setVideoFile(f);setError(null);}} />
              {videoFile?.name?.startsWith('live-interview') && (
                <div className="live-ready-note"><CheckCircle size={13}/> Recording ready — click Analyze below</div>
              )}
            </div>
          )}

          {/* API Keys */}
          <div className="api-keys-section">
            <div className="api-keys-title-row">
              <span className="api-keys-title">🔑 API Keys</span>
              <button className="debug-btn" onClick={()=>setShowDebug(true)}>
                <AlertCircle size={13}/> Debug API Key
              </button>
            </div>

            <div className="panel-section">
              <label className="panel-label">Anthropic API Key <span className="key-purpose">— Claude analysis (required)</span></label>
              <input type="password" className="role-input" placeholder="sk-ant-api03-…" value={claudeKey} onChange={(e)=>setClaudeKey(e.target.value)} />
            </div>

            {mode !== 'text' && (
              <div className="panel-section">
                <label className="panel-label">OpenAI API Key <span className="key-purpose">— Whisper transcription (audio/video only)</span></label>
                <input type="password" className="role-input" placeholder="sk-…" value={openaiKey} onChange={(e)=>setOpenaiKey(e.target.value)} />
              </div>
            )}

            <p className="key-note">🔒 Keys sent directly to Anthropic/OpenAI. Never stored on our servers.</p>
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="progress-bar-wrap">
              <div className="progress-steps">
                {['Idle','Transcribing','Analyzing','Done'].map((label,i)=>(
                  <div key={label} className={`progress-step ${i===stepIndex?'active':''} ${i<stepIndex?'done':''}`}>
                    <div className="progress-dot"/><span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="progress-msg">{progressMsg}</p>
            </div>
          )}

          {error && (
            <div className="error-msg">
              ⚠ {error}
              {error.toLowerCase().includes('key') && (
                <button className="error-debug-link" onClick={()=>setShowDebug(true)}>→ Run API Key Diagnostics</button>
              )}
            </div>
          )}

          <button className={`analyze-btn ${isAnalyzing?'loading':''}`} onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <><span className="spinner"/> {progressMsg||'Processing…'}</> : <><Zap size={16}/> Analyze My Interview</>}
          </button>
        </div>

        {/* Sidebar */}
        <div className="features-panel">
          <h3 className="features-title">What gets analyzed</h3>
          {[
            {icon:<Mic size={18}/>,      color:'blue',   name:'Speech Pattern Analysis', desc:'Filler words, pacing, hesitation, and confidence drops detected from your responses.'},
            {icon:<Target size={18}/>,   color:'violet', name:'Answer Structure Scoring',desc:'Clarity, depth, relevance, and STAR alignment evaluated per response.'},
            {icon:<FileText size={18}/>, color:'cyan',   name:'Weakness Impact Ranking', desc:'Gaps ranked by actual impact on the hiring decision.'},
            {icon:<TrendingUp size={18}/>,color:'green', name:'Improvement Plan',        desc:'Prioritized action steps with timeframes for your next interview.'},
          ].map((f)=>(
            <div key={f.name} className="feature-card">
              <div className={`feature-icon ${f.color}`}>{f.icon}</div>
              <div><div className="feature-name">{f.name}</div><div className="feature-desc">{f.desc}</div></div>
            </div>
          ))}
          <div className="cta-note"><ChevronRight size={14}/> Every analysis is unique — powered by real Claude AI</div>
        </div>
      </div>
    </div>
  );
}
