import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' 
import BaristaDashboard from './BaristaDashboard.jsx' 
import AdminDashboard from './AdminDashboard.jsx'
import Login from './Login.jsx' 
import RegisterCustomer from './RegisterCustomer.jsx' 
import CustomerLogin from './CustomerLogin.jsx' 
import './index.css'

function MainLayout() {
  const [currentView, setCurrentView] = useState('customer'); 
  const [loggedInUser, setLoggedInUser] = useState(null); 
  const [loggedInCustomer, setLoggedInCustomer] = useState(null); 

  const handleLoginSuccess = (user) => setLoggedInUser(user);
  const handleLogout = () => setLoggedInUser(null);

  const handleCustomerLoginSuccess = (customer) => {
    setLoggedInCustomer(customer);
    setCurrentView('customer'); 
  };
  const handleCustomerLogout = () => {
    setLoggedInCustomer(null);
    setCurrentView('customer_login');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', padding: '15px', backgroundColor: '#4A3B32', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexWrap: 'wrap' }}>
        <button onClick={() => setCurrentView('customer')} style={navBtnStyle(currentView === 'customer')}>🏪 หน้าร้าน (สั่งกาแฟ)</button>

        {!loggedInCustomer ? (
          <>
            <button onClick={() => setCurrentView('register')} style={navBtnStyle(currentView === 'register')}>📝 สมัครสมาชิก</button>
            <button onClick={() => setCurrentView('customer_login')} style={navBtnStyle(currentView === 'customer_login')}>👤 เข้าสู่ระบบลูกค้า</button>
          </>
        ) : (
          <button onClick={() => setCurrentView('customer_profile')} style={navBtnStyle(currentView === 'customer_profile', true)}>
            👑 คุณ {loggedInCustomer.first_name} (แต้ม: {loggedInCustomer.total_points})
          </button>
        )}
        
        <button onClick={() => setCurrentView('staff')} style={navBtnStyle(currentView === 'staff')}>🔑 ระบบหลังร้าน (Staff)</button>
      </div>

      <div style={{ padding: '20px' }}>
        {currentView === 'customer' && (
          <App 
            loggedInCustomer={loggedInCustomer} 
            onUpdatePoints={(points) => {
              setLoggedInCustomer(prev => ({ 
                ...prev,
                total_points: Number(prev.total_points || 0) + points
              }));
            }} 
          />
        )}
        
        {currentView === 'register' && <RegisterCustomer />}
        {currentView === 'customer_login' && <CustomerLogin onLoginSuccess={handleCustomerLoginSuccess} />}
        
        {currentView === 'customer_profile' && loggedInCustomer && (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FFFaf0', borderRadius: '15px', maxWidth: '500px', margin: '0 auto', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#4A3B32' }}>โปรไฟล์สมาชิกของคุณ</h2>
            <p style={{ fontSize: '18px' }}>ชื่อ-นามสกุล: <strong>{loggedInCustomer.first_name} {loggedInCustomer.last_name}</strong></p>
            <p style={{ fontSize: '18px' }}>ระดับสมาชิก: <strong>{loggedInCustomer.member_level}</strong></p>
            <div style={{ margin: '20px 0', padding: '20px', backgroundColor: '#E8D5C4', borderRadius: '10px' }}>
              <h1 style={{ margin: '0', color: '#8B5A2B', fontSize: '48px' }}>{loggedInCustomer.total_points}</h1>
              <p style={{ margin: '0', fontWeight: 'bold', color: '#4A3B32' }}>แต้มสะสมคงเหลือ</p>
            </div>
            <button onClick={handleCustomerLogout} style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>ออกจากระบบ</button>
          </div>
        )}

        {currentView === 'staff' && (
          <div>
            {!loggedInUser ? (
              <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
              <div>
                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                  <span style={{ marginRight: '15px', fontWeight: 'bold' }}>👤 เข้าสู่ระบบโดย: {loggedInUser.name} ({loggedInUser.role})</span>
                  <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>ออกจากระบบ</button>
                </div>
                {loggedInUser.role === 'barista' && <BaristaDashboard />}
                {loggedInUser.role === 'admin' && <AdminDashboard user={loggedInUser} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle = (isActive, isProfile = false) => ({
  padding: '10px 20px', 
  fontSize: '16px', 
  cursor: 'pointer', 
  borderRadius: '8px', 
  border: 'none', 
  fontWeight: 'bold',
  backgroundColor: isActive ? '#E67E22' : (isProfile ? '#F1C40F' : '#FFF'), 
  color: isActive ? '#FFF' : '#333',
  transition: '0.3s'
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainLayout />
  </React.StrictMode>,
)