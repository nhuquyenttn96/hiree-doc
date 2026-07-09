import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import MasterData from './pages/MasterData'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="app-container">
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'master' && <MasterData />}
      </main>
    </div>
  )
}

export default App
