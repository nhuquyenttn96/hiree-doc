import { FileText, Database } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="navbar glass">
      <div className="navbar-brand">
        <img src="/hello-kitty.png" alt="Hello Kitty" style={{ height: '36px', objectFit: 'contain' }} />
        <span>THEO DÕI <br className="mobile-break" /> GIAO NHẬN HỒ SƠ</span>
      </div>
      <div className="nav-links">
        <button 
          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Theo dõi Hồ sơ
        </button>
        <button 
          className={`nav-link ${activeTab === 'master' ? 'active' : ''}`}
          onClick={() => setActiveTab('master')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} />
            Dữ liệu gốc
          </span>
        </button>
      </div>
    </nav>
  );
}
