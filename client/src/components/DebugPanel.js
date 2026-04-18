import React, { useState, useEffect } from 'react';
import { checkHealth, debugKey } from '../services/api';
import './DebugPanel.css';

const STATUS = { idle: 'idle', running: 'running', ok: 'ok', fail: 'fail' };

function Row({ label, status, message }) {
  const icon = {
    idle:    <span className="dp-icon idle">○</span>,
    running: <span className="dp-icon spin">◌</span>,
    ok:      <span className="dp-icon ok">✓</span>,
    fail:    <span className="dp-icon fail">✗</span>,
  }[status];

  return (
    <div className={`dp-row ${status}`}>
      {icon}
      <div className="dp-row-content">
        <span className="dp-row-label">{label}</span>
        {message && <span className="dp-row-msg">{message}</span>}
      </div>
    </div>
  );
}

export default function DebugPanel({ onClose }) {
  const [claudeKey, setClaudeKey] = useState('');
  const [rows, setRows] = useState({
    routing: { status: STATUS.idle, message: '' },
    format:  { status: STATUS.idle, message: '' },
    valid:   { status: STATUS.idle, message: '' },
  });
  const [fix, setFix]         = useState('');
  const [running, setRunning] = useState(false);
  const [allGood, setAllGood] = useState(false);

  const update = (key, patch) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const runDiagnostics = async () => {
    if (!claudeKey.trim()) { setFix('Enter your Anthropic API key above first.'); return; }
    setRunning(true);
    setAllGood(false);
    setFix('');
    setRows({
      routing: { status: STATUS.running, message: 'Checking server routing…' },
      format:  { status: STATUS.idle,    message: '' },
      valid:   { status: STATUS.idle,    message: '' },
    });

    // Step 1 — health check (routing)
    try {
      const h = await checkHealth();
      if (h.status === 'ok') {
        update('routing', { status: STATUS.ok, message: 'Server is reachable and /api routes are working ✓' });
      } else {
        throw new Error('Unexpected health response');
      }
    } catch (err) {
      update('routing', { status: STATUS.fail, message: err.message });
      setFix('The /api/health endpoint failed. Make sure Render is set to Web Service (not Static Site) and start command is "node server.js".');
      setRunning(false);
      return;
    }

    // Step 2 — key debug (format + validity)
    update('format', { status: STATUS.running, message: 'Checking key format…' });
    update('valid',  { status: STATUS.running, message: 'Connecting to Anthropic…' });

    try {
      const d = await debugKey(claudeKey.trim());

      update('routing', {
        status: d.routing.ok ? STATUS.ok : STATUS.fail,
        message: d.routing.message,
      });
      update('format', {
        status: d.key_format.ok ? STATUS.ok : STATUS.fail,
        message: d.key_format.message,
      });
      update('valid', {
        status: d.key_valid.ok ? STATUS.ok : STATUS.fail,
        message: d.key_valid.message,
      });

      setFix(d.overall.fix);
      setAllGood(d.overall.ok);
    } catch (err) {
      update('format', { status: STATUS.fail, message: err.message });
      update('valid',  { status: STATUS.fail, message: 'Could not complete check' });
      setFix('Network error. Make sure the Render deployment is live and try again.');
    }

    setRunning(false);
  };

  return (
    <div className="dp-overlay">
      <div className="dp-modal">
        <div className="dp-header">
          <div className="dp-title">🔍 API Key Diagnostics</div>
          <button className="dp-close" onClick={onClose}>✕</button>
        </div>

        <p className="dp-subtitle">
          This tool tests every layer — server routing, key format, and actual Anthropic connectivity — and tells you exactly what to fix.
        </p>

        <div className="dp-input-row">
          <input
            type="text"
            className="dp-key-input"
            placeholder="Paste your Anthropic API key: sk-ant-api03-…"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value.trim())}
            spellCheck={false}
          />
          <button
            className={`dp-run-btn ${running ? 'running' : ''}`}
            onClick={runDiagnostics}
            disabled={running}
          >
            {running ? 'Testing…' : 'Run Diagnostics'}
          </button>
        </div>

        <div className="dp-rows">
          <Row label="1. Server routing (/api/health)" {...rows.routing} />
          <Row label="2. API key format (starts with sk-ant-)" {...rows.format} />
          <Row label="3. Anthropic API connectivity (live test)" {...rows.valid} />
        </div>

        {fix && (
          <div className={`dp-fix ${allGood ? 'good' : 'bad'}`}>
            <div className="dp-fix-title">{allGood ? '✓ All checks passed' : '⚠ How to fix'}</div>
            <div className="dp-fix-body">{fix}</div>
          </div>
        )}

        {allGood && (
          <button className="dp-done-btn" onClick={onClose}>
            ✓ Key is working — close and analyze
          </button>
        )}

        <div className="dp-links">
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Get Anthropic key →</a>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Get OpenAI key →</a>
        </div>
      </div>
    </div>
  );
}
