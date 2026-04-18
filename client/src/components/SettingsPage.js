import React, { useState } from 'react';
import { Key, User, Bell, Shield, ChevronRight } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('John Doe');
  const [role, setRole] = useState('Software Engineer');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (apiKey) localStorage.setItem('claude_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account, API access, and preferences.</p>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-section-title">
            <Key size={16} /> API Configuration
          </div>
          <p className="settings-section-desc">
            Connect your Anthropic API key to enable real AI-powered analysis. Without it, Demo Mode uses pre-built sample data.
          </p>
          <div className="settings-field">
            <label className="settings-label">Anthropic API Key</label>
            <input
              type="password"
              className="settings-input"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <span className="settings-hint">Your key is stored only in your browser's local storage and never sent to our servers.</span>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">
            <User size={16} /> Profile
          </div>
          <div className="settings-field">
            <label className="settings-label">Display Name</label>
            <input className="settings-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-label">Target Role</label>
            <input className="settings-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" />
            <span className="settings-hint">Used as default role context in analysis prompts.</span>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">
            <Shield size={16} /> Privacy & Data
          </div>
          <div className="settings-privacy-item">
            <ChevronRight size={14} />
            <span>All transcript analysis happens via the Anthropic API — no data is stored on DebriefAI servers.</span>
          </div>
          <div className="settings-privacy-item">
            <ChevronRight size={14} />
            <span>Your API key is stored only in your local browser storage.</span>
          </div>
          <div className="settings-privacy-item">
            <ChevronRight size={14} />
            <span>You can clear all local data at any time by clearing browser storage.</span>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">
            <Bell size={16} /> About DebriefAI
          </div>
          <p className="settings-section-desc">
            DebriefAI is a hackathon project built to solve the post-interview feedback gap. Candidates walk out of failed interviews with no idea what went wrong. This tool changes that.
          </p>
          <div className="settings-version">v1.0.0 — Built with React + Claude AI</div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-save-btn" onClick={handleSave}>
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
