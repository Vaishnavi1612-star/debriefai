import React from 'react';
import './Navbar.css';

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#4f8ef7" />
    <path d="M8 22 L14 10 L20 18 L23 14 L26 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="8" cy="22" r="2" fill="white" />
  </svg>
);

const NavItem = ({ label, active, onClick }) => (
  <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    {label}
    {active && <span className="nav-indicator" />}
  </button>
);

export default function Navbar({ activePage, setActivePage }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <Logo />
          <span className="brand-name">DebriefAI</span>
        </div>

        <div className="navbar-links">
          {['dashboard', 'analysis', 'reports', 'settings'].map((page) => (
            <NavItem
              key={page}
              label={page.charAt(0).toUpperCase() + page.slice(1)}
              active={activePage === page}
              onClick={() => setActivePage(page)}
            />
          ))}
        </div>

        <div className="navbar-user">
          <span className="user-name">John Doe</span>
          <div className="user-avatar">JD</div>
        </div>
      </div>
    </nav>
  );
}
