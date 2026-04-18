import React from 'react';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import './ReportPage.css';

const mockHistory = [
  { id: 1, role: 'Senior Frontend Engineer', date: 'Apr 15, 2026', score: 61, probability: 28, status: 'analyzed' },
  { id: 2, role: 'Product Manager', date: 'Apr 10, 2026', score: 74, probability: 52, status: 'analyzed' },
  { id: 3, role: 'Full Stack Developer', date: 'Mar 28, 2026', score: 83, probability: 71, status: 'analyzed' },
];

export default function ReportPage({ analysisData }) {
  const report = analysisData
    ? [{ id: 0, role: 'Latest Analysis', date: 'Today', score: analysisData.overall_score, probability: analysisData.hiring_probability, status: 'analyzed' }, ...mockHistory]
    : mockHistory;

  return (
    <div className="report-page">
      <div className="report-header">
        <h1 className="report-title">Interview Report</h1>
        <p className="report-subtitle">Track your progress across all analyzed interviews.</p>
      </div>

      <div className="report-stats">
        <div className="report-stat-card">
          <div className="rsc-value">{report.length}</div>
          <div className="rsc-label">Total Interviews</div>
        </div>
        <div className="report-stat-card">
          <div className="rsc-value">{Math.round(report.reduce((a, r) => a + r.score, 0) / report.length)}</div>
          <div className="rsc-label">Avg Score</div>
        </div>
        <div className="report-stat-card">
          <div className="rsc-value" style={{ color: '#10b981' }}>{Math.max(...report.map(r => r.score))}</div>
          <div className="rsc-label">Best Score</div>
        </div>
        <div className="report-stat-card">
          <div className="rsc-value" style={{ color: '#f59e0b' }}>{Math.round(report.reduce((a, r) => a + r.probability, 0) / report.length)}%</div>
          <div className="rsc-label">Avg Hire Prob.</div>
        </div>
      </div>

      <div className="report-list">
        {report.map((report) => (
          <div key={report.id} className="report-row">
            <div className="report-icon-col">
              <div className="report-icon"><FileText size={18} /></div>
            </div>
            <div className="report-info">
              <div className="report-role">{report.role}</div>
              <div className="report-meta">
                <Calendar size={12} /> {report.date}
              </div>
            </div>
            <div className="report-scores">
              <div className="report-score-item">
                <span className="report-score-label">Score</span>
                <span className="report-score-val" style={{ color: report.score >= 75 ? '#10b981' : report.score >= 55 ? '#f59e0b' : '#f43f5e' }}>
                  {report.score}/100
                </span>
              </div>
              <div className="report-score-item">
                <span className="report-score-label">Hire Prob.</span>
                <span className="report-score-val" style={{ color: report.probability >= 50 ? '#10b981' : report.probability >= 30 ? '#f59e0b' : '#f43f5e' }}>
                  {report.probability}%
                </span>
              </div>
            </div>
            <button className="report-download-btn">
              <Download size={14} /> Export
            </button>
          </div>
        ))}
      </div>

      <div className="report-tip">
        <TrendingUp size={16} />
        <span>Consistent practice and review increases hiring probability by 30–50% over 4 weeks.</span>
      </div>
    </div>
  );
}
