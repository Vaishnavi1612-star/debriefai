import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, TrendingUp, MessageSquare, Mic, Target, ChevronDown, ChevronUp } from 'lucide-react';
import './AnalysisPage.css';

const ScoreBar = ({ label, score, color }) => {
  const getColor = () => {
    if (score >= 80) return '#10b981';
    if (score >= 65) return '#f59e0b';
    if (score >= 45) return '#f97316';
    return '#f43f5e';
  };

  const getLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Moderate';
    if (score >= 45) return 'Fair';
    return 'Low';
  };

  return (
    <div className="score-bar-item">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-badge" style={{ background: `${getColor()}22`, color: getColor() }}>
          {score}% {getLabel()}
        </span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, background: getColor() }}
        />
      </div>
    </div>
  );
};

const WeaknessBadge = ({ weakness }) => {
  const iconMap = {
    high: <AlertTriangle size={16} />,
    medium: <AlertCircle size={16} />,
    low: <Info size={16} />,
  };
  const colorMap = {
    high: { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.25)', color: '#f87171', icon: 'rgba(244,63,94,0.8)' },
    medium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#fbbf24', icon: 'rgba(245,158,11,0.8)' },
    low: { bg: 'rgba(79,142,247,0.1)', border: 'rgba(79,142,247,0.25)', color: '#93c5fd', icon: 'rgba(79,142,247,0.8)' },
  };
  const c = colorMap[weakness.severity];

  return (
    <div className="weakness-item" style={{ background: c.bg, borderColor: c.border }}>
      <div className="weakness-icon" style={{ color: c.icon }}>{iconMap[weakness.severity]}</div>
      <div className="weakness-content">
        <div className="weakness-type" style={{ color: c.color }}>{weakness.type}</div>
        <div className="weakness-desc">{weakness.description}</div>
        <div className="weakness-impact">⚡ {weakness.impact}</div>
      </div>
    </div>
  );
};

const ImprovementItem = ({ item }) => (
  <div className="improvement-item">
    <div className="improvement-priority">#{item.priority}</div>
    <div className="improvement-content">
      <div className="improvement-area">{item.area}</div>
      <div className="improvement-action">{item.action}</div>
      <div className="improvement-timeframe">🗓 {item.timeframe}</div>
    </div>
  </div>
);

