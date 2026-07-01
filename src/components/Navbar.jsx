import { FileText, Database } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <FileText color="var(--primary)" />
        THEO DÕI GIAO NHẬN <span style={{ whiteSpace: 'nowrap' }}>HỒ SƠ</span>
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
