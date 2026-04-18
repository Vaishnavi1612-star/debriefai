import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AnalysisPage from './components/AnalysisPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setActivePage('analysis');
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            onAnalysisComplete={handleAnalysisComplete}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
            analysisData={analysisData}
          />
        );
      case 'analysis':
        return <AnalysisPage data={analysisData} />;
      case 'reports':
        return <ReportsPage analysisData={analysisData} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onAnalysisComplete={handleAnalysisComplete} />;
    }
  };

  return (
    <div className="app">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