export default function AnalysisPage({ data }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!data) {
    return (
      <div className="analysis-empty">
        <Target size={48} />
        <h2>No Analysis Yet</h2>
        <p>Go to Dashboard and analyze an interview first.</p>
      </div>
    );
  }

  const toggle = (section) => setExpandedSection(expandedSection === section ? null : section);

  const hiringColor = data.hiring_probability >= 60 ? '#10b981' : data.hiring_probability >= 35 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <div>
          <h1 className="analysis-title">Interview Analysis</h1>
          <p className="analysis-subtitle">{data.summary}</p>
        </div>
        <div className="overall-score-block">
          <div className="overall-label">Overall Score</div>
          <div className="overall-number" style={{ color: hiringColor }}>{data.overall_score}</div>
          <div className="overall-max">/100</div>
        </div>
      </div>

      {/* Hiring probability alert */}
      <div className="hiring-probability-bar" style={{ borderColor: `${hiringColor}40`, background: `${hiringColor}0d` }}>
        <div className="hp-left">
          <span style={{ color: hiringColor }}>Estimated Hiring Probability</span>
          <span className="hp-explanation">Based on answer quality, confidence signals, and role alignment</span>
        </div>
        <div className="hp-score" style={{ color: hiringColor }}>{data.hiring_probability}%</div>
      </div>

      <div className="analysis-grid">
        {/* Performance */}
        <div className="analysis-card">
          <div className="card-header" onClick={() => toggle('performance')}>
            <div className="card-title-row">
              <TrendingUp size={18} className="card-icon blue" />
              <h2 className="card-title">Performance Analysis</h2>
            </div>
            {expandedSection === 'performance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <div className="score-bars">
            {Object.entries(data.performance).map(([key, val]) => (
              <ScoreBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} score={val.score} />
            ))}
          </div>
          {expandedSection === 'performance' && (
            <div className="expanded-details">
              {Object.entries(data.performance).map(([key, val]) => (
                <div key={key} className="detail-item">
                  <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {val.details}
                </div>
              ))}
            </div>
          )}
          <button className="expand-btn" onClick={() => toggle('performance')}>
            {expandedSection === 'performance' ? 'Show Less' : 'View Details'}
          </button>
        </div>

        {/* Weaknesses */}
        <div className="analysis-card">
          <div className="card-header">
            <div className="card-title-row">
              <AlertTriangle size={18} className="card-icon red" />
              <h2 className="card-title">Detected Weaknesses</h2>
            </div>
            <span className="badge-count">{data.weaknesses.length}</span>
          </div>
          <div className="weaknesses-list">
            {data.weaknesses.map((w, i) => (
              <WeaknessBadge key={i} weakness={w} />
            ))}
          </div>
        </div>

        {/* Speech Patterns */}
        <div className="analysis-card">
          <div className="card-header">
            <div className="card-title-row">
              <Mic size={18} className="card-icon violet" />
              <h2 className="card-title">Speech Patterns</h2>
            </div>
          </div>
          <div className="speech-grid">
            <div className="speech-stat">
              <div className="speech-stat-value red">{data.speech_patterns.filler_words.count}</div>
              <div className="speech-stat-label">Filler Words</div>
              <div className="speech-stat-sub">{data.speech_patterns.filler_words.frequency}</div>
            </div>
            <div className="speech-stat">
              <div className="speech-stat-value amber">{data.speech_patterns.pause_score}</div>
              <div className="speech-stat-label">Pause Score</div>
              <div className="speech-stat-sub">0-100</div>
            </div>
            <div className="speech-stat">
              <div className="speech-stat-value cyan" style={{ fontSize: '14px', marginBottom: '4px' }}>{data.speech_patterns.pacing}</div>
              <div className="speech-stat-label">Pacing</div>
            </div>
          </div>
          <div className="speech-section">
            <div className="speech-section-title">Filler Words Detected</div>
            <div className="filler-tags">
              {data.speech_patterns.filler_words.examples.map((w, i) => (
                <span key={i} className="filler-tag">"{w}"</span>
              ))}
            </div>
          </div>
          <div className="speech-section">
            <div className="speech-section-title">Confidence Drops At</div>
            {data.speech_patterns.confidence_drops.map((d, i) => (
              <div key={i} className="confidence-drop-item">
                <span className="drop-bullet" /> {d}
              </div>
            ))}
          </div>
        </div>

        {/* Answer Breakdown */}
        <div className="analysis-card">
          <div className="card-header">
            <div className="card-title-row">
              <MessageSquare size={18} className="card-icon cyan" />
              <h2 className="card-title">Answer Breakdown</h2>
            </div>
          </div>
          <div className="answer-list">
            {data.answer_breakdown.map((item, i) => (
              <div key={i} className="answer-item">
                <div className="answer-top">
                  <span className="answer-type">{item.question_type}</span>
                  <span className="answer-quality" style={{ color: item.quality >= 65 ? '#10b981' : item.quality >= 45 ? '#f59e0b' : '#f43f5e' }}>
                    {item.quality}/100
                  </span>
                </div>
                <div className="answer-issue">⚠ {item.issue}</div>
                <div className="answer-suggestion">✦ {item.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Improvement Plan - full width */}
      <div className="analysis-card improvement-card">
        <div className="card-header">
          <div className="card-title-row">
            <CheckCircle size={18} className="card-icon green" />
            <h2 className="card-title">Your Improvement Plan</h2>
          </div>
          <span className="plan-sub">Ranked by hiring impact</span>
        </div>
        <div className="improvement-list">
          {data.improvement_plan.map((item, i) => (
            <ImprovementItem key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
